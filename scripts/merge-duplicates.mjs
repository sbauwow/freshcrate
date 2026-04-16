#!/usr/bin/env node

import Database from "better-sqlite3";
import { ensureDbDir, getDbPath } from "./lib/db-path.mjs";

const APPLY = process.argv.includes("--apply");
const DB_PATH = getDbPath();

function chooseWinner(rows) {
  return [...rows].sort((a, b) => {
    if ((b.verified || 0) !== (a.verified || 0)) return (b.verified || 0) - (a.verified || 0);
    if ((b.stars || 0) !== (a.stars || 0)) return (b.stars || 0) - (a.stars || 0);
    return a.id - b.id;
  })[0];
}

function main() {
  console.log(`🧹 duplicate merge ${APPLY ? '(APPLY)' : '(DRY RUN)'}`);
  ensureDbDir();
  const db = new Database(DB_PATH);

  const duplicateGroups = db.prepare(`
    SELECT canonical_key, COUNT(*) as c
    FROM projects
    WHERE canonical_key IS NOT NULL AND canonical_key != ''
    GROUP BY canonical_key
    HAVING c > 1
    ORDER BY c DESC
  `).all();

  if (duplicateGroups.length === 0) {
    console.log("No canonical duplicates found.");
    db.close();
    return;
  }

  const updateReleases = db.prepare("UPDATE releases SET project_id = ? WHERE project_id = ?");
  const updateTags = db.prepare("UPDATE OR IGNORE tags SET project_id = ? WHERE project_id = ?");
  const updateDeps = db.prepare("UPDATE dependencies SET project_id = ? WHERE project_id = ?");
  const deleteProject = db.prepare("DELETE FROM projects WHERE id = ?");

  const tx = db.transaction((groups) => {
    for (const g of groups) {
      const rows = db.prepare("SELECT id, name, stars, verified FROM projects WHERE canonical_key = ?").all(g.canonical_key);
      const winner = chooseWinner(rows);
      const losers = rows.filter((r) => r.id !== winner.id);

      for (const loser of losers) {
        updateReleases.run(winner.id, loser.id);
        updateTags.run(winner.id, loser.id);
        updateDeps.run(winner.id, loser.id);
        deleteProject.run(loser.id);
      }
    }
  });

  let totalLosers = 0;
  for (const g of duplicateGroups) totalLosers += g.c - 1;

  console.log(`Duplicate groups: ${duplicateGroups.length}`);
  console.log(`Rows to merge: ${totalLosers}`);

  if (APPLY) {
    tx(duplicateGroups);
    try { db.exec("INSERT INTO projects_fts(projects_fts) VALUES('rebuild')"); } catch {}
    console.log("Merged duplicates and rebuilt FTS.");
  } else {
    console.log("Dry run only. Use --apply to merge.");
  }

  db.close();
}

main();
