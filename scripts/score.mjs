#!/usr/bin/env node
// Compute health/trust score for all projects. Writes projects.health_score
// and projects.health_json. Pulls signals from existing tables; new signal
// sources plug into scripts/lib/health.mjs.
//
// Usage:
//   node scripts/score.mjs              # score all projects
//   node scripts/score.mjs --dry-run    # print only, don't write

import Database from "better-sqlite3";
import { getDbPath } from "./lib/db-path.mjs";
import { computeHealth } from "./lib/health.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const DB_PATH = getDbPath();

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const projects = db.prepare(
  `SELECT id, name, license, stars, verification_json FROM projects`
).all();

const getLatestRelease = db.prepare(
  `SELECT created_at FROM releases
   WHERE project_id = ?
   ORDER BY datetime(created_at) DESC
   LIMIT 1`
);

const update = db.prepare(
  `UPDATE projects
   SET health_score = ?, health_json = ?, health_computed_at = ?
   WHERE id = ?`
);

function parseVerificationChecks(json) {
  if (!json || json === "{}") return null;
  try {
    const data = JSON.parse(json);
    return Array.isArray(data.checks) ? data.checks : null;
  } catch {
    return null;
  }
}

let n = 0;
for (const p of projects) {
  const latest = getLatestRelease.get(p.id);
  const signals = {
    last_release_at: latest?.created_at || null,
    verification_checks: parseVerificationChecks(p.verification_json),
    license: p.license,
    stars: p.stars,
  };
  const result = computeHealth(signals);

  if (DRY_RUN) {
    console.log(`${p.name.padEnd(30)} score=${result.score}`);
  } else {
    update.run(result.score, JSON.stringify(result), result.computed_at, p.id);
  }
  n++;
}

console.log(`[score] ${DRY_RUN ? "would update" : "updated"} ${n} projects`);
db.close();
