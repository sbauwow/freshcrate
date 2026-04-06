#!/usr/bin/env node

/**
 * freshcrate Agentic Populate Pipeline
 *
 * Searches GitHub for real AI agent/tool packages, fetches metadata + releases,
 * categorizes them, and inserts into the freshcrate SQLite DB.
 *
 * Auth: On first run (or when rate-limited), triggers GitHub OAuth Device Flow.
 * The token is cached in .freshcrate-token for future runs.
 *
 * Usage:
 *   node scripts/populate.mjs                # run (auto-authenticates if needed)
 *   node scripts/populate.mjs --clear        # clear existing data first
 *   node scripts/populate.mjs --login        # force re-authenticate
 *   GITHUB_TOKEN=ghp_... node scripts/populate.mjs  # skip OAuth, use this token
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { exec } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const DB_PATH = path.join(PROJECT_ROOT, "freshcrate.db");
const TOKEN_PATH = path.join(PROJECT_ROOT, ".freshcrate-token");

const CLEAR = process.argv.includes("--clear");
const FORCE_LOGIN = process.argv.includes("--login");

// ============================================================
// GitHub OAuth Device Flow
// ============================================================
// Register your own GitHub OAuth App at:
//   https://github.com/settings/applications/new
// Set the callback URL to anything (not used in device flow).
// Replace this CLIENT_ID with yours. This one is a public
// client ID for CLI tools (no secret needed for device flow).
// ============================================================
const GITHUB_CLIENT_ID = process.env.FRESHCRATE_GITHUB_CLIENT_ID || "";
if (!GITHUB_CLIENT_ID && !process.env.GITHUB_TOKEN) {
  console.error("Set FRESHCRATE_GITHUB_CLIENT_ID or GITHUB_TOKEN in your .env");
  console.error("Create an OAuth App at: https://github.com/settings/applications/new");
  process.exit(1);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadCachedToken() {
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    if (data.access_token && data.expires_at > Date.now()) {
      return data.access_token;
    }
    // Token expired or missing
    return null;
  } catch {
    return null;
  }
}

function saveCachedToken(accessToken, expiresInSec) {
  const data = {
    access_token: accessToken,
    // Default to 8 hours if no expiry given (GitHub PATs don't expire, OAuth tokens do)
    expires_at: Date.now() + (expiresInSec || 28800) * 1000,
    created_at: new Date().toISOString(),
  };
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
  console.log(`  💾 Token cached at ${TOKEN_PATH}`);
}

async function deviceFlowAuth() {
  console.log("\n🔑 GitHub OAuth Device Flow\n");

  // Step 1: Request device & user codes
  const codeRes = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: "public_repo",
    }),
  });

  if (!codeRes.ok) {
    const text = await codeRes.text();
    throw new Error(`Failed to start device flow: ${codeRes.status} ${text}`);
  }

  const codeData = await codeRes.json();
  const { device_code, user_code, verification_uri, expires_in, interval } = codeData;

  // Step 2: Auto-open browser with the code pre-filled
  const verifyUrl = `${verification_uri}?user_code=${user_code}`;

  console.log("  ┌──────────────────────────────────────────┐");
  console.log("  │                                          │");
  console.log(`  │   Code:  ${user_code.padEnd(31)}│`);
  console.log("  │                                          │");
  console.log("  │   Opening browser...                     │");
  console.log("  │   (paste the code if not pre-filled)     │");
  console.log("  │                                          │");
  console.log("  └──────────────────────────────────────────┘");

  // Open browser — works on Linux (xdg-open), macOS (open), WSL (wslview/cmd.exe)
  const openCmd =
    process.platform === "darwin" ? "open" :
    process.platform === "win32" ? "start" :
    // Linux: try xdg-open, fall back to wslview for WSL
    "xdg-open";

  exec(`${openCmd} "${verifyUrl}"`, (err) => {
    if (err) {
      // If browser open fails, show the URL as fallback
      console.log(`\n  ⚠ Could not open browser. Go here manually:`);
      console.log(`    ${verifyUrl}\n`);
    }
  });

  console.log(`\n  Waiting for you to authorize in the browser (expires in ${Math.floor(expires_in / 60)}m)...`);

  // Step 3: Poll for the token
  const pollInterval = (interval || 5) * 1000;
  const deadline = Date.now() + expires_in * 1000;

  while (Date.now() < deadline) {
    await sleep(pollInterval);

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.access_token) {
      console.log("  ✅ Authenticated!\n");
      saveCachedToken(tokenData.access_token, tokenData.expires_in);
      return tokenData.access_token;
    }

    if (tokenData.error === "authorization_pending") {
      process.stdout.write(".");
      continue;
    }

    if (tokenData.error === "slow_down") {
      await sleep(5000);
      continue;
    }

    if (tokenData.error === "expired_token") {
      throw new Error("Device code expired. Please try again.");
    }

    if (tokenData.error === "access_denied") {
      throw new Error("Authorization denied by user.");
    }

    throw new Error(`Unexpected OAuth error: ${tokenData.error} - ${tokenData.error_description}`);
  }

  throw new Error("Device flow timed out.");
}

async function getToken() {
  // Priority: env var > cached token > device flow
  if (process.env.GITHUB_TOKEN) {
    console.log("🔑 Using GITHUB_TOKEN from environment");
    return process.env.GITHUB_TOKEN;
  }

  if (!FORCE_LOGIN) {
    const cached = loadCachedToken();
    if (cached) {
      console.log("🔑 Using cached token");
      return cached;
    }
  }

  return deviceFlowAuth();
}

// ============================================================
// GitHub API helpers
// ============================================================

let authHeaders = {};

function setAuth(token) {
  authHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": "freshcrate-populate",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function ghFetch(url) {
  const res = await fetch(url, { headers: authHeaders });

  if (res.status === 401) {
    // Token invalid/expired — clear cache and re-auth
    console.log("\n  ⚠ Token expired or invalid, re-authenticating...");
    try { fs.unlinkSync(TOKEN_PATH); } catch {}
    const newToken = await deviceFlowAuth();
    setAuth(newToken);
    return ghFetch(url);
  }

  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");

    // If we're rate-limited and unauthenticated, offer to auth
    if (!authHeaders.Authorization) {
      console.log("\n  ⚠ Rate limited (unauthenticated). Let's authenticate for higher limits.");
      const newToken = await deviceFlowAuth();
      setAuth(newToken);
      return ghFetch(url);
    }

    // Authenticated but still rate-limited — wait it out
    const waitSec = reset ? Math.max(0, Number(reset) - Math.floor(Date.now() / 1000)) : 60;
    console.log(`  ⏳ Rate limited (${remaining} remaining), waiting ${waitSec}s...`);
    await sleep(waitSec * 1000 + 1000);
    return ghFetch(url);
  }

  if (!res.ok) {
    console.error(`  ⚠ GitHub API ${res.status}: ${url}`);
    return null;
  }
  return res.json();
}

// ============================================================
// Search queries targeting real agent ecosystem packages
// ============================================================

const SEARCH_QUERIES = [
  // MCP ecosystem
  "mcp server in:name,description language:TypeScript stars:>20",
  "mcp server in:name,description language:Python stars:>20",
  "model context protocol in:description stars:>50",
  // AI agents
  "ai agent framework in:name,description stars:>100",
  "autonomous coding agent in:name,description stars:>50",
  "llm agent in:name,description stars:>200",
  // Agent tools & infra
  "llm tool use in:name,description stars:>50",
  "ai code generation in:name,description stars:>100",
  "vector database in:name,description stars:>200",
  "prompt engineering framework in:name,description stars:>50",
  // RAG & memory
  "rag framework in:name,description stars:>100",
  "agent memory in:name,description stars:>30",
  // Sandboxing & security
  "code sandbox ai in:name,description stars:>30",
  "llm gateway in:name,description stars:>50",
];

// ============================================================
// Categorization
// ============================================================

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
  for (const rule of CATEGORY_RULES) {
    if (rule.match.test(text)) return rule.category;
  }
  return "Uncategorized";
}

function urgencyFromAge(dateStr) {
  if (!dateStr) return "Low";
  const days = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (days < 7) return "High";
  if (days < 30) return "Medium";
  return "Low";
}

// ============================================================
// Main pipeline
// ============================================================

async function searchGitHub(query, perPage = 30) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&per_page=${perPage}`;
  const data = await ghFetch(url);
  return data?.items || [];
}

async function getLatestRelease(owner, repo) {
  return await ghFetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
}

async function getRecentTags(owner, repo) {
  const data = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`);
  return data?.[0] || null;
}

async function main() {
  console.log("🔧 freshcrate Populate Pipeline\n");

  // Authenticate
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

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Ensure tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_desc TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      homepage_url TEXT NOT NULL DEFAULT '',
      repo_url TEXT NOT NULL DEFAULT '',
      license TEXT NOT NULL DEFAULT 'MIT',
      category TEXT NOT NULL DEFAULT 'Uncategorized',
      author TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      version TEXT NOT NULL,
      changes TEXT NOT NULL DEFAULT '',
      urgency TEXT NOT NULL DEFAULT 'Low',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      tag TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_unique ON tags(project_id, tag);
    CREATE INDEX IF NOT EXISTS idx_releases_project ON releases(project_id);
    CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
    CREATE INDEX IF NOT EXISTS idx_releases_created ON releases(created_at);
  `);

  if (CLEAR) {
    console.log("🗑  Clearing existing data...");
    db.exec("DELETE FROM tags; DELETE FROM releases; DELETE FROM projects;");
  }

  const insertProject = db.prepare(
    "INSERT INTO projects (name, short_desc, description, homepage_url, repo_url, license, category, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertRelease = db.prepare(
    "INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  const insertTag = db.prepare(
    "INSERT OR IGNORE INTO tags (project_id, tag) VALUES (?, ?)"
  );
  const existingNames = new Set(
    db.prepare("SELECT name FROM projects").all().map((r) => r.name)
  );

  let added = 0;
  let skipped = 0;
  const seen = new Set(existingNames);

  for (const query of SEARCH_QUERIES) {
    console.log(`\n🔍 Searching: ${query}`);
    const repos = await searchGitHub(query);
    console.log(`   Found ${repos.length} repos`);

    for (const repo of repos) {
      const key = repo.full_name;
      if (seen.has(repo.name) || seen.has(key)) {
        skipped++;
        continue;
      }
      seen.add(repo.name);
      seen.add(key);

      // Try to get latest release
      const [owner, repoName] = repo.full_name.split("/");
      let version = null;
      let changes = "";
      let releaseDate = repo.pushed_at;

      const release = await getLatestRelease(owner, repoName);
      if (release && release.tag_name) {
        version = release.tag_name;
        changes = (release.body || "").slice(0, 500).replace(/\r\n/g, " ").replace(/\n/g, " ");
        releaseDate = release.published_at || releaseDate;
      } else {
        // Fall back to tags
        const tag = await getRecentTags(owner, repoName);
        if (tag) {
          version = tag.name;
        }
      }

      if (!version) {
        version = "0.0.0";
        changes = "No release found — using repo HEAD";
      }

      const category = categorize(repo);
      const license = repo.license?.spdx_id || "Unknown";
      const shortDesc = (repo.description || "No description").slice(0, 200);
      const topics = repo.topics || [];

      // Insert
      const result = insertProject.run(
        repo.name,
        shortDesc,
        repo.description || "",
        repo.homepage || repo.html_url,
        repo.html_url,
        license,
        category,
        owner
      );
      const projectId = result.lastInsertRowid;

      insertRelease.run(
        projectId,
        version,
        changes || `Latest release: ${version}`,
        urgencyFromAge(releaseDate),
        releaseDate || new Date().toISOString()
      );

      // Insert topics as tags
      for (const topic of topics.slice(0, 8)) {
        insertTag.run(projectId, topic.toLowerCase());
      }
      // Also add language as tag
      if (repo.language) {
        insertTag.run(projectId, repo.language.toLowerCase());
      }

      added++;
      console.log(`   ✅ ${repo.full_name} → ${category} (${version})`);

      // Pace requests (authenticated gets much higher limits)
      await sleep(token ? 100 : 800);
    }
  }

  console.log(`\n📦 Done! Added ${added} packages, skipped ${skipped} duplicates.`);
  console.log(`   Total packages in DB: ${db.prepare("SELECT COUNT(*) as c FROM projects").get().c}`);

  db.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
