#!/usr/bin/env node
/**
 * Seed landmark AI/agent ecosystem projects that may be missed by topic search.
 * These are the projects every agent developer knows about.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "freshcrate.db");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || (() => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", ".freshcrate-token"), "utf-8"));
    return data.access_token && data.expires_at > Date.now() ? data.access_token : "";
  } catch { return ""; }
})();

const authHeaders = {
  Accept: "application/vnd.github+json",
  "User-Agent": "freshcrate-seed",
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
};

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ghFetch(url, accept) {
  const headers = { ...authHeaders };
  if (accept) headers.Accept = accept;
  const res = await fetch(url, { headers });
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    const wait = reset ? Math.max(0, Number(reset) - Math.floor(Date.now() / 1000)) : 60;
    console.log(`  ⏳ Rate limited, waiting ${wait}s...`);
    await sleep(wait * 1000 + 1000);
    return ghFetch(url, accept);
  }
  if (!res.ok) return null;
  if (accept?.includes("html")) return { _html: await res.text() };
  return res.json();
}

// Category rules
const RULES = [
  { match: /\bmcp\b/i, cat: "MCP Servers" },
  { match: /\b(sandbox|secure|permission|auth)\b/i, cat: "Security" },
  { match: /\b(benchmark|eval|test|quality)\b/i, cat: "Testing" },
  { match: /\b(vector|database|db|storage|embed)\b/i, cat: "Databases" },
  { match: /\b(framework|orchestrat|chain|workflow|pipelin)\b/i, cat: "Frameworks" },
  { match: /\b(gateway|proxy|infra|deploy|server)\b/i, cat: "Infrastructure" },
  { match: /\b(agent|autonom|copilot|assistant)\b/i, cat: "AI Agents" },
  { match: /\b(tool|cli|util|devtool|generat)\b/i, cat: "Developer Tools" },
  { match: /\b(rag|retriev|search|context|memory)\b/i, cat: "RAG & Memory" },
  { match: /\b(prompt|template)\b/i, cat: "Prompt Engineering" },
];
function categorize(name, desc, topics) {
  const text = `${name} ${desc} ${topics.join(" ")}`;
  for (const r of RULES) { if (r.match.test(text)) return r.cat; }
  return "Uncategorized";
}
function urgency(d) {
  if (!d) return "Low";
  const days = (Date.now() - new Date(d).getTime()) / 864e5;
  return days < 7 ? "High" : days < 30 ? "Medium" : "Low";
}
function stripTags(html) {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, "")
    .replace(/<object\b[^>]*>.*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "");
}

// Landmark repos — owner/repo format
const LANDMARKS = [
  // LLM Frameworks
  "langchain-ai/langchain", "run-llama/llama_index", "microsoft/semantic-kernel",
  "stanfordnlp/dspy", "jxnl/instructor", "dottxt-ai/outlines", "guidance-ai/guidance",
  // Agents
  "Significant-Gravitas/AutoGPT", "yoheinakajima/babyagi", "camel-ai/camel",
  "superagent-ai/superagent", "sweepai/sweep", "aider-chat/aider",
  // Coding Assistants
  "continuedev/continue", "TabbyML/tabby", "sourcegraph/cody",
  // Local LLM Inference
  "ollama/ollama", "vllm-project/vllm", "ggerganov/llama.cpp",
  "mudler/LocalAI", "janhq/jan",
  // Vector DBs
  "chroma-core/chroma", "pinecone-io/pinecone-python-client",
  // Memory
  "mem0ai/mem0", "letta-ai/letta",
  // Eval & Testing
  "promptfoo/promptfoo", "explodinggradients/ragas", "confident-ai/deepeval",
  // Infrastructure
  "e2b-dev/e2b", "modal-labs/modal-client", "replicate/replicate-python",
  "BerriAI/litellm",
  // MCP
  "anthropics/anthropic-sdk-python", "openai/openai-python",
  "browserbase/stagehand", "composiohq/composio",
];

async function main() {
  console.log(`\n🌟 Seeding landmark projects\n`);

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const existing = new Set(db.prepare("SELECT name FROM projects").all().map(r => r.name));
  const insertProject = db.prepare(
    "INSERT INTO projects (name, short_desc, description, homepage_url, repo_url, license, category, author, stars, forks, language, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
  );
  const insertRelease = db.prepare(
    "INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?,?,?,?,?)"
  );
  const insertTag = db.prepare("INSERT OR IGNORE INTO tags (project_id, tag) VALUES (?,?)");
  const updateReadme = db.prepare(
    "UPDATE projects SET readme_html = ?, readme_fetched_at = datetime('now'), last_github_sync = datetime('now') WHERE id = ?"
  );

  let added = 0, skipped = 0;

  for (const slug of LANDMARKS) {
    const [owner, repoName] = slug.split("/");
    const repo = await ghFetch(`https://api.github.com/repos/${slug}`);
    if (!repo) { console.log(`  ⚠ ${slug}: not found`); continue; }

    if (existing.has(repo.name)) { skipped++; continue; }

    // Release
    let version = "0.0.0", changes = "No release found", releaseDate = repo.pushed_at;
    const rel = await ghFetch(`https://api.github.com/repos/${slug}/releases/latest`);
    if (rel?.tag_name) {
      version = rel.tag_name;
      changes = (rel.body || "").slice(0, 500).replace(/\r?\n/g, " ");
      releaseDate = rel.published_at || releaseDate;
    } else {
      const tags = await ghFetch(`https://api.github.com/repos/${slug}/tags?per_page=1`);
      if (tags?.[0]) version = tags[0].name;
    }

    const cat = categorize(repo.name, repo.description || "", repo.topics || []);
    const result = insertProject.run(
      repo.name, (repo.description || "").slice(0, 200), repo.description || "",
      repo.homepage || repo.html_url, repo.html_url,
      repo.license?.spdx_id || "Unknown", cat, owner,
      repo.stargazers_count || 0, repo.forks_count || 0,
      repo.language || "", repo.created_at
    );
    const pid = result.lastInsertRowid;

    insertRelease.run(pid, version, changes, urgency(releaseDate), releaseDate);

    for (const t of (repo.topics || []).slice(0, 8)) insertTag.run(pid, t.toLowerCase());
    if (repo.language) insertTag.run(pid, repo.language.toLowerCase());

    // README
    const readmeRes = await ghFetch(`https://api.github.com/repos/${slug}/readme`, "application/vnd.github.html+json");
    if (readmeRes?._html) updateReadme.run(stripTags(readmeRes._html).slice(0, 100000), pid);

    existing.add(repo.name);
    added++;
    console.log(`  ✅ ${slug} → ${cat} (${version}) ⭐${repo.stargazers_count}`);
    await sleep(100);
  }

  // Rebuild FTS
  try { db.exec("INSERT INTO projects_fts(projects_fts) VALUES('rebuild')"); } catch {}

  console.log(`\n📦 Added ${added}, skipped ${skipped} (already existed).`);
  console.log(`   Total: ${db.prepare("SELECT COUNT(*) as c FROM projects").get().c}`);
  db.close();
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
