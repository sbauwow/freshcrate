#!/usr/bin/env node

/**
 * freshcrate Historical Backfill
 *
 * Enriches existing packages with data we missed during initial ingest:
 *   1. Full release history (up to 50 releases per project)
 *   2. Real repo creation date → projects.created_at
 *   3. Refresh stars/forks/language
 *   4. First commit date approximation
 *
 * Usage:
 *   GITHUB_TOKEN=<token> node scripts/backfill.mjs
 *   GITHUB_TOKEN=<token> node scripts/backfill.mjs --dry-run
 *   GITHUB_TOKEN=<token> node scripts/backfill.mjs --limit 50
 *   GITHUB_TOKEN=<token> node scripts/backfill.mjs --releases-only
 *   GITHUB_TOKEN=<token> node scripts/backfill.mjs --project milvus
 *
 * Designed for cron or one-shot backfill.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const DB_PATH = path.join(PROJECT_ROOT, "freshcrate.db");
const TOKEN_PATH = path.join(PROJECT_ROOT, ".freshcrate-token");

const DRY_RUN = process.argv.includes("--dry-run");
const RELEASES_ONLY = process.argv.includes("--releases-only");
const LIMIT = parseInt(getArg("--limit") || "0") || 0;
const SINGLE_PROJECT = getArg("--project");

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

function loadToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    if (data.access_token && data.expires_at > Date.now()) return data.access_token;
  } catch {}
  return "";
}

const GITHUB_TOKEN = loadToken();
const authHeaders = {
  Accept: "application/vnd.github+json",
  "User-Agent": "freshcrate-backfill",
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

let apiCalls = 0;

async function ghFetch(url) {
  apiCalls++;
  const res = await fetch(url, { headers: authHeaders });

  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");
    const waitSec = reset ? Math.max(0, Number(reset) - Math.floor(Date.now() / 1000)) : 60;
    console.log(`  ⏳ Rate limited (${remaining} remaining), waiting ${waitSec}s...`);
    await sleep(waitSec * 1000 + 1000);
    return ghFetch(url);
  }

  if (!res.ok) return null;
  return res.json();
}

function parseGithubUrl(url) {
  const match = url.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

function urgencyFromAge(dateStr) {
  if (!dateStr) return "Low";
  const days = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (days < 7) return "High";
  if (days < 30) return "Medium";
  return "Low";
}

async function main() {
  console.log(`\n📜 freshcrate Historical Backfill${DRY_RUN ? " (DRY RUN)" : ""}\n`);

  if (!GITHUB_TOKEN) {
    console.log("  ⚠ No GITHUB_TOKEN — will hit rate limits fast.\n");
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Get projects to backfill
  let query = `
    SELECT p.id, p.name, p.repo_url, p.created_at,
           (SELECT COUNT(*) FROM releases r WHERE r.project_id = p.id) as release_count
    FROM projects p
    WHERE p.repo_url LIKE '%github.com%'
  `;
  const params = [];

  if (SINGLE_PROJECT) {
    query += " AND p.name = ?";
    params.push(SINGLE_PROJECT);
  }

  query += " ORDER BY release_count ASC, p.stars DESC";

  if (LIMIT > 0) {
    query += " LIMIT ?";
    params.push(LIMIT);
  }

  const projects = db.prepare(query).all(...params);

  console.log(`  Found ${projects.length} projects to backfill.\n`);

  // Prepared statements
  const insertRelease = db.prepare(
    `INSERT OR IGNORE INTO releases (project_id, version, changes, urgency, created_at) 
     VALUES (?, ?, ?, ?, ?)`
  );
  const updateProject = db.prepare(
    `UPDATE projects SET stars = ?, forks = ?, language = ?,
     created_at = ?, updated_at = ?, last_github_sync = datetime('now')
     WHERE id = ?`
  );
  // Check if a release version already exists for a project
  const checkRelease = db.prepare(
    "SELECT id FROM releases WHERE project_id = ? AND version = ?"
  );

  let totalReleasesAdded = 0;
  let totalProjectsUpdated = 0;
  let totalSkipped = 0;
  let errors = 0;

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const parsed = parseGithubUrl(project.repo_url);
    if (!parsed) {
      console.log(`  ⚠ ${project.name}: Can't parse GitHub URL`);
      errors++;
      continue;
    }

    const { owner, repo } = parsed;
    const progress = `[${i + 1}/${projects.length}]`;
    let releasesAdded = 0;

    // ── Fetch repo metadata (stars, forks, created_at) ──
    if (!RELEASES_ONLY) {
      const repoData = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (repoData) {
        if (!DRY_RUN) {
          updateProject.run(
            repoData.stargazers_count || 0,
            repoData.forks_count || 0,
            repoData.language || "",
            repoData.created_at,      // real GitHub creation date
            repoData.pushed_at,        // last push as updated_at
            project.id
          );
        }
        totalProjectsUpdated++;
      } else {
        console.log(`  ${progress} ⚠ ${project.name}: repo not found, skipping`);
        errors++;
        continue;
      }
      await sleep(GITHUB_TOKEN ? 50 : 500);
    }

    // ── Fetch full release history ──
    // Page through releases (up to 50, 2 pages of 25)
    for (let page = 1; page <= 2; page++) {
      const releases = await ghFetch(
        `https://api.github.com/repos/${owner}/${repo}/releases?per_page=25&page=${page}`
      );

      if (!releases || releases.length === 0) break;

      for (const rel of releases) {
        if (!rel.tag_name) continue;

        // Skip if we already have this version
        const existing = checkRelease.get(project.id, rel.tag_name);
        if (existing) continue;

        const changes = (rel.body || "").slice(0, 500).replace(/\r?\n/g, " ");
        const date = rel.published_at || rel.created_at;

        if (DRY_RUN) {
          releasesAdded++;
        } else {
          try {
            insertRelease.run(
              project.id,
              rel.tag_name,
              changes || `Release ${rel.tag_name}`,
              urgencyFromAge(date),
              date
            );
            releasesAdded++;
          } catch (err) {
            // Duplicate, skip
          }
        }
      }

      if (releases.length < 25) break; // last page
      await sleep(GITHUB_TOKEN ? 50 : 500);
    }

    // ── Also fetch tags if few releases ──
    if (releasesAdded === 0 && project.release_count <= 1) {
      const tags = await ghFetch(
        `https://api.github.com/repos/${owner}/${repo}/tags?per_page=20`
      );
      if (tags && tags.length > 1) {
        for (const tag of tags) {
          const existing = checkRelease.get(project.id, tag.name);
          if (existing) continue;

          // Fetch the tag's commit date from the Git API
          let tagDate = null;
          if (tag.commit?.sha) {
            const commitData = await ghFetch(
              `https://api.github.com/repos/${owner}/${repo}/git/commits/${tag.commit.sha}`
            );
            tagDate = commitData?.committer?.date || commitData?.author?.date || null;
            await sleep(GITHUB_TOKEN ? 50 : 500);
          }

          if (DRY_RUN) {
            releasesAdded++;
          } else {
            try {
              insertRelease.run(
                project.id,
                tag.name,
                `Tag ${tag.name}`,
                urgencyFromAge(tagDate),
                tagDate || new Date().toISOString()
              );
              releasesAdded++;
            } catch {}
          }
        }
      }
    }

    totalReleasesAdded += releasesAdded;

    if (releasesAdded > 0) {
      console.log(`  ${progress} ${project.name}: +${releasesAdded} releases${DRY_RUN ? " [DRY]" : ""}`);
    } else {
      totalSkipped++;
    }

    // Rate limit politeness
    await sleep(GITHUB_TOKEN ? 100 : 1000);

    // Progress checkpoint every 50 projects
    if ((i + 1) % 50 === 0) {
      console.log(`\n  --- Checkpoint: ${i + 1}/${projects.length} processed, ${totalReleasesAdded} releases added, ${apiCalls} API calls ---\n`);
    }
  }

  // Rebuild FTS
  if (totalReleasesAdded > 0 && !DRY_RUN) {
    try {
      db.exec("INSERT INTO projects_fts(projects_fts) VALUES('rebuild')");
    } catch {}
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Projects processed:  ${projects.length}`);
  console.log(`   Projects updated:    ${totalProjectsUpdated}`);
  console.log(`   Releases added:      ${totalReleasesAdded}`);
  console.log(`   Skipped (no new):    ${totalSkipped}`);
  console.log(`   Errors:              ${errors}`);
  console.log(`   GitHub API calls:    ${apiCalls}`);
  if (DRY_RUN) console.log(`   (Dry run — no changes written)`);

  // Show new stats
  if (!DRY_RUN && totalReleasesAdded > 0) {
    const r = db.prepare("SELECT COUNT(*) as c FROM releases").get();
    const avg = db.prepare("SELECT AVG(c) as a FROM (SELECT COUNT(*) as c FROM releases GROUP BY project_id)").get();
    console.log(`\n   Total releases now: ${r.c}`);
    console.log(`   Avg releases/project: ${avg.a?.toFixed(1)}`);
  }

  console.log("");
  db.close();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
