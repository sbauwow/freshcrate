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
const MAX_MANIFEST_PATHS = 25;
const SKIP_PATH_PARTS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next", "vendor", "third_party"]);

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

async function listManifestPaths(owner, repo) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "freshcrate" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, { headers });
    if (!res.ok) return [];
    const tree = (await res.json()).tree || [];
    return tree
      .filter((item) => item && item.type === "blob" && typeof item.path === "string")
      .map((item) => item.path)
      .filter((filePath) => {
        const base = filePath.split("/").pop();
        if (!SUPPORTED_FILES.includes(base)) return false;
        const parts = filePath.split("/");
        return !parts.some((part) => SKIP_PATH_PARTS.has(part));
      })
      .slice(0, MAX_MANIFEST_PATHS);
  } catch {
    return [];
  }
}

async function fetchManifestFiles(owner, repo) {
  const files = {};

  for (const filename of SUPPORTED_FILES) {
    const content = await fetchFile(owner, repo, filename);
    if (content) files[filename] = content;
  }

  const nestedPaths = await listManifestPaths(owner, repo);
  for (const filePath of nestedPaths) {
    if (files[filePath]) continue;
    const content = await fetchFile(owner, repo, filePath);
    if (content) files[filePath] = content;
  }

  return files;
}

function parsePackageJson(content) {
  const pkg = JSON.parse(content);
  const deps = [];
  for (const [name, version] of Object.entries(pkg.dependencies || {})) deps.push({ name, version: String(version), type: "runtime" });
  for (const [name, version] of Object.entries(pkg.devDependencies || {})) deps.push({ name, version: String(version), type: "dev" });
  for (const [name, version] of Object.entries(pkg.peerDependencies || {})) deps.push({ name, version: String(version), type: "peer" });
  for (const [name, version] of Object.entries(pkg.optionalDependencies || {})) deps.push({ name, version: String(version), type: "optional" });
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

function parsePyprojectToml(content) {
  const deps = [];
  const depsMatch = content.match(/\bdependencies\s*=\s*\[([\s\S]*?)\]/);
  if (depsMatch) {
    const entries = depsMatch[1].match(/"([^"]+)"/g) || [];
    for (const entry of entries) {
      const clean = entry.replace(/"/g, "");
      const match = clean.match(/^([a-zA-Z0-9_.-]+)\s*(.*)?$/);
      if (match) deps.push({ name: match[1], version: match[2]?.trim() || "*", type: "runtime" });
    }
  }
  const optMatch = content.match(/\[project\.optional-dependencies\]([\s\S]*?)(?:\n\[|$)/);
  if (optMatch) {
    const entries = optMatch[1].match(/"([^"]+)"/g) || [];
    for (const entry of entries) {
      const clean = entry.replace(/"/g, "");
      const match = clean.match(/^([a-zA-Z0-9_.-]+)/);
      if (match) deps.push({ name: match[1], version: "*", type: "optional" });
    }
  }
  return { ecosystem: "pypi", deps };
}

function parseCargoToml(content) {
  const deps = [];
  const sections = [
    { regex: /\[dependencies\]([\s\S]*?)(?:\n\[|$)/, type: "runtime" },
    { regex: /\[dev-dependencies\]([\s\S]*?)(?:\n\[|$)/, type: "dev" },
    { regex: /\[build-dependencies\]([\s\S]*?)(?:\n\[|$)/, type: "dev" },
  ];
  for (const { regex, type } of sections) {
    const match = content.match(regex);
    if (!match) continue;
    for (const line of match[1].split("\n")) {
      const depMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
      if (depMatch) {
        deps.push({ name: depMatch[1], version: depMatch[2], type });
        continue;
      }
      const tableMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*\{.*version\s*=\s*"([^"]+)"/);
      if (tableMatch) deps.push({ name: tableMatch[1], version: tableMatch[2], type });
    }
  }
  return { ecosystem: "cargo", deps };
}

function parseGoMod(content) {
  const deps = [];
  const requireBlock = content.match(/require\s*\(([\s\S]*?)\)/);
  const lines = requireBlock ? requireBlock[1].split("\n") : content.split("\n");
  for (const line of lines) {
    const match = line.trim().match(/^([\w./\-@]+)\s+(v[\d.]+\S*)/);
    if (match && !match[1].startsWith("//")) deps.push({ name: match[1], version: match[2], type: "runtime" });
  }
  return { ecosystem: "go", deps };
}

const PARSERS = {
  "package.json": parsePackageJson,
  "requirements.txt": parseRequirementsTxt,
  "pyproject.toml": parsePyprojectToml,
  "Cargo.toml": parseCargoToml,
  "go.mod": parseGoMod,
};

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
    if (ecosystem === "cargo") {
      const res = await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`, { headers: { "User-Agent": "freshcrate" } });
      if (!res.ok) return null;
      const data = await res.json();
      return data.crate?.max_version_license || data.versions?.[0]?.license || null;
    }
  } catch {}
  return null;
}

const PERMISSIVE = new Set(["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "Unlicense", "0BSD", "CC0-1.0"]);
const COPYLEFT = new Set(["GPL-2.0", "GPL-2.0-only", "GPL-3.0", "GPL-3.0-only", "AGPL-3.0", "AGPL-3.0-only"]);
const WEAK = new Set(["LGPL-2.1", "LGPL-3.0", "MPL-2.0", "EPL-2.0"]);

function classify(spdx) {
  if (!spdx) return "unknown";
  const normalized = spdx.replace(/-only$/, "").replace(/-or-later$/, "");
  if (PERMISSIVE.has(spdx)) return "permissive";
  if (COPYLEFT.has(spdx)) return "copyleft";
  if (WEAK.has(spdx)) return "weak_copyleft";
  if (PERMISSIVE.has(normalized)) return "permissive";
  if (COPYLEFT.has(normalized)) return "copyleft";
  if (WEAK.has(normalized)) return "weak_copyleft";
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
    let allDeps = [];
    const files = await fetchManifestFiles(owner, repoClean);

    for (const [filePath, content] of Object.entries(files)) {
      const filename = filePath.split("/").pop();
      const parser = PARSERS[filename];
      if (!parser) continue;
      try {
        const result = parser(content);
        allDeps.push(...result.deps.map((dep) => ({ ...dep, ecosystem: result.ecosystem, manifest_path: filePath })));
      } catch (e) {
        console.log(`   ⚠ Failed to parse ${filePath}: ${e.message}`);
      }
    }

    if (allDeps.length === 0) {
      console.log(`   No dependencies found`);
      continue;
    }

    // Dedupe
    const seen = new Set();
    allDeps = allDeps.filter(d => { const k = `${d.ecosystem}:${d.name}:${d.type}`; if (seen.has(k)) return false; seen.add(k); return true; });

    // Clear old
    db.prepare("DELETE FROM dependencies WHERE project_id = ?").run(project.id);

    // Resolve licenses in batches
    let resolved = 0;
    for (let i = 0; i < allDeps.length; i += 5) {
      const batch = allDeps.slice(i, i + 5);
      const results = await Promise.all(batch.map(async d => {
        const license = await resolveLicense(d.ecosystem, d.name);
        return { ...d, license, category: classify(license) };
      }));
      for (const d of results) {
        insert.run(project.id, d.name, d.version, d.type, d.ecosystem, d.license, d.category, d.license ? new Date().toISOString() : null);
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
