import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getDbPath } from "@/lib/db-path";
import { getGeoAttribution, getReferrerAttribution, getSourceAttribution, getTopPages } from "@/lib/analytics";
import { log } from "@/lib/logger";
import { withRequestLog } from "@/lib/request-log";
import fs from "fs";

function normalize4xxRouteGroup(path: string): string {
  if (path.startsWith("/api/projects/")) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 4 && (parts[3] === "deps" || parts[3] === "verify")) {
      return `/api/projects/[name]/${parts[3]}`;
    }
    if (parts.length >= 3) return "/api/projects/[name]";
  }

  if (path.startsWith("/api/webhooks/")) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 3) return "/api/webhooks/[id]";
  }

  if (path.startsWith("/api/agents/")) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 4 && parts[3] === "attestations") {
      return "/api/agents/[agent_id]/attestations";
    }
  }

  return path;
}

// The `top_4xx_browser_*` panels exist to surface broken links that something
// presenting as a browser walked into, so they read both browser-ish buckets.
// These were `top_4xx_human_browser_*` until 2026-08-06; nothing about the
// underlying rows says "human" (see lib/traffic-classification) and the key
// name was the whole reason the numbers got read as people.
const BROWSER_SHAPED_TYPES = "('browser_shaped', 'browser_unverified')";

function getTrafficWindowSummary(db: ReturnType<typeof getDb>, days: number) {
  const window = `datetime('now', '-${days} day')`;

  const requests = (() => {
    try {
      return (db.prepare(`SELECT COUNT(*) as c FROM request_log WHERE created_at > ${window}`).get() as { c: number }).c;
    } catch {
      return 0;
    }
  })();

  const errors = (() => {
    try {
      return (db.prepare(`SELECT COUNT(*) as c FROM request_log WHERE created_at > ${window} AND status >= 400`).get() as { c: number }).c;
    } catch {
      return 0;
    }
  })();

  const top4xxPaths = (() => {
    try {
      return db.prepare(`SELECT path, COUNT(*) as hits FROM request_log WHERE created_at > ${window} AND status >= 400 AND status < 500 GROUP BY path ORDER BY hits DESC LIMIT 10`).all() as Array<{ path: string; hits: number }>;
    } catch {
      return [] as Array<{ path: string; hits: number }>;
    }
  })();

  const top4xxClients = (() => {
    try {
      return db.prepare(`SELECT ua_family, traffic_type, COUNT(*) as hits FROM request_log WHERE created_at > ${window} AND status >= 400 AND status < 500 GROUP BY ua_family, traffic_type ORDER BY hits DESC LIMIT 10`).all() as Array<{ ua_family: string; traffic_type: string; hits: number }>;
    } catch {
      return [] as Array<{ ua_family: string; traffic_type: string; hits: number }>;
    }
  })();

  const top4xxRouteGroups = (() => {
    try {
      const rows = db.prepare(`SELECT path FROM request_log WHERE created_at > ${window} AND status >= 400 AND status < 500`).all() as Array<{ path: string }>;
      const counts = new Map<string, number>();
      for (const row of rows) {
        const group = normalize4xxRouteGroup(row.path);
        counts.set(group, (counts.get(group) || 0) + 1);
      }
      return Array.from(counts.entries())
        .map(([route_group, hits]) => ({ route_group, hits }))
        .sort((a, b) => b.hits - a.hits || a.route_group.localeCompare(b.route_group))
        .slice(0, 10);
    } catch {
      return [] as Array<{ route_group: string; hits: number }>;
    }
  })();

  const top4xxBrowserPaths = (() => {
    try {
      return db.prepare(`SELECT path, COUNT(*) as hits FROM request_log WHERE created_at > ${window} AND status >= 400 AND status < 500 AND traffic_type IN ${BROWSER_SHAPED_TYPES} GROUP BY path ORDER BY hits DESC LIMIT 10`).all() as Array<{ path: string; hits: number }>;
    } catch {
      return [] as Array<{ path: string; hits: number }>;
    }
  })();

  const top4xxBrowserMethods = (() => {
    try {
      return db.prepare(`SELECT method, COUNT(*) as hits FROM request_log WHERE created_at > ${window} AND status >= 400 AND status < 500 AND traffic_type IN ${BROWSER_SHAPED_TYPES} GROUP BY method ORDER BY hits DESC LIMIT 10`).all() as Array<{ method: string; hits: number }>;
    } catch {
      return [] as Array<{ method: string; hits: number }>;
    }
  })();

  const top4xxBrowserHosts = (() => {
    try {
      return db.prepare(`SELECT COALESCE(NULLIF(host, ''), '(unknown)') as host, COUNT(*) as hits FROM request_log WHERE created_at > ${window} AND status >= 400 AND status < 500 AND traffic_type IN ${BROWSER_SHAPED_TYPES} GROUP BY host ORDER BY hits DESC LIMIT 10`).all() as Array<{ host: string; hits: number }>;
    } catch {
      return [] as Array<{ host: string; hits: number }>;
    }
  })();

  const top4xxBrowserCountries = (() => {
    try {
      return db.prepare(`SELECT COALESCE(NULLIF(country, ''), '(unknown)') as country, COUNT(*) as hits FROM request_log WHERE created_at > ${window} AND status >= 400 AND status < 500 AND traffic_type IN ${BROWSER_SHAPED_TYPES} GROUP BY country ORDER BY hits DESC LIMIT 10`).all() as Array<{ country: string; hits: number }>;
    } catch {
      return [] as Array<{ country: string; hits: number }>;
    }
  })();

  return {
    requests,
    errors,
    top_4xx_paths: top4xxPaths,
    top_4xx_clients: top4xxClients,
    top_4xx_route_groups: top4xxRouteGroups,
    top_4xx_browser_paths: top4xxBrowserPaths,
    top_4xx_browser_methods: top4xxBrowserMethods,
    top_4xx_browser_hosts: top4xxBrowserHosts,
    top_4xx_browser_countries: top4xxBrowserCountries,
  };
}

/**
 * GET /api/metrics — Operational metrics for monitoring.
 * Returns DB size, table counts, API key usage, webhook health, etc.
 * No auth required (data is non-sensitive aggregate stats).
 */
export const GET = withRequestLog(async () => {
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

  const uptimeSeconds = Math.round(process.uptime());
  const traffic1hSummary = getTrafficWindowSummary(db, 1 / 24);
  const traffic24hSummary = getTrafficWindowSummary(db, 1);
  const traffic7dSummary = getTrafficWindowSummary(db, 7);
  const trafficSinceBootSummary = getTrafficWindowSummary(db, uptimeSeconds / 86400);

  let avgDuration = 0;
  try {
    avgDuration = (db.prepare("SELECT AVG(duration_ms) as a FROM request_log WHERE created_at > datetime('now', '-1 day')").get() as { a: number | null }).a || 0;
  } catch { /* table may not exist */ }

  // DB file size
  let dbSizeMb = 0;
  try {
    const stat = fs.statSync(getDbPath());
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

  const topPages = getTopPages(1, 10);

  const topReferrers = (() => {
    try {
      return db.prepare("SELECT referrer, COUNT(*) as views FROM page_views WHERE created_at > datetime('now', '-1 day') AND is_bot = 0 AND referrer != '' GROUP BY referrer ORDER BY views DESC LIMIT 10").all() as Array<{ referrer: string; views: number }>;
    } catch {
      return [] as Array<{ referrer: string; views: number }>;
    }
  })();

  const topSources = (() => {
    try {
      return db.prepare("SELECT COALESCE(NULLIF(utm_source, ''), '(direct)') as source, COUNT(*) as views FROM page_views WHERE created_at > datetime('now', '-1 day') AND is_bot = 0 GROUP BY source ORDER BY views DESC LIMIT 10").all() as Array<{ source: string; views: number }>;
    } catch {
      return [] as Array<{ source: string; views: number }>;
    }
  })();

  const topReferrerSessions = (() => {
    try {
      return getReferrerAttribution(1, 10);
    } catch {
      return [] as Array<{ referrer: string; sessions: number; bounce_rate: number; avg_session_seconds: number }>;
    }
  })();

  const topSourceSessions = (() => {
    try {
      return getSourceAttribution(1, 10);
    } catch {
      return [] as Array<{ source: string; medium: string; campaign: string; sessions: number; bounce_rate: number; avg_session_seconds: number }>;
    }
  })();

  const topCountrySessions = (() => {
    try {
      return getGeoAttribution(1, 10);
    } catch {
      return [] as Array<{ country: string; region: string; city: string; sessions: number }>;
    }
  })();

  const topCountries = (() => {
    try {
      return db.prepare("SELECT COALESCE(NULLIF(country, ''), '(unknown)') as country, COUNT(*) as views FROM page_views WHERE created_at > datetime('now', '-1 day') AND is_bot = 0 GROUP BY country ORDER BY views DESC LIMIT 10").all() as Array<{ country: string; views: number }>;
    } catch {
      return [] as Array<{ country: string; views: number }>;
    }
  })();

  // Traffic breakdown is server-side authoritative (request_log) so bots
  // and API clients — which never fire the JS beacon — show up correctly.
  // page_views was the old source and silently zeroed crawler/agent/api.
  const trafficBreakdown = (() => {
    try {
      return db.prepare("SELECT traffic_type, COUNT(*) as hits FROM request_log WHERE created_at > datetime('now', '-1 day') GROUP BY traffic_type ORDER BY hits DESC").all() as Array<{ traffic_type: string; hits: number }>;
    } catch {
      return [] as Array<{ traffic_type: string; hits: number }>;
    }
  })();

  const topAgents = (() => {
    try {
      return db.prepare("SELECT ua_family, COUNT(*) as hits FROM request_log WHERE created_at > datetime('now', '-1 day') AND traffic_type IN ('ai_agent', 'ai_training', 'agent_browser', 'crawler_bot', 'api_client') GROUP BY ua_family ORDER BY hits DESC LIMIT 10").all() as Array<{ ua_family: string; hits: number }>;
    } catch {
      return [] as Array<{ ua_family: string; hits: number }>;
    }
  })();

  const metrics = {
    timestamp: new Date().toISOString(),
    uptime_seconds: uptimeSeconds,
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

    traffic_1h: {
      requests: traffic1hSummary.requests,
      errors: traffic1hSummary.errors,
      top_4xx_paths: traffic1hSummary.top_4xx_paths,
      top_4xx_clients: traffic1hSummary.top_4xx_clients,
      top_4xx_route_groups: traffic1hSummary.top_4xx_route_groups,
      top_4xx_browser_paths: traffic1hSummary.top_4xx_browser_paths,
      top_4xx_browser_methods: traffic1hSummary.top_4xx_browser_methods,
      top_4xx_browser_hosts: traffic1hSummary.top_4xx_browser_hosts,
      top_4xx_browser_countries: traffic1hSummary.top_4xx_browser_countries,
    },

    traffic_24h: {
      requests: traffic24hSummary.requests,
      errors: traffic24hSummary.errors,
      top_4xx_paths: traffic24hSummary.top_4xx_paths,
      top_4xx_clients: traffic24hSummary.top_4xx_clients,
      top_4xx_route_groups: traffic24hSummary.top_4xx_route_groups,
      top_4xx_browser_paths: traffic24hSummary.top_4xx_browser_paths,
      top_4xx_browser_methods: traffic24hSummary.top_4xx_browser_methods,
      top_4xx_browser_hosts: traffic24hSummary.top_4xx_browser_hosts,
      top_4xx_browser_countries: traffic24hSummary.top_4xx_browser_countries,
      avg_duration_ms: Math.round(avgDuration),
      page_views: (() => { try { return (db.prepare("SELECT COUNT(*) as c FROM page_views WHERE created_at > datetime('now', '-1 day')").get() as { c: number }).c; } catch { return 0; } })(),
      unique_visitors: (() => { try { return (db.prepare("SELECT COUNT(DISTINCT ip_hash) as c FROM page_views WHERE created_at > datetime('now', '-1 day') AND is_bot = 0").get() as { c: number }).c; } catch { return 0; } })(),
      bot_hits: (() => { try { return (db.prepare("SELECT COUNT(*) as c FROM request_log WHERE created_at > datetime('now', '-1 day') AND traffic_type IN ('crawler_bot', 'ai_training')").get() as { c: number }).c; } catch { return 0; } })(),
      traffic_breakdown: trafficBreakdown,
      top_agents: topAgents,
      top_pages: topPages,
      top_referrers: topReferrers,
      top_sources: topSources,
      top_countries: topCountries,
      top_referrer_sessions: topReferrerSessions,
      top_source_sessions: topSourceSessions,
      top_country_sessions: topCountrySessions,
    },

    traffic_since_boot: {
      requests: trafficSinceBootSummary.requests,
      errors: trafficSinceBootSummary.errors,
      top_4xx_paths: trafficSinceBootSummary.top_4xx_paths,
      top_4xx_clients: trafficSinceBootSummary.top_4xx_clients,
      top_4xx_route_groups: trafficSinceBootSummary.top_4xx_route_groups,
      top_4xx_browser_paths: trafficSinceBootSummary.top_4xx_browser_paths,
      top_4xx_browser_methods: trafficSinceBootSummary.top_4xx_browser_methods,
      top_4xx_browser_hosts: trafficSinceBootSummary.top_4xx_browser_hosts,
      top_4xx_browser_countries: trafficSinceBootSummary.top_4xx_browser_countries,
    },

    traffic_7d: {
      requests: traffic7dSummary.requests,
      errors: traffic7dSummary.errors,
      top_4xx_paths: traffic7dSummary.top_4xx_paths,
      top_4xx_clients: traffic7dSummary.top_4xx_clients,
      top_4xx_route_groups: traffic7dSummary.top_4xx_route_groups,
      top_4xx_browser_paths: traffic7dSummary.top_4xx_browser_paths,
      top_4xx_browser_methods: traffic7dSummary.top_4xx_browser_methods,
      top_4xx_browser_hosts: traffic7dSummary.top_4xx_browser_hosts,
      top_4xx_browser_countries: traffic7dSummary.top_4xx_browser_countries,
    },
  };

  log.info("traffic_metrics", {
    requests_24h: metrics.traffic_24h.requests,
    errors_24h: metrics.traffic_24h.errors,
    avg_duration_ms_24h: metrics.traffic_24h.avg_duration_ms,
    page_views_24h: metrics.traffic_24h.page_views,
    unique_visitors_24h: metrics.traffic_24h.unique_visitors,
    bot_hits_24h: metrics.traffic_24h.bot_hits,
    browser_shaped_24h: trafficBreakdown.find((row) => row.traffic_type === "browser_shaped")?.hits || 0,
    browser_unverified_24h: trafficBreakdown.find((row) => row.traffic_type === "browser_unverified")?.hits || 0,
    agent_browser_24h: trafficBreakdown.find((row) => row.traffic_type === "agent_browser")?.hits || 0,
    ai_agent_24h: trafficBreakdown.find((row) => row.traffic_type === "ai_agent")?.hits || 0,
    ai_training_24h: trafficBreakdown.find((row) => row.traffic_type === "ai_training")?.hits || 0,
    api_client_24h: trafficBreakdown.find((row) => row.traffic_type === "api_client")?.hits || 0,
    crawler_bot_24h: trafficBreakdown.find((row) => row.traffic_type === "crawler_bot")?.hits || 0,
    top_agent_24h: topAgents[0]?.ua_family || null,
    top_agent_hits_24h: topAgents[0]?.hits || 0,
    top_4xx_path_24h: metrics.traffic_24h.top_4xx_paths[0]?.path || null,
    top_4xx_hits_24h: metrics.traffic_24h.top_4xx_paths[0]?.hits || 0,
    top_4xx_client_24h: metrics.traffic_24h.top_4xx_clients[0]?.ua_family || null,
    top_4xx_client_type_24h: metrics.traffic_24h.top_4xx_clients[0]?.traffic_type || null,
    top_4xx_route_group_24h: metrics.traffic_24h.top_4xx_route_groups[0]?.route_group || null,
    top_4xx_route_group_hits_24h: metrics.traffic_24h.top_4xx_route_groups[0]?.hits || 0,
    top_page_24h: metrics.traffic_24h.top_pages[0]?.path || null,
    top_page_views_24h: metrics.traffic_24h.top_pages[0]?.views || 0,
    top_referrer_24h: metrics.traffic_24h.top_referrers[0]?.referrer || null,
    top_referrer_views_24h: metrics.traffic_24h.top_referrers[0]?.views || 0,
  });

  return NextResponse.json(metrics);
});
