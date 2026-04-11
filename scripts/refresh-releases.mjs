#!/usr/bin/env node

/**
 * freshcrate Release Refresh
 *
 * For every project with a GitHub repo URL, fetches the latest release from
 * GitHub and inserts a new row into the `releases` table if its tag_name
 * differs from the most recent stored release. This is what keeps the
 * homepage's "Latest Releases" feed current — neither enrich.mjs nor
 * populate.mjs (without --clear) update release data on existing projects.
 *
 * Usage:
 *   node scripts/refresh-releases.mjs              # poll all projects
 *   node scripts/refresh-releases.mjs --dry-run    # show changes, don't write
 *   GITHUB_TOKEN=*** node scripts/refresh-releases.mjs
 *
 * Designed to run as a cron job (e.g., hourly or daily).
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

function loadCachedToken() {
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    if (data.access_token && data.expires_at > Date.now()) return data.access_token;
    return null;
  } catch { return null; }
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || loadCachedToken() || "";
const SLEEP_MS = GITHUB_TOKEN ? 100 : 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseGithubUrl(url) {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

function urgencyFromAge(dateStr) {
  if (!dateStr) return "Low";
  const days = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (days < 7) return "High";
  if (days < 30) return "Medium";
  return "Low";
}

async function ghFetch(endpoint) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "freshcrate-refresh-releases",
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com${endpoint}`, { headers });

  const remaining = res.headers.get("x-ratelimit-remaining");
  if (remaining !== null && parseInt(remaining, 10) <= 1) {
    const resetAt = parseInt(res.headers.get("x-ratelimit-reset") || "0", 10) * 1000;
    const waitMs = Math.max(resetAt - Date.now(), 1000);
    console.log(`  ⏳ Rate limit nearly exhausted, waiting ${Math.ceil(waitMs / 1000)}s...`);
    await sleep(waitMs);
  }

  if (res.status === 404) return null;
  if (!res.ok) {
    console.log(`    ⚠ ${endpoint} → ${res.status}`);
    return null;
  }
  return res.json();
}

async function main() {
  console.log(`🔄 freshcrate release refresh ${DRY_RUN ? "(DRY RUN)" : ""}`);
  console.log(`   Token: ${GITHUB_TOKEN ? "✓ present" : "✗ none (slower rate limit)"}`);
  console.log(`   Sleep: ${SLEEP_MS}ms between requests\n`);

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const projects = db.prepare(
    "SELECT id, name, repo_url FROM projects WHERE repo_url LIKE '%github.com%'"
  ).all();

  console.log(`Found ${projects.length} projects with GitHub URLs\n`);

  const latestReleaseStmt = db.prepare(
    "SELECT version, created_at FROM releases WHERE project_id = ? ORDER BY created_at DESC LIMIT 1"
  );
  const insertReleaseStmt = db.prepare(
    "INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, ?, ?, ?, ?)"
  );

  let checked = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const project of projects) {
    const gh = parseGithubUrl(project.repo_url);
    if (!gh) { skipped++; continue; }

    checked++;
    const slug = `${gh.owner}/${gh.repo}`;
    process.stdout.write(`  📦 ${project.name} (${slug}) ... `);

    try {
      const release = await ghFetch(`/repos/${slug}/releases/latest`);
      await sleep(SLEEP_MS);

      if (!release || !release.tag_name) {
        console.log("no release");
        skipped++;
        continue;
      }

      const stored = latestReleaseStmt.get(project.id);
      if (stored && stored.version === release.tag_name) {
        console.log(`unchanged (${release.tag_name})`);
        unchanged++;
        continue;
      }

      const version = release.tag_name;
      const changes = (release.body || "")
        .slice(0, 500)
        .replace(/\r\n/g, " ")
        .replace(/\n/g, " ");
      const releaseDate = release.published_at || new Date().toISOString();

      console.log(`NEW: ${stored?.version || "(none)"} → ${version}`);

      if (!DRY_RUN) {
        insertReleaseStmt.run(
          project.id,
          version,
          changes || `Latest release: ${version}`,
          urgencyFromAge(releaseDate),
          releaseDate
        );
      }
      updated++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      skipped++;
    }
  }

  db.close();
  console.log(`\n✅ Done: ${checked} checked, ${updated} new releases, ${unchanged} unchanged, ${skipped} skipped${DRY_RUN ? " (dry run — no DB writes)" : ""}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
