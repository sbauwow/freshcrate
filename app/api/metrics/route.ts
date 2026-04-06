import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";

/**
 * GET /api/metrics — Operational metrics for monitoring.
 * Returns DB size, table counts, API key usage, webhook health, etc.
 * No auth required (data is non-sensitive aggregate stats).
 */
export async function GET() {
  const db = getDb();

  // Table counts
  const projects = (db.prepare("SELECT COUNT(*) as c FROM projects").get() as { c: number }).c;
  const releases = (db.prepare("SELECT COUNT(*) as c FROM releases").get() as { c: number }).c;
  const tags = (db.prepare("SELECT COUNT(*) as c FROM tags").get() as { c: number }).c;
  const verified = (db.prepare("SELECT COUNT(*) as c FROM projects WHERE verified = 1").get() as { c: number }).c;

  // API keys
  let activeKeys = 0;
  let totalRequests = 0;
  try {
    activeKeys = (db.prepare("SELECT COUNT(*) as c FROM api_keys WHERE revoked_at IS NULL").get() as { c: number }).c;
    totalRequests = (db.prepare("SELECT SUM(requests_today) as s FROM api_keys").get() as { s: number | null }).s || 0;
  } catch { /* table may not exist */ }

  // Webhooks
  let activeWebhooks = 0;
  let failedWebhooks = 0;
  try {
    activeWebhooks = (db.prepare("SELECT COUNT(*) as c FROM webhooks WHERE active = 1").get() as { c: number }).c;
    failedWebhooks = (db.prepare("SELECT COUNT(*) as c FROM webhooks WHERE active = 0").get() as { c: number }).c;
  } catch { /* table may not exist */ }

  // Watched topics
  let watchedTopics = 0;
  try {
    watchedTopics = (db.prepare("SELECT COUNT(*) as c FROM watched_topics WHERE active = 1").get() as { c: number }).c;
  } catch { /* table may not exist */ }

  // Request log (last 24h)
  let requests24h = 0;
  let errors24h = 0;
  let avgDuration = 0;
  try {
    requests24h = (db.prepare("SELECT COUNT(*) as c FROM request_log WHERE created_at > datetime('now', '-1 day')").get() as { c: number }).c;
    errors24h = (db.prepare("SELECT COUNT(*) as c FROM request_log WHERE created_at > datetime('now', '-1 day') AND status >= 400").get() as { c: number }).c;
    avgDuration = (db.prepare("SELECT AVG(duration_ms) as a FROM request_log WHERE created_at > datetime('now', '-1 day')").get() as { a: number | null }).a || 0;
  } catch { /* table may not exist */ }

  // DB file size
  let dbSizeMb = 0;
  try {
    const dbPath = path.join(process.cwd(), "freshcrate.db");
    const stat = fs.statSync(dbPath);
    dbSizeMb = Math.round(stat.size / 1024 / 1024 * 10) / 10;
  } catch { /* file may not exist */ }

  // Migrations applied
  let migrations = 0;
  try {
    migrations = (db.prepare("SELECT COUNT(*) as c FROM _migrations").get() as { c: number }).c;
  } catch { /* table may not exist */ }

  // FTS health
  let ftsRows = 0;
  try {
    ftsRows = (db.prepare("SELECT COUNT(*) as c FROM projects_fts").get() as { c: number }).c;
  } catch { /* FTS may not exist */ }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.round(process.uptime()),
    memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),

    database: {
      size_mb: dbSizeMb,
      migrations,
      fts_rows: ftsRows,
      fts_synced: ftsRows === projects,
    },

    content: {
      projects,
      releases,
      tags,
      verified,
      avg_releases_per_project: releases > 0 ? Math.round(releases / projects * 10) / 10 : 0,
    },

    api: {
      active_keys: activeKeys,
      requests_today: totalRequests,
    },

    webhooks: {
      active: activeWebhooks,
      failed: failedWebhooks,
    },

    topics: {
      watched: watchedTopics,
    },

    traffic_24h: {
      requests: requests24h,
      errors: errors24h,
      avg_duration_ms: Math.round(avgDuration),
      page_views: (() => { try { return (db.prepare("SELECT COUNT(*) as c FROM page_views WHERE created_at > datetime('now', '-1 day')").get() as { c: number }).c; } catch { return 0; } })(),
      unique_visitors: (() => { try { return (db.prepare("SELECT COUNT(DISTINCT ip_hash) as c FROM page_views WHERE created_at > datetime('now', '-1 day') AND is_bot = 0").get() as { c: number }).c; } catch { return 0; } })(),
      bot_hits: (() => { try { return (db.prepare("SELECT COUNT(*) as c FROM page_views WHERE created_at > datetime('now', '-1 day') AND is_bot = 1").get() as { c: number }).c; } catch { return 0; } })(),
      top_pages: (() => { try { return db.prepare("SELECT path, COUNT(*) as views FROM page_views WHERE created_at > datetime('now', '-1 day') AND is_bot = 0 GROUP BY path ORDER BY views DESC LIMIT 10").all(); } catch { return []; } })(),
      top_referrers: (() => { try { return db.prepare("SELECT referrer, COUNT(*) as views FROM page_views WHERE created_at > datetime('now', '-1 day') AND is_bot = 0 AND referrer != '' GROUP BY referrer ORDER BY views DESC LIMIT 10").all(); } catch { return []; } })(),
    },
  });
}
