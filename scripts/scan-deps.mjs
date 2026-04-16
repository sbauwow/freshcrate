#!/usr/bin/env node

/**
 * Batch dependency scanner — scans all packages with GitHub repos
 * for dependencies and runs license audit on each.
 *
 * Usage:
 *   node scripts/scan-deps.mjs              # scan all unscanned packages
 *   node scripts/scan-deps.mjs --all        # rescan everything
 *   node scripts/scan-deps.mjs --name foo   # scan a single package
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDbDir, getDbPath } from "./lib/db-path.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = getDbPath();

const ALL = process.argv.includes("--all");
const nameIdx = process.argv.indexOf("--name");
const SINGLE = nameIdx !== -1 ? process.argv[nameIdx + 1] : null;
const TOKEN = process.env.GITHUB_TOKEN || "";

// Dynamically import the deps module via tsx
// Since this is a standalone script, we inline the key logic

const SUPPORTED_FILES = ["package.json", "requirements.txt", "pyproject.toml", "Cargo.toml", "go.mod"];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchFile(owner, repo, filename) {
  const headers = { Accept: "application/vnd.github.raw+json", "User-Agent": "freshcrate" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filename}`, { headers });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

function parsePackageJson(content) {
  const pkg = JSON.parse(content);
  const deps = [];
  for (const [name, version] of Object.entries(pkg.dependencies || {})) deps.push({ name, version: String(version), type: "runtime" });
  for (const [name, version] of Object.entries(pkg.devDependencies || {})) deps.push({ name, version: String(version), type: "dev" });
  for (const [name, version] of Object.entries(pkg.peerDependencies || {})) deps.push({ name, version: String(version), type: "peer" });
  return { ecosystem: "npm", deps };
}

function parseRequirementsTxt(content) {
  const deps = [];
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("-")) continue;
    const m = t.match(/^([a-zA-Z0-9_.-]+)\s*([><=!~]+\s*[\d.*]+)?/);
    if (m) deps.push({ name: m[1], version: m[2]?.trim() || "*", type: "runtime" });
  }
  return { ecosystem: "pypi", deps };
}

const PARSERS = { "package.json": parsePackageJson, "requirements.txt": parseRequirementsTxt };

async function resolveLicense(ecosystem, name) {
  try {
    if (ecosystem === "npm") {
      const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`);
      if (!res.ok) return null;
      return (await res.json()).license || null;
    }
    if (ecosystem === "pypi") {
      const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
      if (!res.ok) return null;
      return (await res.json()).info?.license || null;
    }
  } catch {}
  return null;
}

const PERMISSIVE = new Set(["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "Unlicense", "0BSD", "CC0-1.0"]);
const COPYLEFT = new Set(["GPL-2.0", "GPL-2.0-only", "GPL-3.0", "GPL-3.0-only", "AGPL-3.0", "AGPL-3.0-only"]);
const WEAK = new Set(["LGPL-2.1", "LGPL-3.0", "MPL-2.0", "EPL-2.0"]);

function classify(spdx) {
  if (!spdx) return "unknown";
  if (PERMISSIVE.has(spdx)) return "permissive";
  if (COPYLEFT.has(spdx)) return "copyleft";
  if (WEAK.has(spdx)) return "weak_copyleft";
  return "unknown";
}

async function main() {
  console.log("📦 freshcrate Dependency Scanner\n");

  ensureDbDir();

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Ensure deps table exists (in case migration hasn't run)
  db.exec(`
    CREATE TABLE IF NOT EXISTS dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      dep_name TEXT NOT NULL, dep_version TEXT NOT NULL DEFAULT '*',
      dep_type TEXT NOT NULL DEFAULT 'runtime', ecosystem TEXT NOT NULL DEFAULT 'unknown',
      license TEXT, license_category TEXT, dep_repo_url TEXT, resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_deps_unique ON dependencies(project_id, ecosystem, dep_name);
  `);

  // Try to add columns if they don't exist
  try { db.exec("ALTER TABLE projects ADD COLUMN deps_scanned_at TEXT"); } catch {}
  try { db.exec("ALTER TABLE projects ADD COLUMN deps_audit_json TEXT"); } catch {}

  let projects;
  if (SINGLE) {
    projects = db.prepare("SELECT id, name, repo_url, license FROM projects WHERE name = ?").all(SINGLE);
  } else if (ALL) {
    projects = db.prepare("SELECT id, name, repo_url, license FROM projects WHERE repo_url LIKE '%github.com%'").all();
  } else {
    projects = db.prepare("SELECT id, name, repo_url, license FROM projects WHERE repo_url LIKE '%github.com%' AND deps_scanned_at IS NULL").all();
  }

  console.log(`Found ${projects.length} packages to scan\n`);

  const insert = db.prepare(
    "INSERT OR REPLACE INTO dependencies (project_id, dep_name, dep_version, dep_type, ecosystem, license, license_category, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  let scanned = 0;
  for (const project of projects) {
    const match = project.repo_url.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
    if (!match) continue;
    const [, owner, repo] = match;
    const repoClean = repo.replace(/\.git$/, "");

    console.log(`🔍 ${project.name} (${owner}/${repoClean})`);

    // Fetch dep files
    let ecosystem = null;
    let allDeps = [];

    for (const filename of SUPPORTED_FILES) {
      const content = await fetchFile(owner, repoClean, filename);
      if (!content) continue;
      const parser = PARSERS[filename];
      if (!parser) continue;
      try {
        const result = parser(content);
        ecosystem = result.ecosystem;
        allDeps.push(...result.deps);
      } catch (e) {
        console.log(`   ⚠ Failed to parse ${filename}: ${e.message}`);
      }
    }

    if (allDeps.length === 0) {
      console.log(`   No dependencies found`);
      db.prepare("UPDATE projects SET deps_scanned_at = ? WHERE id = ?").run(new Date().toISOString(), project.id);
      continue;
    }

    // Dedupe
    const seen = new Set();
    allDeps = allDeps.filter(d => { const k = `${d.name}:${d.type}`; if (seen.has(k)) return false; seen.add(k); return true; });

    // Clear old
    db.prepare("DELETE FROM dependencies WHERE project_id = ?").run(project.id);

    // Resolve licenses in batches
    let resolved = 0;
    for (let i = 0; i < allDeps.length; i += 5) {
      const batch = allDeps.slice(i, i + 5);
      const results = await Promise.all(batch.map(async d => {
        const license = await resolveLicense(ecosystem, d.name);
        return { ...d, license, category: classify(license) };
      }));
      for (const d of results) {
        insert.run(project.id, d.name, d.version, d.type, ecosystem, d.license, d.category, d.license ? new Date().toISOString() : null);
        if (d.license) resolved++;
      }
      await sleep(100);
    }

    // Simple audit
    const deps = db.prepare("SELECT * FROM dependencies WHERE project_id = ?").all(project.id);
    const projCat = classify(project.license);
    const conflicts = [];
    for (const d of deps) {
      if (d.dep_type !== "runtime") continue;
      if (d.license_category === "copyleft" && projCat === "permissive") {
        conflicts.push({ dep_name: d.dep_name, dep_license: d.license, severity: "error", reason: `Copyleft dep in permissive project` });
      }
      if (d.license?.startsWith("AGPL") && !project.license?.startsWith("AGPL")) {
        conflicts.push({ dep_name: d.dep_name, dep_license: d.license, severity: "error", reason: "AGPL network trigger" });
      }
    }

    const audit = {
      total_deps: allDeps.length, resolved, unresolved: allDeps.length - resolved,
      permissive: deps.filter(d => d.license_category === "permissive").length,
      copyleft: deps.filter(d => d.license_category === "copyleft").length,
      weak_copyleft: deps.filter(d => d.license_category === "weak_copyleft").length,
      unknown: deps.filter(d => d.license_category === "unknown" || !d.license_category).length,
      conflicts, score: Math.max(0, 100 - conflicts.filter(c => c.severity === "error").length * 20),
      scanned_at: new Date().toISOString(),
    };

    db.prepare("UPDATE projects SET deps_scanned_at = ?, deps_audit_json = ? WHERE id = ?")
      .run(audit.scanned_at, JSON.stringify(audit), project.id);

    console.log(`   ✅ ${allDeps.length} deps (${resolved} licensed), ${conflicts.length} conflicts`);
    scanned++;
    await sleep(TOKEN ? 200 : 1000);
  }

  console.log(`\n📦 Done! Scanned ${scanned} packages.`);
  db.close();
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
