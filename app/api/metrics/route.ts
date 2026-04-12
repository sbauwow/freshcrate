import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { log } from "@/lib/logger";
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

  const topPages = (() => {
    try {
      return db.prepare("SELECT path, COUNT(*) as views FROM page_views WHERE created_at > datetime('now', '-1 day') AND is_bot = 0 GROUP BY path ORDER BY views DESC LIMIT 10").all() as Array<{ path: string; views: number }>;
    } catch {
      return [] as Array<{ path: string; views: number }>;
    }
  })();

  const topReferrers = (() => {
    try {
      return db.prepare("SELECT referrer, COUNT(*) as views FROM page_views WHERE created_at > datetime('now', '-1 day') AND is_bot = 0 AND referrer != '' GROUP BY referrer ORDER BY views DESC LIMIT 10").all() as Array<{ referrer: string; views: number }>;
    } catch {
      return [] as Array<{ referrer: string; views: number }>;
    }
  })();

  const trafficBreakdown = (() => {
    try {
      return db.prepare("SELECT traffic_type, COUNT(*) as hits FROM page_views WHERE created_at > datetime('now', '-1 day') GROUP BY traffic_type ORDER BY hits DESC").all() as Array<{ traffic_type: string; hits: number }>;
    } catch {
      return [] as Array<{ traffic_type: string; hits: number }>;
    }
  })();

  const topAgents = (() => {
    try {
      return db.prepare("SELECT ua_family, COUNT(*) as hits FROM page_views WHERE created_at > datetime('now', '-1 day') AND traffic_type IN ('agent_browser', 'crawler_bot', 'api_client') GROUP BY ua_family ORDER BY hits DESC LIMIT 10").all() as Array<{ ua_family: string; hits: number }>;
    } catch {
      return [] as Array<{ ua_family: string; hits: number }>;
    }
  })();

  const metrics = {
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
      traffic_breakdown: trafficBreakdown,
      top_agents: topAgents,
      top_pages: topPages,
      top_referrers: topReferrers,
    },
  };

  log.info("traffic_metrics", {
    requests_24h: metrics.traffic_24h.requests,
    errors_24h: metrics.traffic_24h.errors,
    avg_duration_ms_24h: metrics.traffic_24h.avg_duration_ms,
    page_views_24h: metrics.traffic_24h.page_views,
    unique_visitors_24h: metrics.traffic_24h.unique_visitors,
    bot_hits_24h: metrics.traffic_24h.bot_hits,
    human_browser_24h: trafficBreakdown.find((row) => row.traffic_type === "human_browser")?.hits || 0,
    agent_browser_24h: trafficBreakdown.find((row) => row.traffic_type === "agent_browser")?.hits || 0,
    api_client_24h: trafficBreakdown.find((row) => row.traffic_type === "api_client")?.hits || 0,
    crawler_bot_24h: trafficBreakdown.find((row) => row.traffic_type === "crawler_bot")?.hits || 0,
    top_agent_24h: topAgents[0]?.ua_family || null,
    top_agent_hits_24h: topAgents[0]?.hits || 0,
    top_page_24h: metrics.traffic_24h.top_pages[0]?.path || null,
    top_page_views_24h: metrics.traffic_24h.top_pages[0]?.views || 0,
    top_referrer_24h: metrics.traffic_24h.top_referrers[0]?.referrer || null,
    top_referrer_views_24h: metrics.traffic_24h.top_referrers[0]?.views || 0,
  });

  return NextResponse.json(metrics);
}
