#!/usr/bin/env node

/**
 * freshcrate Topic Watcher
 *
 * Polls GitHub topics for new/updated repos and ingests them into freshcrate.
 * Tracks high-water marks per topic so only new repos are processed each run.
 *
 * Default topics: ai-agent, mcp-server, mcp, llm-agent, ai-framework,
 * vector-database, rag, autonomous-agent, code-generation, prompt-engineering
 *
 * Usage:
 *   GITHUB_TOKEN=<token> node scripts/topic-watch.mjs
 *   GITHUB_TOKEN=<token> node scripts/topic-watch.mjs --dry-run
 *   GITHUB_TOKEN=<token> node scripts/topic-watch.mjs --topics ai-agent,mcp-server
 *   GITHUB_TOKEN=<token> node scripts/topic-watch.mjs --add-topic my-new-topic
 *   GITHUB_TOKEN=<token> node scripts/topic-watch.mjs --list
 *   GITHUB_TOKEN=<token> node scripts/topic-watch.mjs --min-stars 10
 *
 * Designed for cron: every 6 hours (0 star-slash-6 star star star)
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
const LIST_MODE = process.argv.includes("--list");
const MIN_STARS = parseInt(getArg("--min-stars") || "5");

const DEFAULT_TOPICS = [
  "ai-agent",
  "mcp-server",
  "mcp",
  "llm-agent",
  "ai-framework",
  "vector-database",
  "rag",
  "autonomous-agent",
  "code-generation",
  "prompt-engineering",
  "llm-tool",
  "agentic",
  "model-context-protocol",
];

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
  "User-Agent": "freshcrate-topic-watch",
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ghFetch(url) {
  const res = await fetch(url, { headers: authHeaders });

  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    const waitSec = reset ? Math.max(0, Number(reset) - Math.floor(Date.now() / 1000)) : 60;
    console.log(`  ⏳ Rate limited, waiting ${waitSec}s...`);
    await sleep(waitSec * 1000 + 1000);
    return ghFetch(url);
  }

  if (!res.ok) {
    console.log(`  ⚠ GitHub API ${res.status}: ${url.slice(0, 80)}`);
    return null;
  }
  return res.json();
}

// ── Category rules (mirrors lib/categories.ts) ──
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

function stripDangerousTags(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, "")
    .replace(/<object\b[^>]*>.*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "");
}

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

async function main() {
  console.log(`\n🔭 freshcrate Topic Watcher${DRY_RUN ? " (DRY RUN)" : ""}\n`);

  if (!GITHUB_TOKEN) {
    console.log("  ⚠ No GITHUB_TOKEN — running with 10 search requests/min limit.");
    console.log("  Set GITHUB_TOKEN for 30 requests/min.\n");
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Run migrations if needed
  const migrationsDir = path.join(PROJECT_ROOT, "migrations");
  if (fs.existsSync(migrationsDir)) {
    db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    const applied = new Set(db.prepare("SELECT name FROM _migrations").all().map(r => r.name));
    for (const file of fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort()) {
      if (applied.has(file)) continue;
      db.transaction(() => {
        db.exec(fs.readFileSync(path.join(migrationsDir, file), "utf-8"));
        db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
      })();
      console.log(`  [migrate] Applied: ${file}`);
    }
  }

  // ── Handle --add-topic ──
  const addTopic = getArg("--add-topic");
  if (addTopic) {
    db.prepare("INSERT OR IGNORE INTO watched_topics (topic) VALUES (?)").run(addTopic);
    console.log(`  ✅ Added topic: ${addTopic}`);
    db.close();
    return;
  }

  // ── Seed default topics ──
  const seedTopic = db.prepare("INSERT OR IGNORE INTO watched_topics (topic) VALUES (?)");
  for (const t of DEFAULT_TOPICS) { seedTopic.run(t); }

  // ── Handle --topics override ──
  const topicsArg = getArg("--topics");

  // ── Handle --list ──
  if (LIST_MODE) {
    const rows = db.prepare("SELECT * FROM watched_topics ORDER BY topic").all();
    console.log("  Topic                       Active  Last Checked         Found  Added");
    console.log("  ──────────────────────────  ──────  ───────────────────  ─────  ─────");
    for (const r of rows) {
      console.log(`  ${r.topic.padEnd(28)} ${r.active ? "  ✓  " : "  ✗  "}  ${(r.last_checked_at || "never").padEnd(19)}  ${String(r.repos_found).padStart(5)}  ${String(r.repos_added).padStart(5)}`);
    }
    console.log("");
    db.close();
    return;
  }

  // Get active topics
  let topics;
  if (topicsArg) {
    topics = topicsArg.split(",").map(t => ({ topic: t.trim() }));
  } else {
    topics = db.prepare("SELECT topic FROM watched_topics WHERE active = 1 ORDER BY topic").all();
  }

  console.log(`  Watching ${topics.length} topics (min ${MIN_STARS} stars)\n`);

  // Prepared statements
  const existingNames = new Set(db.prepare("SELECT name FROM projects").all().map(r => r.name));

  const insertProject = db.prepare(
    `INSERT INTO projects (name, short_desc, description, homepage_url, repo_url, license, category, author, stars, forks, language)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertRelease = db.prepare(
    "INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  const insertTag = db.prepare("INSERT OR IGNORE INTO tags (project_id, tag) VALUES (?, ?)");
  const updateReadme = db.prepare(
    "UPDATE projects SET readme_html = ?, readme_text = ?, readme_fetched_at = datetime('now'), last_github_sync = datetime('now') WHERE id = ?"
  );
  const updateTopicStats = db.prepare(
    "UPDATE watched_topics SET last_checked_at = datetime('now'), repos_found = repos_found + ?, repos_added = repos_added + ? WHERE topic = ?"
  );

  let totalAdded = 0;
  let totalFound = 0;
  let totalSkipped = 0;

  for (const { topic } of topics) {
    console.log(`🏷️  Topic: ${topic}`);

    // Search for repos with this topic, sorted by recently updated, min stars
    const query = `topic:${topic} stars:>=${MIN_STARS}`;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=50`;

    const data = await ghFetch(url);
    if (!data || !data.items) {
      console.log(`   ⚠ Failed to fetch, skipping\n`);
      continue;
    }

    const repos = data.items;
    let topicAdded = 0;
    let topicSkipped = 0;

    console.log(`   Found ${repos.length} repos (${data.total_count} total matching)`);

    for (const repo of repos) {
      if (existingNames.has(repo.name)) {
        topicSkipped++;
        continue;
      }

      const [owner, repoName] = repo.full_name.split("/");

      // Fetch release info
      let version = null;
      let changes = "";
      let releaseDate = repo.pushed_at;

      const release = await ghFetch(`https://api.github.com/repos/${owner}/${repoName}/releases/latest`);
      if (release?.tag_name) {
        version = release.tag_name;
        changes = (release.body || "").slice(0, 500).replace(/\r?\n/g, " ");
        releaseDate = release.published_at || releaseDate;
      } else {
        const tags = await ghFetch(`https://api.github.com/repos/${owner}/${repoName}/tags?per_page=1`);
        if (tags?.[0]) version = tags[0].name;
      }

      if (!version) { version = "0.0.0"; changes = "No release found — using repo HEAD"; }

      const category = categorize(repo);
      const shortDesc = (repo.description || "No description").slice(0, 200);
      const repoTopics = repo.topics || [];

      if (DRY_RUN) {
        console.log(`   📦 [DRY] ${repo.full_name} → ${category} (${version}) ⭐${repo.stargazers_count}`);
        topicAdded++;
        existingNames.add(repo.name);
        continue;
      }

      try {
        const result = insertProject.run(
          repo.name, shortDesc, repo.description || "",
          repo.homepage || repo.html_url, repo.html_url,
          repo.license?.spdx_id || "Unknown", category, owner,
          repo.stargazers_count || 0, repo.forks_count || 0, repo.language || ""
        );
        const projectId = result.lastInsertRowid;

        insertRelease.run(projectId, version, changes || `Latest release: ${version}`,
          urgencyFromAge(releaseDate), releaseDate || new Date().toISOString());

        for (const t of repoTopics.slice(0, 8)) { insertTag.run(projectId, t.toLowerCase()); }
        if (repo.language) insertTag.run(projectId, repo.language.toLowerCase());
        // Also tag with the watched topic
        insertTag.run(projectId, topic);

        // Fetch README
        const readmeRes = await ghFetch(`https://api.github.com/repos/${owner}/${repoName}/readme`);
        if (readmeRes) {
          // Get HTML rendered version
          const htmlRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/readme`, {
            headers: { ...authHeaders, Accept: "application/vnd.github.html+json" }
          });
          if (htmlRes.ok) {
            const html = await htmlRes.text();
            const cleanHtml = stripDangerousTags(html).slice(0, 100000);
            updateReadme.run(cleanHtml, stripHtml(cleanHtml), projectId);
          }
        }

        existingNames.add(repo.name);
        topicAdded++;
        console.log(`   ✅ ${repo.full_name} → ${category} (${version}) ⭐${repo.stargazers_count}`);
      } catch (err) {
        if (err.message?.includes("UNIQUE")) {
          topicSkipped++;
        } else {
          console.log(`   ⚠ Error inserting ${repo.name}: ${err.message}`);
        }
      }

      await sleep(GITHUB_TOKEN ? 100 : 1000);
    }

    if (!DRY_RUN) {
      updateTopicStats.run(repos.length, topicAdded, topic);
    }

    totalFound += repos.length;
    totalAdded += topicAdded;
    totalSkipped += topicSkipped;

    console.log(`   → Added ${topicAdded}, skipped ${topicSkipped}\n`);

    // Rate limit between topic searches (search API is 30/min authenticated)
    await sleep(GITHUB_TOKEN ? 2000 : 6000);
  }

  // Rebuild FTS
  if (totalAdded > 0 && !DRY_RUN) {
    try {
      db.exec("INSERT INTO projects_fts(projects_fts) VALUES('rebuild')");
      console.log("  🔄 FTS index rebuilt.");
    } catch {}
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Topics watched: ${topics.length}`);
  console.log(`   Repos found:    ${totalFound}`);
  console.log(`   Added:          ${totalAdded}`);
  console.log(`   Skipped (dupes): ${totalSkipped}`);
  if (DRY_RUN) console.log(`   (Dry run — no changes written)`);
  console.log("");

  db.close();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
