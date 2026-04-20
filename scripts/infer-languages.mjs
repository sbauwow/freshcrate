#!/usr/bin/env node
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDbDir, getDbPath } from "./lib/db-path.mjs";
import { resolveRepoLanguage } from "./lib/repo-language.mjs";

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

function registryLanguageMeta(row) {
  if (row.source_type === "npm") return { language: row.language || "JavaScript", source: "registry" };
  if (row.source_type === "pypi") return { language: row.language || "Python", source: "registry" };
  return null;
}

function fallbackLanguageMeta(row) {
  const registryMeta = registryLanguageMeta(row);
  if (registryMeta) return registryMeta;
  if (row.language === "Docs / Meta") return { language: row.language, source: "docs_meta" };
  if (row.language) return { language: row.language, source: row.source_type === "github" ? "github" : "manual" };
  return { language: "Docs / Meta", source: "docs_meta" };
}

async function main() {
  console.log(`🔤 freshcrate language inference ${DRY_RUN ? "(DRY RUN)" : ""}`);
  ensureDbDir();
  const db = new Database(DB_PATH);
  const rows = db.prepare(`
    SELECT id, name, repo_url, description, language, language_source, source_type
    FROM projects
    WHERE (language IS NULL OR TRIM(language) = '')
       OR (language_source IS NULL OR TRIM(language_source) = '')
    ORDER BY COALESCE(stars, 0) DESC, name ASC
    ${LIMIT > 0 ? `LIMIT ${LIMIT}` : ""}
  `).all();

  console.log(`Found ${rows.length} repos needing language metadata`);
  const updateStmt = db.prepare("UPDATE projects SET language = ?, language_source = ?, last_github_sync = ? WHERE id = ?");
  let updated = 0;
  let unresolved = 0;

  for (const row of rows) {
    const registryMeta = registryLanguageMeta(row);
    if (registryMeta) {
      console.log(`  ✅ ${row.name} -> ${registryMeta.language} [${registryMeta.source}]`);
      if (!DRY_RUN) updateStmt.run(registryMeta.language, registryMeta.source, new Date().toISOString(), row.id);
      updated++;
      continue;
    }

    const parsed = parseGithubUrl(row.repo_url);
    if (!parsed) {
      const fallbackMeta = fallbackLanguageMeta(row);
      console.log(`  ✅ ${row.name} -> ${fallbackMeta.language} [${fallbackMeta.source}]`);
      if (!DRY_RUN) updateStmt.run(fallbackMeta.language, fallbackMeta.source, new Date().toISOString(), row.id);
      updated++;
      continue;
    }

    const slug = `${parsed.owner}/${parsed.repo}`;
    const repo = await ghFetchJson(`https://api.github.com/repos/${slug}`);
    if (!repo) {
      const fallbackMeta = fallbackLanguageMeta(row);
      console.log(`  ⚠ ${row.name}: repo fetch failed, fallback -> ${fallbackMeta.language} [${fallbackMeta.source}]`);
      if (!DRY_RUN) updateStmt.run(fallbackMeta.language, fallbackMeta.source, new Date().toISOString(), row.id);
      updated++;
      continue;
    }

    if (repo.language && row.language && repo.language === row.language) {
      console.log(`  ✅ ${row.name} -> ${row.language} [github]`);
      if (!DRY_RUN) updateStmt.run(row.language, "github", new Date().toISOString(), row.id);
      updated++;
      await sleep(GITHUB_TOKEN ? 40 : 400);
      continue;
    }

    const rootContents = await ghFetchJson(`https://api.github.com/repos/${slug}/contents`) || [];
    const readme = await ghFetchJson(`https://api.github.com/repos/${slug}/readme`);
    const readmeText = typeof readme?.content === "string"
      ? Buffer.from(readme.content, "base64").toString("utf-8")
      : "";
    const resolved = resolveRepoLanguage({ repo: { ...repo, source_type: row.source_type }, rootContents, readmeText });
    if (resolved.language && resolved.source) {
      console.log(`  ✅ ${row.name} -> ${resolved.language} [${resolved.source}]`);
      if (!DRY_RUN) updateStmt.run(resolved.language, resolved.source, new Date().toISOString(), row.id);
      updated++;
    } else {
      console.log(`  · ${row.name} -> still unresolved`);
      unresolved++;
    }
    await sleep(GITHUB_TOKEN ? 75 : 750);
  }

  db.close();
  console.log(`Done: ${updated} updated, ${unresolved} unresolved`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
