#!/usr/bin/env node
/**
 * freshcrate Package Verifier
 *
 * Runs 10 verification checks against each package's GitHub repo:
 *   repo_exists, not_archived, recent_activity, description_matches,
 *   license_matches, has_release, has_readme, minimum_stars, not_fork, has_license
 *
 * Score = (passed / total) * 100.  Verified when score >= 70.
 *
 * Usage:
 *   node scripts/verify.mjs                # verify all packages
 *   node scripts/verify.mjs --dry-run      # show results, don't write to DB
 *   GITHUB_TOKEN=*** node scripts/verify.mjs
 *
 * Designed to run as a cron job or on-demand.
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

/**
 * Fetch from GitHub API with rate-limit retry.
 * Returns { status, data } so callers can inspect status codes.
 */
async function ghFetch(url) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "freshcrate-verify",
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  const res = await fetch(url, { headers });

  // Rate-limit back-off
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    const waitSec = reset
      ? Math.max(0, Number(reset) - Math.floor(Date.now() / 1000))
      : 60;
    console.log(`  ⏳ Rate limited, waiting ${waitSec}s...`);
    await sleep(waitSec * 1000 + 1000);
    return ghFetch(url);
  }

  if (!res.ok) return { status: res.status, data: null };
  return { status: res.status, data: await res.json() };
}

function parseGithubUrl(url) {
  const match = url.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

// ---------------------------------------------------------------------------
// Verification checks
// ---------------------------------------------------------------------------

function wordSet(text) {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function wordOverlap(a, b) {
  const setA = wordSet(a);
  const setB = wordSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let overlap = 0;
  for (const w of setA) if (setB.has(w)) overlap++;
  return overlap / Math.max(setA.size, setB.size);
}

function normaliseLicense(lic) {
  if (!lic) return "";
  return lic
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/license$/, "")
    .replace(/licence$/, "");
}

async function runChecks(project, parsed) {
  const { owner, repo } = parsed;
  const checks = {};

  // 1. repo_exists
  const repoRes = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}`
  );
  checks.repo_exists = repoRes.data !== null;

  if (!repoRes.data) {
    // Can't run other checks without repo data
    const names = [
      "not_archived",
      "recent_activity",
      "description_matches",
      "license_matches",
      "has_release",
      "has_readme",
      "minimum_stars",
      "not_fork",
      "has_license",
    ];
    for (const n of names) checks[n] = false;
    return checks;
  }

  const rd = repoRes.data;

  // 2. not_archived
  checks.not_archived = rd.archived === false;

  // 3. recent_activity  — pushed_at within 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  checks.recent_activity = rd.pushed_at
    ? new Date(rd.pushed_at) >= twelveMonthsAgo
    : false;

  // 4. description_matches — 20%+ word overlap
  const submittedDesc = [project.short_desc, project.description]
    .filter(Boolean)
    .join(" ");
  const ghDesc = rd.description || "";
  checks.description_matches = wordOverlap(submittedDesc, ghDesc) >= 0.2;

  // 5. license_matches
  const ghLicense = rd.license?.spdx_id || rd.license?.key || "";
  checks.license_matches =
    normaliseLicense(ghLicense) === normaliseLicense(project.license) ||
    // Treat NOASSERTION as match if project has a license value
    (ghLicense === "NOASSERTION" && !!project.license);

  // 6. has_release — check releases, then tags
  const relRes = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/releases?per_page=1`
  );
  if (relRes.data && relRes.data.length > 0) {
    checks.has_release = true;
  } else {
    const tagRes = await ghFetch(
      `https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`
    );
    checks.has_release = !!(tagRes.data && tagRes.data.length > 0);
  }

  // 7. has_readme
  const readmeRes = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/readme`
  );
  checks.has_readme = readmeRes.status === 200 && readmeRes.data !== null;

  // 8. minimum_stars  >= 5
  checks.minimum_stars = (rd.stargazers_count || 0) >= 5;

  // 9. not_fork
  checks.not_fork = rd.fork === false;

  // 10. has_license
  checks.has_license = rd.license !== null && rd.license !== undefined;

  return checks;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(
    `\n✅ freshcrate Package Verifier${DRY_RUN ? " (DRY RUN)" : ""}\n`
  );

  if (!GITHUB_TOKEN) {
    console.log(
      "  ⚠ No GITHUB_TOKEN — running with unauthenticated rate limits (60/hr)"
    );
    console.log("  Set GITHUB_TOKEN or run populate.mjs --login first.\n");
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Ensure verification columns exist (migration 007)
  try {
    db.exec(`
      ALTER TABLE projects ADD COLUMN verified INTEGER NOT NULL DEFAULT 0;
    `);
  } catch {
    /* already exists */
  }
  try {
    db.exec(`
      ALTER TABLE projects ADD COLUMN verification_json TEXT NOT NULL DEFAULT '{}';
    `);
  } catch {
    /* already exists */
  }
  try {
    db.exec(`
      ALTER TABLE projects ADD COLUMN verified_at TEXT;
    `);
  } catch {
    /* already exists */
  }
  try {
    db.exec(`
      ALTER TABLE projects ADD COLUMN submitted_by_key TEXT NOT NULL DEFAULT '';
    `);
  } catch {
    /* already exists */
  }

  // Get all packages with GitHub repo URLs
  const projects = db
    .prepare(
      `SELECT id, name, short_desc, description, repo_url, license
       FROM projects
       WHERE repo_url LIKE '%github.com%'
       ORDER BY name`
    )
    .all();

  console.log(`  Found ${projects.length} packages with GitHub repos.\n`);

  const updateStmt = db.prepare(
    `UPDATE projects
     SET verified = ?, verification_json = ?, verified_at = datetime('now')
     WHERE id = ?`
  );

  const RATE_DELAY = GITHUB_TOKEN ? 100 : 1000;
  const results = [];

  for (const project of projects) {
    const parsed = parseGithubUrl(project.repo_url);
    if (!parsed) {
      console.log(
        `  ⚠ ${project.name}: Could not parse GitHub URL: ${project.repo_url}`
      );
      results.push({
        name: project.name,
        score: 0,
        verified: false,
        checks: {},
        error: "bad_url",
      });
      continue;
    }

    console.log(`  🔎 ${project.name} (${parsed.owner}/${parsed.repo})...`);

    const checks = await runChecks(project, parsed);
    const total = Object.keys(checks).length;
    const passed = Object.values(checks).filter(Boolean).length;
    const score = Math.round((passed / total) * 100);
    const verified = score >= 70 ? 1 : 0;

    const verJson = JSON.stringify({
      checks,
      score,
      passed,
      total,
      checked_at: new Date().toISOString(),
    });

    if (!DRY_RUN) {
      updateStmt.run(verified, verJson, project.id);
    }

    const icon = verified ? "✅" : "❌";
    console.log(`    ${icon} score=${score}% (${passed}/${total})`);

    results.push({
      name: project.name,
      score,
      verified: !!verified,
      checks,
    });

    await sleep(RATE_DELAY);
  }

  // ---------------------------------------------------------------------------
  // Summary table
  // ---------------------------------------------------------------------------
  console.log(`\n${"─".repeat(100)}`);
  console.log(
    `  ${"Name".padEnd(30)} ${"Score".padEnd(7)} ${"Status".padEnd(8)} Checks`
  );
  console.log(`${"─".repeat(100)}`);

  for (const r of results) {
    if (r.error) {
      console.log(`  ${r.name.padEnd(30)} ${"—".padEnd(7)} ${"ERROR".padEnd(8)} ${r.error}`);
      continue;
    }
    const status = r.verified ? "PASS" : "FAIL";
    const checkStr = Object.entries(r.checks)
      .map(([k, v]) => `${v ? "✓" : "✗"}${k}`)
      .join(" ");
    console.log(
      `  ${r.name.slice(0, 29).padEnd(30)} ${(r.score + "%").padEnd(7)} ${status.padEnd(8)} ${checkStr}`
    );
  }

  console.log(`${"─".repeat(100)}`);

  const passCount = results.filter((r) => r.verified).length;
  const failCount = results.filter((r) => !r.verified && !r.error).length;
  const errCount = results.filter((r) => r.error).length;

  console.log(`\n📊 Summary:`);
  console.log(`   Total:    ${results.length}`);
  console.log(`   Passed:   ${passCount}`);
  console.log(`   Failed:   ${failCount}`);
  console.log(`   Errors:   ${errCount}`);
  if (DRY_RUN) console.log(`   (Dry run — no changes written)`);
  console.log("");

  db.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
