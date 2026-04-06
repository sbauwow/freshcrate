import { getDb } from "./db";
import { log } from "./logger";
import { NextRequest } from "next/server";

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
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "";
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 200);

  // Structured log to stdout
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
}

/**
 * Prune old request logs (keep last 30 days).
 * Call from a cron job or on startup.
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
