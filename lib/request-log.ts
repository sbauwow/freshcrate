import crypto from "crypto";
import { getDb } from "./db";
import { log } from "./logger";
import { NextRequest } from "next/server";

/** Module-level request counter for periodic pruning. */
let requestCount = 0;

/**
 * Hash an IP address with a daily-rotating salt.
 * Allows same-day correlation (e.g. rate-limit abuse detection)
 * without storing raw IP addresses (GDPR compliance).
 */
function hashIp(ip: string): string {
  if (!ip) return "";
  const salt = "freshcrate-" + new Date().toISOString().slice(0, 10);
  return crypto.createHash("sha256").update(salt + ip).digest("hex").slice(0, 16);
}

/**
 * Log an API request to the database and structured logger.
 * Call at the end of each API route handler.
 */
export function logRequest(
  request: NextRequest,
  status: number,
  startTime: number,
  apiKeyPrefix?: string
) {
  const duration = Date.now() - startTime;
  const path = request.nextUrl.pathname;
  const method = request.method;
  const rawIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "";
  const ip = hashIp(rawIp);
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 200);

  // Structured log to stdout (uses hashed IP, not raw)
  log.request({ method, path, status, duration_ms: duration, ip, user_agent: userAgent, api_key_prefix: apiKeyPrefix });

  // Persist to DB (async-safe, fire and forget)
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO request_log (method, path, status, duration_ms, ip, user_agent, api_key_prefix)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(method, path, status, duration, ip, userAgent, apiKeyPrefix || null);
  } catch {
    // Don't let logging failures break the API
  }

  // Prune old logs every 1000 requests
  requestCount++;
  if (requestCount % 1000 === 0) {
    pruneRequestLog();
  }
}

/**
 * Prune old request logs (keep last 30 days).
 * Called automatically every 1000 requests, or manually from a cron job / startup.
 */
export function pruneRequestLog(days = 30) {
  try {
    const db = getDb();
    const result = db
      .prepare(`DELETE FROM request_log WHERE created_at < datetime('now', '-' || ? || ' days')`)
      .run(days);
    if (result.changes > 0) {
      log.info("request_log_pruned", { deleted: result.changes, retention_days: days });
    }
  } catch {
    // Silently fail
  }
}
