#!/usr/bin/env node

import Database from "better-sqlite3";
import { ensureDbDir, getDbPath } from "./lib/db-path.mjs";
import { buildCanonicalKey } from "./lib/canonical-id.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const MAX = Number(getArg("--max") || 600);
const MIN_SCORE = Number(getArg("--min-score") || 0.15);
const DB_PATH = getDbPath();

const QUERIES = [
  "ai agent",
  "mcp server",
  "rag",
  "llm",
  "prompt",
  "vector database",
  "autonomous agent",
  "tool calling",
];

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

function scoreSignal(text) {
  const t = (text || "").toLowerCase();
  let s = 0;
  if (/\bmcp\b|model context protocol/.test(t)) s += 0.4;
  if (/\b(ai|agent|llm|rag|prompt|embedding|vector)\b/.test(t)) s += 0.3;
  if (/tool|framework|sdk|inference|orchestrat/.test(t)) s += 0.2;
  if (/security|sandbox|policy|guardrail/.test(t)) s += 0.1;
  return Math.min(1, s);
}

function categoryFromText(text) {
  const t = (text || "").toLowerCase();
  if (/\bmcp\b/.test(t)) return "MCP Servers";
  if (/sandbox|secure|permission|auth/.test(t)) return "Security";
  if (/vector|embedding|database|db|storage/.test(t)) return "Databases";
  if (/framework|workflow|orchestrat|pipeline/.test(t)) return "Frameworks";
  if (/rag|retriev|search|memory/.test(t)) return "RAG & Memory";
  if (/prompt|template/.test(t)) return "Prompt Engineering";
  if (/agent|autonom|assistant|copilot/.test(t)) return "AI Agents";
  return "Developer Tools";
}

async function npmSearch(query, from = 0, size = 250) {
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${size}&from=${from}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.objects || [];
}

async function npmPackage(name) {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
  if (!res.ok) return null;
  return res.json();
}

function safeRepoUrl(repo) {
  if (!repo) return "";
  if (typeof repo === "string") return repo.replace(/^git\+/, "").replace(/\.git$/, "");
  if (typeof repo.url === "string") return repo.url.replace(/^git\+/, "").replace(/\.git$/, "");
  return "";
}

async function main() {
  console.log(`📦 npm importer ${DRY_RUN ? '(DRY RUN)' : ''}`);
  ensureDbDir();
  const db = new Database(DB_PATH);

  const existingCanonical = new Set(
    db.prepare("SELECT canonical_key FROM projects WHERE canonical_key IS NOT NULL AND canonical_key != ''").all().map((r) => r.canonical_key)
  );
  const existingNames = new Set(db.prepare("SELECT name FROM projects").all().map((r) => r.name));

  const insertProject = db.prepare(
    `INSERT INTO projects (name, short_desc, description, homepage_url, repo_url, license, category, author, stars, forks, language, language_source, source_type, source_package_id, source_url, canonical_key, provenance_json, imported_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertRelease = db.prepare(
    "INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  const insertTag = db.prepare("INSERT OR IGNORE INTO tags (project_id, tag) VALUES (?, ?)");

  const candidates = new Map();
  for (const query of QUERIES) {
    for (const from of [0, 250, 500]) {
      const rows = await npmSearch(query, from, 250);
      for (const row of rows) {
        const p = row.package;
        if (!p?.name) continue;
        candidates.set(p.name, p);
      }
    }
  }

  let inspected = 0;
  let added = 0;
  let skipped = 0;

  for (const pkg of candidates.values()) {
    if (added >= MAX) break;
    inspected += 1;

    const detail = await npmPackage(pkg.name);
    if (!detail) {
      skipped += 1;
      continue;
    }

    const latest = detail["dist-tags"]?.latest || pkg.version || "0.0.0";
    const meta = detail.versions?.[latest] || {};
    const repoUrl = safeRepoUrl(meta.repository || pkg.links?.repository);
    const homepage = meta.homepage || pkg.links?.homepage || pkg.links?.npm || "";
    const desc = (meta.description || pkg.description || "").slice(0, 5000);
    const signalText = `${pkg.name} ${desc} ${(meta.keywords || []).join(" ")}`;
    const confidence = scoreSignal(signalText);

    if (confidence < MIN_SCORE) {
      skipped += 1;
      continue;
    }

    const canonical = buildCanonicalKey({
      sourceType: "npm",
      name: pkg.name,
      repoUrl,
      homepageUrl: homepage,
    });

    if (existingCanonical.has(canonical) || existingNames.has(pkg.name)) {
      skipped += 1;
      continue;
    }

    const author = typeof meta.author === "string"
      ? meta.author
      : (meta.author?.name || pkg.publisher?.username || "npm");
    const category = categoryFromText(signalText);
    const sourceUrl = `https://www.npmjs.com/package/${encodeURIComponent(pkg.name)}`;
    const tags = (meta.keywords || []).slice(0, 8).map((k) => String(k).toLowerCase());

    if (DRY_RUN) {
      added += 1;
      existingCanonical.add(canonical);
      existingNames.add(pkg.name);
      continue;
    }

    const result = insertProject.run(
      pkg.name,
      (desc || "No description").slice(0, 200),
      desc,
      homepage,
      repoUrl,
      meta.license || "Unknown",
      category,
      String(author).slice(0, 100),
      0,
      0,
      "JavaScript",
      "registry",
      "npm",
      pkg.name,
      sourceUrl,
      canonical,
      JSON.stringify({
        source_type: "npm",
        source_package_id: pkg.name,
        source_url: sourceUrl,
        canonical_key: canonical,
        confidence,
        matched_by: "npm_search_heuristic",
        imported_at: new Date().toISOString(),
      }),
      new Date().toISOString()
    );

    const id = result.lastInsertRowid;
    insertRelease.run(id, latest, `Imported from npm (${latest})`, "Low", new Date().toISOString());
    for (const tag of tags) insertTag.run(id, tag);
    insertTag.run(id, "npm");

    added += 1;
    existingCanonical.add(canonical);
    existingNames.add(pkg.name);
  }

  if (!DRY_RUN && added > 0) {
    try { db.exec("INSERT INTO projects_fts(projects_fts) VALUES('rebuild')"); } catch {}
  }

  console.log(`Candidates scanned: ${inspected}`);
  console.log(`Imported: ${added}`);
  console.log(`Skipped: ${skipped}`);

  db.close();
}

main().catch((err) => {
  console.error("npm importer failed:", err.message || err);
  process.exit(1);
});
