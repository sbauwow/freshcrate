#!/usr/bin/env node
// Compute canonical_key for projects that don't have one. Idempotent; safe to
// re-run. Required before merge-duplicates.mjs can group cross-source projects.
//
// Usage:
//   node scripts/backfill-canonical.mjs              # write
//   node scripts/backfill-canonical.mjs --dry-run

import Database from "better-sqlite3";
import { getDbPath } from "./lib/db-path.mjs";
import { buildCanonicalKey } from "./lib/canonical-id.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const DB_PATH = getDbPath();

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const rows = db.prepare(
  `SELECT id, name, repo_url, homepage_url, source_type
   FROM projects
   WHERE canonical_key IS NULL OR canonical_key = ''`
).all();

const update = db.prepare("UPDATE projects SET canonical_key = ? WHERE id = ?");

let n = 0;
for (const r of rows) {
  const key = buildCanonicalKey({
    sourceType: r.source_type || "github",
    name: r.name,
    repoUrl: r.repo_url,
    homepageUrl: r.homepage_url,
  });
  if (!key) continue;
  if (DRY_RUN) {
    console.log(`${r.name.padEnd(30)} -> ${key}`);
  } else {
    try {
      update.run(key, r.id);
    } catch (e) {
      // unique constraint: another project already has this canonical_key
      console.warn(`[skip] ${r.name}: ${e.message}`);
      continue;
    }
  }
  n++;
}

console.log(`[backfill-canonical] ${DRY_RUN ? "would set" : "set"} ${n} canonical keys`);
db.close();
