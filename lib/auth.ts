import { createHash, randomBytes } from "crypto";
import { getDb } from "./db";

export interface ApiKey {
  id: number;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string;
  requests_today: number;
  rate_limit: number;
  last_request_date: string | null;
  created_at: string;
  revoked_at: string | null;
}

/**
 * Hash an API key using SHA-256.
 */
function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Generate a new API key. Returns the raw key (show once) and stores the hash.
 * Key format: fc_<32 random hex chars> (prefix "fc_" for easy identification)
 */
export function createApiKey(name: string, rateLimit = 100): { key: string; id: number } {
  const db = getDb();
  const raw = `fc_${randomBytes(16).toString("hex")}`;
  const hash = hashKey(raw);
  const prefix = raw.slice(0, 7); // "fc_xxxx" — enough to identify without exposing

  const result = db
    .prepare(
      "INSERT INTO api_keys (name, key_hash, key_prefix, rate_limit) VALUES (?, ?, ?, ?)"
    )
    .run(name, hash, prefix, rateLimit);

  return { key: raw, id: result.lastInsertRowid as number };
}

/**
 * Validate an API key. Returns the key record if valid, null if invalid/revoked/rate-limited.
 * Also increments the daily request counter.
 */
export function validateApiKey(rawKey: string): { valid: true; key: ApiKey } | { valid: false; error: string } {
  const db = getDb();
  const hash = hashKey(rawKey);

  const row = db
    .prepare("SELECT * FROM api_keys WHERE key_hash = ?")
    .get(hash) as ApiKey | undefined;

  if (!row) {
    return { valid: false, error: "Invalid API key" };
  }

  if (row.revoked_at) {
    return { valid: false, error: "API key has been revoked" };
  }

  // Rate limiting — reset counter daily
  const today = new Date().toISOString().slice(0, 10);
  if (row.last_request_date !== today) {
    db.prepare(
      "UPDATE api_keys SET requests_today = 1, last_request_date = ? WHERE id = ?"
    ).run(today, row.id);
  } else {
    if (row.requests_today >= row.rate_limit) {
      return { valid: false, error: `Rate limit exceeded (${row.rate_limit}/day)` };
    }
    db.prepare(
      "UPDATE api_keys SET requests_today = requests_today + 1 WHERE id = ?"
    ).run(row.id);
  }

  return { valid: true, key: row };
}

/**
 * List all API keys (without hashes, for admin display).
 */
export function listApiKeys(): Omit<ApiKey, "key_hash">[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, name, key_prefix, scopes, requests_today, rate_limit, last_request_date, created_at, revoked_at FROM api_keys ORDER BY created_at DESC"
    )
    .all() as Omit<ApiKey, "key_hash">[];
}

/**
 * Revoke an API key by ID.
 */
export function revokeApiKey(id: number): boolean {
  const db = getDb();
  const result = db
    .prepare("UPDATE api_keys SET revoked_at = datetime('now') WHERE id = ? AND revoked_at IS NULL")
    .run(id);
  return result.changes > 0;
}

/**
 * Check if any API keys exist. Used to determine if auth should be enforced.
 * When no keys exist (fresh install), write endpoints are open.
 */
export function hasApiKeys(): boolean {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as c FROM api_keys WHERE revoked_at IS NULL").get() as { c: number };
  return row.c > 0;
}

/**
 * Extract Bearer token from Authorization header.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
