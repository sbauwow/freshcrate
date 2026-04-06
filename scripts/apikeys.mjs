#!/usr/bin/env node
/**
 * freshcrate API Key Management CLI
 *
 * Usage:
 *   node scripts/apikeys.mjs create "My Agent"       # create a key
 *   node scripts/apikeys.mjs create "Bot" --limit 50  # with custom rate limit
 *   node scripts/apikeys.mjs list                      # list all keys
 *   node scripts/apikeys.mjs revoke <id>               # revoke a key
 */

import Database from "better-sqlite3";
import { createHash, randomBytes } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "freshcrate.db");

function hashKey(key) {
  return createHash("sha256").update(key).digest("hex");
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Ensure table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    scopes TEXT NOT NULL DEFAULT 'write',
    requests_today INTEGER NOT NULL DEFAULT 0,
    rate_limit INTEGER NOT NULL DEFAULT 100,
    last_request_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT
  );
`);

const [,, command, ...args] = process.argv;

switch (command) {
  case "create": {
    const name = args[0];
    if (!name) {
      console.error("Usage: node scripts/apikeys.mjs create <name> [--limit N]");
      process.exit(1);
    }
    const limitIdx = args.indexOf("--limit");
    const rateLimit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) || 100 : 100;

    const raw = `fc_${randomBytes(16).toString("hex")}`;
    const hash = hashKey(raw);
    const prefix = raw.slice(0, 7);

    const result = db
      .prepare("INSERT INTO api_keys (name, key_hash, key_prefix, rate_limit) VALUES (?, ?, ?, ?)")
      .run(name, hash, prefix, rateLimit);

    console.log("");
    console.log("  ┌─────────────────────────────────────────────────┐");
    console.log("  │  API Key Created                                │");
    console.log("  ├─────────────────────────────────────────────────┤");
    console.log(`  │  Name:       ${name.padEnd(35)}│`);
    console.log(`  │  ID:         ${String(result.lastInsertRowid).padEnd(35)}│`);
    console.log(`  │  Rate Limit: ${String(rateLimit + "/day").padEnd(35)}│`);
    console.log("  ├─────────────────────────────────────────────────┤");
    console.log(`  │  Key: ${raw.padEnd(42)}│`);
    console.log("  ├─────────────────────────────────────────────────┤");
    console.log("  │  ⚠ Save this key now — it cannot be shown again │");
    console.log("  └─────────────────────────────────────────────────┘");
    console.log("");
    console.log(`  Use: curl -H "Authorization: Bearer ${raw}" ...`);
    console.log("");
    break;
  }

  case "list": {
    const keys = db
      .prepare(
        "SELECT id, name, key_prefix, scopes, requests_today, rate_limit, last_request_date, created_at, revoked_at FROM api_keys ORDER BY created_at DESC"
      )
      .all();

    if (keys.length === 0) {
      console.log("\n  No API keys found. Create one with: node scripts/apikeys.mjs create <name>\n");
      break;
    }

    console.log("");
    console.log("  ID  Prefix   Name                 Rate       Status    Created");
    console.log("  ──  ───────  ───────────────────  ─────────  ────────  ──────────");
    for (const k of keys) {
      const status = k.revoked_at ? "REVOKED" : "ACTIVE";
      const rate = `${k.requests_today}/${k.rate_limit}`;
      console.log(
        `  ${String(k.id).padEnd(4)}${k.key_prefix.padEnd(9)}${k.name.slice(0, 20).padEnd(21)}${rate.padEnd(11)}${status.padEnd(10)}${k.created_at.slice(0, 10)}`
      );
    }
    console.log("");
    break;
  }

  case "revoke": {
    const id = parseInt(args[0]);
    if (!id) {
      console.error("Usage: node scripts/apikeys.mjs revoke <id>");
      process.exit(1);
    }
    const result = db
      .prepare("UPDATE api_keys SET revoked_at = datetime('now') WHERE id = ? AND revoked_at IS NULL")
      .run(id);
    if (result.changes > 0) {
      console.log(`\n  ✅ API key ${id} revoked.\n`);
    } else {
      console.log(`\n  ⚠ Key ${id} not found or already revoked.\n`);
    }
    break;
  }

  default:
    console.log(`
  freshcrate API Key Management

  Commands:
    create <name> [--limit N]   Create a new API key
    list                        List all API keys
    revoke <id>                 Revoke an API key

  Examples:
    node scripts/apikeys.mjs create "My Agent"
    node scripts/apikeys.mjs create "CI Bot" --limit 50
    node scripts/apikeys.mjs list
    node scripts/apikeys.mjs revoke 3
`);
}

db.close();
