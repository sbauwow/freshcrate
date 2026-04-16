#!/usr/bin/env node

/**
 * freshcrate Populate Pipeline
 *
 * Searches GitHub for real AI agent/tool packages, fetches full metadata
 * (stars, forks, language, releases, topics, README), categorizes, and
 * inserts into the freshcrate SQLite DB with all enrichment columns populated.
 *
 * Usage:
 *   node scripts/populate.mjs                # run (auto-authenticates if needed)
 *   node scripts/populate.mjs --clear        # wipe projects and repopulate
 *   node scripts/populate.mjs --login        # force re-authenticate
 *   GITHUB_TOKEN=<token> node scripts/populate.mjs
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ensureDbDir, getDbPath } from "./lib/db-path.mjs";
import { exec } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const DB_PATH = getDbPath();
const TOKEN_PATH = path.join(PROJECT_ROOT, ".freshcrate-token");

const CLEAR = process.argv.includes("--clear");
const FORCE_LOGIN = process.argv.includes("--login");

/** Strip HTML to plain text for FTS indexing. */
function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50000);
}

// ── Auth ──────────────────────────────────────────────────────────────

function loadCachedToken() {
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    if (data.access_token && data.expires_at > Date.now()) return data.access_token;
    return null;
  } catch { return null; }
}

function saveCachedToken(accessToken, expiresInSec) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify({
    access_token: accessToken,
    expires_at: Date.now() + (expiresInSec || 28800) * 1000,
    created_at: new Date().toISOString(),
  }, null, 2), { mode: 0o600 });
  console.log(`  💾 Token cached at ${TOKEN_PATH}`);
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const GITHUB_CLIENT_ID = process.env.FRESHCRATE_GITHUB_CLIENT_ID || "";

async function deviceFlowAuth() {
  if (!GITHUB_CLIENT_ID) {
    console.error("\n  ⚠ No GITHUB_CLIENT_ID and no GITHUB_TOKEN.");
    console.error("  Set GITHUB_TOKEN env var or FRESHCRATE_GITHUB_CLIENT_ID for OAuth.\n");
    process.exit(1);
  }

  console.log("\n🔑 GitHub OAuth Device Flow\n");
  const codeRes = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: "public_repo" }),
  });

  if (!codeRes.ok) throw new Error(`Failed to start device flow: ${codeRes.status}`);
  const { device_code, user_code, verification_uri, expires_in, interval } = await codeRes.json();

  console.log(`  Code: ${user_code}`);
  console.log(`  URL:  ${verification_uri}?user_code=${user_code}\n`);

  const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${openCmd} "${verification_uri}?user_code=${user_code}"`, () => {});

  const pollInterval = (interval || 5) * 1000;
  const deadline = Date.now() + expires_in * 1000;

  while (Date.now() < deadline) {
    await sleep(pollInterval);
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, device_code, grant_type: "urn:ietf:params:oauth:grant-type:device_code" }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.access_token) {
      console.log("  ✅ Authenticated!\n");
      saveCachedToken(tokenData.access_token, tokenData.expires_in);
      return tokenData.access_token;
    }
    if (tokenData.error === "authorization_pending") { process.stdout.write("."); continue; }
    if (tokenData.error === "slow_down") { await sleep(5000); continue; }
    throw new Error(`OAuth error: ${tokenData.error}`);
  }
  throw new Error("Device flow timed out.");
}

async function getToken() {
  if (process.env.GITHUB_TOKEN) { console.log("🔑 Using GITHUB_TOKEN"); return process.env.GITHUB_TOKEN; }
  if (!FORCE_LOGIN) { const c = loadCachedToken(); if (c) { console.log("🔑 Using cached token"); return c; } }
  return deviceFlowAuth();
}

// ── GitHub API ────────────────────────────────────────────────────────

let authHeaders = {};
function setAuth(token) {
  authHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": "freshcrate-populate",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function ghFetch(url, accept) {
  const headers = { ...authHeaders };
  if (accept) headers.Accept = accept;

  const res = await fetch(url, { headers });

  if (res.status === 401) {
    console.log("\n  ⚠ Token expired, re-authenticating...");
    try { fs.unlinkSync(TOKEN_PATH); } catch {}
    const newToken = await deviceFlowAuth();
    setAuth(newToken);
    return ghFetch(url, accept);
  }

  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    if (!authHeaders.Authorization) {
      console.log("\n  ⚠ Rate limited. Authenticating for higher limits.");
      const newToken = await deviceFlowAuth();
      setAuth(newToken);
      return ghFetch(url, accept);
    }
    const waitSec = reset ? Math.max(0, Number(reset) - Math.floor(Date.now() / 1000)) : 60;
    console.log(`  ⏳ Rate limited, waiting ${waitSec}s...`);
    await sleep(waitSec * 1000 + 1000);
    return ghFetch(url, accept);
  }

  if (!res.ok) return null;

  // For HTML accept, return text
  if (accept && accept.includes("html")) return { _html: await res.text() };
  return res.json();
}

// ── Categories (mirrors lib/categories.ts) ────────────────────────────

const CATEGORY_RULES = [
  { match: /\bmcp\b/i, category: "MCP Servers" },
  { match: /\b(sandbox|secure|permission|auth)\b/i, category: "Security" },
  { match: /\b(benchmark|eval|test|quality)\b/i, category: "Testing" },
  { match: /\b(vector|database|db|storage|embed)\b/i, category: "Databases" },
  { match: /\b(framework|orchestrat|chain|workflow|pipelin)\b/i, category: "Frameworks" },
  { match: /\b(gateway|proxy|infra|deploy|server)\b/i, category: "Infrastructure" },
  { match: /\b(agent|autonom|copilot|assistant)\b/i, category: "AI Agents" },
  { match: /\b(tool|cli|util|devtool|generat)\b/i, category: "Developer Tools" },
  { match: /\b(rag|retriev|search|context|memory)\b/i, category: "RAG & Memory" },
  { match: /\b(prompt|template)\b/i, category: "Prompt Engineering" },
];

function categorize(repo) {
  const text = `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`;
  for (const rule of CATEGORY_RULES) { if (rule.match.test(text)) return rule.category; }
  return "Uncategorized";
}

function urgencyFromAge(dateStr) {
  if (!dateStr) return "Low";
  const days = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (days < 7) return "High";
  if (days < 30) return "Medium";
  return "Low";
}

// ── Search Queries ────────────────────────────────────────────────────

const SEARCH_QUERIES = [
  "mcp server in:name,description language:TypeScript stars:>20",
  "mcp server in:name,description language:Python stars:>20",
  "model context protocol in:description stars:>50",
  "ai agent framework in:name,description stars:>100",
  "autonomous coding agent in:name,description stars:>50",
  "llm agent in:name,description stars:>200",
  "llm tool use in:name,description stars:>50",
  "ai code generation in:name,description stars:>100",
  "vector database in:name,description stars:>200",
  "prompt engineering framework in:name,description stars:>50",
  "rag framework in:name,description stars:>100",
  "agent memory in:name,description stars:>30",
  "code sandbox ai in:name,description stars:>30",
  "llm gateway in:name,description stars:>50",
];

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("🔧 freshcrate Populate Pipeline\n");

  const token = await getToken();
  setAuth(token);

  // Verify auth
  const user = await ghFetch("https://api.github.com/user");
  if (user?.login) {
    console.log(`  Authenticated as: ${user.login}`);
    const rateInfo = await ghFetch("https://api.github.com/rate_limit");
    if (rateInfo) {
      const { limit, remaining } = rateInfo.resources.search;
      console.log(`  Search API: ${remaining}/${limit} requests remaining\n`);
    }
  }

  // Open DB and run migrations
  ensureDbDir();
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Apply migrations
  const migrationsDir = path.join(PROJECT_ROOT, "migrations");
  if (fs.existsSync(migrationsDir)) {
    db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);

    const applied = new Set(db.prepare("SELECT name FROM _migrations").all().map(r => r.name));
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      db.transaction(() => {
        db.exec(sql);
        db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
      })();
      console.log(`  [migrate] Applied: ${file}`);
    }
  }

  if (CLEAR) {
    console.log("🗑  Clearing existing data...");
    db.exec("DELETE FROM tags; DELETE FROM releases; DELETE FROM projects;");
    try { db.exec("INSERT INTO projects_fts(projects_fts) VALUES('rebuild')"); } catch {}
  }

  // Prepared statements — include ALL columns
  const insertProject = db.prepare(
    `INSERT INTO projects (name, short_desc, description, homepage_url, repo_url, license, category, author, stars, forks, language)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertRelease = db.prepare(
    "INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  const insertTag = db.prepare(
    "INSERT OR IGNORE INTO tags (project_id, tag) VALUES (?, ?)"
  );
  const updateReadme = db.prepare(
    "UPDATE projects SET readme_html = ?, readme_text = ?, readme_fetched_at = datetime('now'), last_github_sync = datetime('now') WHERE id = ?"
  );

  const existingNames = new Set(db.prepare("SELECT name FROM projects").all().map(r => r.name));

  let added = 0;
  let skipped = 0;
  const seen = new Set(existingNames);

  for (const query of SEARCH_QUERIES) {
    console.log(`\n🔍 Searching: ${query}`);

    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&per_page=30`;
    const data = await ghFetch(url);
    const repos = data?.items || [];
    console.log(`   Found ${repos.length} repos`);

    for (const repo of repos) {
      const key = repo.full_name;
      if (seen.has(repo.name) || seen.has(key)) { skipped++; continue; }
      seen.add(repo.name);
      seen.add(key);

      const [owner, repoName] = repo.full_name.split("/");

      // Fetch release info
      let version = null;
      let changes = "";
      let releaseDate = repo.pushed_at;

      const release = await ghFetch(`https://api.github.com/repos/${owner}/${repoName}/releases/latest`);
      if (release && release.tag_name) {
        version = release.tag_name;
        changes = (release.body || "").slice(0, 500).replace(/\r\n/g, " ").replace(/\n/g, " ");
        releaseDate = release.published_at || releaseDate;
      } else {
        const tags = await ghFetch(`https://api.github.com/repos/${owner}/${repoName}/tags?per_page=1`);
        if (tags?.[0]) version = tags[0].name;
      }

      if (!version) { version = "0.0.0"; changes = "No release found — using repo HEAD"; }

      const category = categorize(repo);
      const license = repo.license?.spdx_id || "Unknown";
      const shortDesc = (repo.description || "No description").slice(0, 200);
      const topics = repo.topics || [];

      // Insert with enrichment data
      const result = insertProject.run(
        repo.name,
        shortDesc,
        repo.description || "",
        repo.homepage || repo.html_url,
        repo.html_url,
        license,
        category,
        owner,
        repo.stargazers_count || 0,
        repo.forks_count || 0,
        repo.language || ""
      );
      const projectId = result.lastInsertRowid;

      insertRelease.run(projectId, version, changes || `Latest release: ${version}`, urgencyFromAge(releaseDate), releaseDate || new Date().toISOString());

      // Tags
      for (const topic of topics.slice(0, 8)) { insertTag.run(projectId, topic.toLowerCase()); }
      if (repo.language) insertTag.run(projectId, repo.language.toLowerCase());

      // Fetch README (HTML rendered) — strip dangerous tags at ingestion
      const readmeRes = await ghFetch(
        `https://api.github.com/repos/${owner}/${repoName}/readme`,
        "application/vnd.github.html+json"
      );
      if (readmeRes?._html) {
        const cleanHtml = readmeRes._html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, "")
          .replace(/<object\b[^>]*>.*?<\/object>/gi, "")
          .replace(/<embed\b[^>]*>/gi, "")
          .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "")
          .slice(0, 100000);
        updateReadme.run(cleanHtml, stripHtml(cleanHtml), projectId);
      }

      added++;
      console.log(`   ✅ ${repo.full_name} → ${category} (${version}) ⭐${repo.stargazers_count}`);

      await sleep(token ? 100 : 800);
    }
  }

  // Rebuild FTS index
  try {
    db.exec("INSERT INTO projects_fts(projects_fts) VALUES('rebuild')");
    console.log("\n  🔄 FTS index rebuilt.");
  } catch {}

  console.log(`\n📦 Done! Added ${added} packages, skipped ${skipped} duplicates.`);
  console.log(`   Total packages in DB: ${db.prepare("SELECT COUNT(*) as c FROM projects").get().c}`);

  db.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
