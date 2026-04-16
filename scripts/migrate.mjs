#!/usr/bin/env node

/**
 * Standalone migration runner for freshcrate.
 * Usage: node scripts/migrate.mjs
 */

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDbDir, getDbPath } from "./lib/db-path.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const DB_PATH = getDbPath();
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, "migrations");

function runMigrations(db) {
  // Ensure the migrations tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log("[migrate] No migrations/ directory found.");
    return;
  }

  // Read and sort .sql files
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("[migrate] No migration files found.");
    return;
  }

  // Get already-applied migrations
  const applied = new Set(
    db.prepare("SELECT name FROM _migrations").all().map((row) => row.name)
  );

  let count = 0;

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");

    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
    });

    applyMigration();
    count++;
    console.log(`[migrate] Applied: ${file}`);
  }

  if (count === 0) {
    console.log("[migrate] All migrations already applied.");
  } else {
    console.log(`[migrate] Done. Applied ${count} migration(s).`);
  }
}

// Main
console.log(`[migrate] Database: ${DB_PATH}`);
ensureDbDir();
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

try {
  runMigrations(db);
} finally {
  db.close();
}
