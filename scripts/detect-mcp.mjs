#!/usr/bin/env node
// Detect MCP compatibility signals from readme text. Writes projects.mcp_json.
//
// Usage:
//   node scripts/detect-mcp.mjs              # detect for all candidate projects
//   node scripts/detect-mcp.mjs --dry-run    # print only

import Database from "better-sqlite3";
import { getDbPath } from "./lib/db-path.mjs";
import { detectMcpManifest, looksLikeMcpServer } from "./lib/mcp-detect.mjs";

const DRY_RUN = process.argv.includes("--dry-run");
const DB_PATH = getDbPath();

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Candidates: anything tagged or described as MCP. We still filter again via
// looksLikeMcpServer() to avoid false positives from the SQL LIKE.
const projects = db.prepare(
  `SELECT p.id, p.name, p.short_desc, p.description, p.category, p.readme_text, p.language,
          (SELECT GROUP_CONCAT(tag, ' ') FROM tags WHERE project_id = p.id) AS tags
   FROM projects p
   WHERE p.category = 'MCP Servers'
      OR p.name LIKE '%mcp%'
      OR p.description LIKE '%MCP%'
      OR p.short_desc LIKE '%MCP%'`
).all();

const update = db.prepare(
  `UPDATE projects SET mcp_json = ?, mcp_detected_at = ? WHERE id = ?`
);

let detected = 0;
let skipped = 0;
for (const p of projects) {
  if (!looksLikeMcpServer(p)) { skipped++; continue; }
  const manifest = detectMcpManifest(p);
  if (!manifest) { skipped++; continue; }

  if (DRY_RUN) {
    console.log(
      `${p.name.padEnd(30)} transports=${manifest.transports.join(",") || "-"} ` +
      `auth=${manifest.auth.join(",") || "-"} runtime=${manifest.runtime.join(",") || "-"} ` +
      `hosting=${manifest.hosting.join(",") || "-"}`
    );
  } else {
    update.run(JSON.stringify(manifest), manifest.detected_at, p.id);
  }
  detected++;
}

console.log(`[detect-mcp] ${DRY_RUN ? "would update" : "updated"} ${detected}, skipped ${skipped}`);
db.close();
