#!/usr/bin/env node
/**
 * freshcrate Package Monitor
 *
 * Checks all packages with GitHub repo URLs for new releases/tags.
 * When a new version is found, creates a release entry in the database.
 * Also updates star counts and detects abandoned packages.
 *
 * Usage:
 *   node scripts/monitor.mjs                # check all packages
 *   node scripts/monitor.mjs --dry-run      # show what would change, don't write
 *   GITHUB_TOKEN=*** node scripts/monitor.mjs
 *
 * Designed to run as a cron job (e.g., daily).
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
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || loadCachedToken() || "";

function loadCachedToken() {
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    if (data.access_token && data.expires_at > Date.now()) {
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ghFetch(url) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "freshcrate-monitor",
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  const res = await fetch(url, { headers });

  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    const waitSec = reset ? Math.max(0, Number(reset) - Math.floor(Date.now() / 1000)) : 60;
    console.log(`  ⏳ Rate limited, waiting ${waitSec}s...`);
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
  console.log(`\n🔍 freshcrate Package Monitor${DRY_RUN ? " (DRY RUN)" : ""}\n`);

  if (!GITHUB_TOKEN) {
    console.log("  ⚠ No GITHUB_TOKEN — running with unauthenticated rate limits (60/hr)");
    console.log("  Set GITHUB_TOKEN or run populate.mjs --login first.\n");
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Get all packages with GitHub repo URLs
  const projects = db
    .prepare(
      `SELECT p.id, p.name, p.repo_url, r.version as latest_version, r.created_at as latest_release_date
       FROM projects p
       LEFT JOIN releases r ON r.project_id = p.id
         AND r.id = (SELECT MAX(r2.id) FROM releases r2 WHERE r2.project_id = p.id)
       WHERE p.repo_url LIKE '%github.com%'
       ORDER BY p.name`
    )
    .all();

  console.log(`  Found ${projects.length} packages with GitHub repos.\n`);

  const insertRelease = db.prepare(
    "INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  const updateProject = db.prepare(
    "UPDATE projects SET updated_at = datetime('now') WHERE id = ?"
  );

  let newReleases = 0;
  let checked = 0;
  let errors = 0;
  let abandoned = 0;

  for (const project of projects) {
    const parsed = parseGithubUrl(project.repo_url);
    if (!parsed) {
      console.log(`  ⚠ ${project.name}: Could not parse GitHub URL: ${project.repo_url}`);
      errors++;
      continue;
    }

    const { owner, repo } = parsed;
    checked++;

    // Fetch latest release
    const release = await ghFetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`
    );

    let newVersion = null;
    let changes = "";
    let releaseDate = null;

    if (release && release.tag_name) {
      if (release.tag_name !== project.latest_version) {
        newVersion = release.tag_name;
        changes = (release.body || "").slice(0, 500).replace(/\r?\n/g, " ");
        releaseDate = release.published_at;
      }
    } else {
      // Fall back to tags
      const tags = await ghFetch(
        `https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`
      );
      if (tags?.[0] && tags[0].name !== project.latest_version) {
        newVersion = tags[0].name;
        changes = `New tag: ${tags[0].name}`;
      }
    }

    if (newVersion) {
      const urgency = urgencyFromAge(releaseDate);
      const date = releaseDate || new Date().toISOString();

      if (DRY_RUN) {
        console.log(`  📦 ${project.name}: ${project.latest_version} → ${newVersion} [DRY RUN]`);
      } else {
        insertRelease.run(project.id, newVersion, changes || `Release ${newVersion}`, urgency, date);
        updateProject.run(project.id);
        console.log(`  📦 ${project.name}: ${project.latest_version} → ${newVersion} (${urgency})`);
      }
      newReleases++;
    } else {
      // Check if abandoned (no push in 6 months)
      const repoData = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (repoData) {
        const lastPush = new Date(repoData.pushed_at);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        if (lastPush < sixMonthsAgo) {
          abandoned++;
          console.log(`  💤 ${project.name}: No activity since ${repoData.pushed_at.slice(0, 10)}`);
        }

        if (repoData.archived) {
          console.log(`  📁 ${project.name}: Repository is ARCHIVED`);
        }
      }
    }

    // Rate-limit politeness
    await sleep(GITHUB_TOKEN ? 100 : 1000);
  }

  // Rebuild FTS index if we added releases
  if (newReleases > 0 && !DRY_RUN) {
    try {
      db.exec("INSERT INTO projects_fts(projects_fts) VALUES('rebuild')");
    } catch {
      // FTS may not exist
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Checked:      ${checked} packages`);
  console.log(`   New releases: ${newReleases}`);
  console.log(`   Abandoned:    ${abandoned}`);
  console.log(`   Errors:       ${errors}`);
  if (DRY_RUN) console.log(`   (Dry run — no changes written)`);
  console.log("");

  db.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
