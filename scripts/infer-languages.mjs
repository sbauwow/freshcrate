#!/usr/bin/env node
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDbDir, getDbPath } from "./lib/db-path.mjs";
import { inferRepoLanguage } from "./lib/repo-language.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const TOKEN_PATH = path.join(PROJECT_ROOT, ".freshcrate-token");
const DB_PATH = getDbPath();
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = Number(process.argv[process.argv.indexOf("--limit") + 1] || 0) || 0;

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
  "User-Agent": "freshcrate-language-infer",
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
};

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function ghFetchJson(url) {
  const res = await fetch(url, { headers: authHeaders });
  if (res.status === 403 || res.status === 429) {
    const reset = Number(res.headers.get("x-ratelimit-reset") || 0);
    const waitMs = Math.max(reset * 1000 - Date.now(), 1000);
    console.log(`  ⏳ Rate limited, waiting ${Math.ceil(waitMs / 1000)}s...`);
    await sleep(waitMs + 1000);
    return ghFetchJson(url);
  }
  if (!res.ok) return null;
  return res.json();
}

function parseGithubUrl(url) {
  const match = url?.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

async function main() {
  console.log(`🔤 freshcrate language inference ${DRY_RUN ? "(DRY RUN)" : ""}`);
  ensureDbDir();
  const db = new Database(DB_PATH);
  const rows = db.prepare(`
    SELECT id, name, repo_url, description
    FROM projects
    WHERE language IS NULL OR TRIM(language) = ''
    ORDER BY COALESCE(stars, 0) DESC, name ASC
    ${LIMIT > 0 ? `LIMIT ${LIMIT}` : ""}
  `).all();

  console.log(`Found ${rows.length} blank-language repos`);
  const updateStmt = db.prepare("UPDATE projects SET language = ?, last_github_sync = ? WHERE id = ?");
  let updated = 0;
  let stillBlank = 0;

  for (const row of rows) {
    const parsed = parseGithubUrl(row.repo_url);
    if (!parsed) {
      console.log(`  ✅ ${row.name} -> Docs / Meta (no repo URL)`);
      if (!DRY_RUN) updateStmt.run("Docs / Meta", new Date().toISOString(), row.id);
      updated++;
      continue;
    }
    const slug = `${parsed.owner}/${parsed.repo}`;
    const repo = await ghFetchJson(`https://api.github.com/repos/${slug}`);
    if (!repo) {
      console.log(`  ⚠ ${row.name}: repo fetch failed`);
      stillBlank++;
      continue;
    }
    const rootContents = await ghFetchJson(`https://api.github.com/repos/${slug}/contents`) || [];
    const readme = await ghFetchJson(`https://api.github.com/repos/${slug}/readme`);
    const readmeText = typeof readme?.content === "string"
      ? Buffer.from(readme.content, "base64").toString("utf-8")
      : "";
    const language = inferRepoLanguage({ repo, rootContents, readmeText });
    if (language) {
      console.log(`  ✅ ${row.name} -> ${language}`);
      if (!DRY_RUN) updateStmt.run(language, new Date().toISOString(), row.id);
      updated++;
    } else {
      console.log(`  · ${row.name} -> still blank`);
      stillBlank++;
    }
    await sleep(GITHUB_TOKEN ? 75 : 750);
  }

  db.close();
  console.log(`Done: ${updated} updated, ${stillBlank} still blank`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
