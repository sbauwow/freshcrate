#!/usr/bin/env node
/**
 * One-time backfill: populate readme_text from existing readme_html.
 * Run this after migration 012 to get clean plain-text READMEs for FTS.
 *
 * Usage: node scripts/backfill-readme-text.mjs
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDbDir, getDbPath } from "./lib/db-path.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = getDbPath();

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50000);
}

ensureDbDir();

const db = new Database(DB_PATH);

const rows = db.prepare(
  "SELECT id, readme_html FROM projects WHERE readme_html != '' AND (readme_text = '' OR readme_text IS NULL)"
).all();

console.log(`📝 Backfilling readme_text for ${rows.length} projects...`);

const update = db.prepare("UPDATE projects SET readme_text = ? WHERE id = ?");
const txn = db.transaction(() => {
  for (const row of rows) {
    update.run(stripHtml(row.readme_html), row.id);
  }
});
txn();

// Rebuild FTS index
db.exec("INSERT INTO projects_fts(projects_fts) VALUES('rebuild')");

console.log(`✅ Done. ${rows.length} projects backfilled. FTS index rebuilt.`);
db.close();
