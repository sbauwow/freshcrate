#!/usr/bin/env node

import Database from "better-sqlite3";
import { ensureDbDir, getDbPath } from "./lib/db-path.mjs";
import { buildCanonicalKey } from "./lib/canonical-id.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const MAX = Number(getArg("--max") || 600);
const MIN_SCORE = Number(getArg("--min-score") || 0.15);
const DB_PATH = getDbPath();

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

function scoreSignal(text) {
  const t = (text || "").toLowerCase();
  let s = 0;
  if (/\bmcp\b|model context protocol/.test(t)) s += 0.4;
  if (/\b(ai|agent|llm|rag|prompt|embedding|vector|transformer)\b/.test(t)) s += 0.3;
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

function pullUrl(info, key) {
  const urls = info.project_urls || {};
  if (key && urls[key]) return urls[key];
  return info.home_page || info.package_url || "";
}

function repoFromProjectUrls(info) {
  const urls = info.project_urls || {};
  const vals = Object.values(urls).map((x) => String(x));
  const hit = vals.find((v) => /github\.com|gitlab\.com|bitbucket\.org/i.test(v));
  return hit || "";
}

async function fetchTopPypiNames() {
  const res = await fetch("https://hugovk.github.io/top-pypi-packages/top-pypi-packages-30-days.min.json");
  if (!res.ok) throw new Error(`top-pypi fetch failed: ${res.status}`);
  const data = await res.json();
  return (data.rows || []).map((r) => r.project).filter(Boolean);
}

async function fetchPypi(name) {
  const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  console.log(`🐍 PyPI importer ${DRY_RUN ? '(DRY RUN)' : ''}`);
  ensureDbDir();
  const db = new Database(DB_PATH);

  const existingCanonical = new Set(
    db.prepare("SELECT canonical_key FROM projects WHERE canonical_key IS NOT NULL AND canonical_key != ''").all().map((r) => r.canonical_key)
  );
  const existingNames = new Set(db.prepare("SELECT name FROM projects").all().map((r) => r.name));

  const insertProject = db.prepare(
    `INSERT INTO projects (name, short_desc, description, homepage_url, repo_url, license, category, author, stars, forks, language, source_type, source_package_id, source_url, canonical_key, provenance_json, imported_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertRelease = db.prepare(
    "INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  const insertTag = db.prepare("INSERT OR IGNORE INTO tags (project_id, tag) VALUES (?, ?)");

  const topNames = await fetchTopPypiNames();

  let inspected = 0;
  let added = 0;
  let skipped = 0;

  for (const name of topNames) {
    if (added >= MAX) break;
    inspected += 1;

    const payload = await fetchPypi(name);
    if (!payload?.info) {
      skipped += 1;
      continue;
    }

    const info = payload.info;
    const summary = info.summary || "";
    const desc = (info.description || summary || "").slice(0, 5000);
    const keywords = String(info.keywords || "").split(/[ ,]+/).filter(Boolean).slice(0, 10);
    const classifiers = (info.classifiers || []).slice(0, 10);

    const signalText = `${name} ${summary} ${desc.slice(0, 400)} ${keywords.join(" ")} ${classifiers.join(" ")}`;
    const confidence = scoreSignal(signalText);
    if (confidence < MIN_SCORE) {
      skipped += 1;
      continue;
    }

    const repoUrl = repoFromProjectUrls(info);
    const homepage = pullUrl(info);

    const canonical = buildCanonicalKey({
      sourceType: "pypi",
      name,
      repoUrl,
      homepageUrl: homepage,
    });

    if (existingCanonical.has(canonical) || existingNames.has(name)) {
      skipped += 1;
      continue;
    }

    const version = info.version || "0.0.0";
    const category = categoryFromText(signalText);
    const author = String(info.author || info.maintainer || "pypi").slice(0, 100);
    const sourceUrl = `https://pypi.org/project/${encodeURIComponent(name)}/`;

    if (DRY_RUN) {
      added += 1;
      existingCanonical.add(canonical);
      existingNames.add(name);
      continue;
    }

    const result = insertProject.run(
      name,
      (summary || "No description").slice(0, 200),
      desc,
      homepage,
      repoUrl,
      info.license || "Unknown",
      category,
      author,
      0,
      0,
      "Python",
      "pypi",
      name,
      sourceUrl,
      canonical,
      JSON.stringify({
        source_type: "pypi",
        source_package_id: name,
        source_url: sourceUrl,
        canonical_key: canonical,
        confidence,
        matched_by: "top_pypi_heuristic",
        imported_at: new Date().toISOString(),
      }),
      new Date().toISOString()
    );

    const id = result.lastInsertRowid;
    insertRelease.run(id, version, `Imported from PyPI (${version})`, "Low", new Date().toISOString());
    for (const tag of keywords.slice(0, 8)) insertTag.run(id, tag.toLowerCase());
    insertTag.run(id, "pypi");

    added += 1;
    existingCanonical.add(canonical);
    existingNames.add(name);
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
  console.error("PyPI importer failed:", err.message || err);
  process.exit(1);
});
