#!/usr/bin/env node
/**
 * freshcrate GitHub Enrichment Script
 *
 * Fetches stars, forks, language, and README HTML from GitHub for all
 * projects with GitHub repo URLs, then updates the database.
 *
 * Usage:
 *   node scripts/enrich.mjs                # enrich all packages
 *   node scripts/enrich.mjs --dry-run      # show what would change, don't write
 *   GITHUB_TOKEN=*** node scripts/enrich.mjs
 *
 * Designed to run as a cron job (e.g., weekly).
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

const SLEEP_MS = GITHUB_TOKEN ? 100 : 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseGithubUrl(url) {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

async function fetchGithubApi(endpoint, accept = "application/vnd.github+json") {
  const headers = { Accept: accept, "User-Agent": "freshcrate-enricher" };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com${endpoint}`, { headers });

  // Rate limit check
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (remaining !== null && parseInt(remaining, 10) <= 1) {
    const resetAt = parseInt(res.headers.get("x-ratelimit-reset") || "0", 10) * 1000;
    const waitMs = Math.max(resetAt - Date.now(), 1000);
    console.log(`  ⏳ Rate limit nearly exhausted, waiting ${Math.ceil(waitMs / 1000)}s...`);
    await sleep(waitMs);
  }

  return res;
}

async function enrichProject(project) {
  const gh = parseGithubUrl(project.repo_url);
  if (!gh) return null;

  const slug = `${gh.owner}/${gh.repo}`;
  console.log(`  📦 ${project.name} (${slug})`);

  // Fetch repo metadata
  const repoRes = await fetchGithubApi(`/repos/${slug}`);
  if (!repoRes.ok) {
    console.log(`    ⚠ Repo API ${repoRes.status} — skipping`);
    return null;
  }
  const repoData = await repoRes.json();

  await sleep(SLEEP_MS);

  // Fetch README as HTML
  let readmeHtml = "";
  const readmeRes = await fetchGithubApi(`/repos/${slug}/readme`, "application/vnd.github.html+json");
  if (readmeRes.ok) {
    readmeHtml = await readmeRes.text();
  } else {
    console.log(`    ⚠ README ${readmeRes.status} — skipping readme`);
  }

  await sleep(SLEEP_MS);

  return {
    stars: repoData.stargazers_count || 0,
    forks: repoData.forks_count || 0,
    language: repoData.language || "",
    readme_html: readmeHtml,
  };
}

async function main() {
  console.log(`🔧 freshcrate enrichment ${DRY_RUN ? "(DRY RUN)" : ""}`);
  console.log(`   Token: ${GITHUB_TOKEN ? "✓ present" : "✗ none (slower rate limit)"}`);
  console.log(`   Sleep: ${SLEEP_MS}ms between requests\n`);

  const db = new Database(DB_PATH);
  const projects = db.prepare(
    "SELECT id, name, repo_url FROM projects WHERE repo_url LIKE '%github.com%'"
  ).all();

  console.log(`Found ${projects.length} projects with GitHub URLs\n`);

  let updated = 0;
  let skipped = 0;

  const updateStmt = db.prepare(`
    UPDATE projects
    SET stars = ?, forks = ?, language = ?, readme_html = ?,
        last_github_sync = ?, readme_fetched_at = ?
    WHERE id = ?
  `);

  for (const project of projects) {
    try {
      const data = await enrichProject(project);
      if (!data) {
        skipped++;
        continue;
      }

      console.log(`    ⭐ ${data.stars}  🍴 ${data.forks}  🔤 ${data.language}  📄 ${data.readme_html ? `${data.readme_html.length} chars` : "none"}`);

      if (!DRY_RUN) {
        const now = new Date().toISOString();
        updateStmt.run(data.stars, data.forks, data.language, data.readme_html, now, now, project.id);
      }

      updated++;
    } catch (err) {
      console.log(`    ❌ Error: ${err.message}`);
      skipped++;
    }
  }

  db.close();
  console.log(`\n✅ Done: ${updated} enriched, ${skipped} skipped${DRY_RUN ? " (dry run — no DB writes)" : ""}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
