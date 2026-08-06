import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { classifyTraffic } from "@/lib/traffic-classification";
import { extractGeo } from "@/lib/geo";
import crypto from "crypto";

/**
 * GET /api/beacon — page view + custom event tracker.
 *
 * Fired from client JS: PageViewBeacon requests it via `new Image()` inside a
 * useEffect on every route change, and custom events (clicks, installs,
 * outbound, search) append `?e=<type>&t=<target>`. There is no <img> in the
 * server-rendered HTML, so nothing reaches this route without executing
 * JavaScript — which is exactly why page_views is the only human-ish number
 * here, and why it reads ~300x below the browser-shaped request_log buckets.
 *
 * Logs:
 *   - Path (from `p` param or Referer header)
 *   - Hashed IP (daily rotating salt, same as request_log)
 *   - User-Agent (truncated)
 *   - Bot detection
 *   - External referrer
 *   - Anonymous session id (HttpOnly cookie, 30-day rolling)
 *   - Event type + target
 *
 * No PII. GDPR-safe. Cookie is HttpOnly (no JS access) and stores only a
 * random UUID, not anything user-identifying.
 */

// 1x1 transparent GIF (43 bytes)
const PIXEL = Uint8Array.from(Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
));

const BOT_PATTERNS = /bot|crawler|spider|scraper|curl|wget|python|go-http|java|fetch|headless|phantom|lighthouse|googlebot|bingbot|yandex|baidu|semrush|ahrefs|mj12/i;

const SESSION_COOKIE = "fc_sid";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const SESSION_ID_RE = /^[a-f0-9-]{16,64}$/i;

const ALLOWED_EVENTS = new Set([
  "pageview",
  "click",
  "install",
  "copy",
  "search",
  "outbound",
  "submit",
  "share",
  "render_404",
  "render_500",
]);

function hashIp(ip: string): string {
  const salt = "freshcrate-" + new Date().toISOString().slice(0, 10);
  return crypto.createHash("sha256").update(salt + ip).digest("hex").slice(0, 16);
}

function sanitizeEvent(raw: string | null): string {
  if (!raw) return "pageview";
  const v = raw.toLowerCase().slice(0, 32);
  return ALLOWED_EVENTS.has(v) ? v : "pageview";
}

function sanitizeTarget(raw: string | null): string {
  if (!raw) return "";
  return raw.replace(/[^\w./:@\-]/g, "").slice(0, 200);
}

function sanitizeUtm(raw: string | null): string {
  if (!raw) return "";
  return raw.toLowerCase().replace(/[^a-z0-9_\-.:]/g, "").slice(0, 80);
}

function sanitizeReferrerHost(raw: string | null): string {
  if (!raw) return "";
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    return host.includes("freshcrate") ? "" : host.slice(0, 120);
  } catch {
    return raw.toLowerCase().replace(/[^a-z0-9.\-]/g, "").slice(0, 120);
  }
}

function stripTrackingParams(pathWithQuery: string): {
  cleanPath: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
} {
  try {
    const u = new URL(pathWithQuery, "https://freshcrate.ai");
    const utmSource = sanitizeUtm(u.searchParams.get("utm_source"));
    const utmMedium = sanitizeUtm(u.searchParams.get("utm_medium"));
    const utmCampaign = sanitizeUtm(u.searchParams.get("utm_campaign"));

    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "msclkid",
    ].forEach((k) => u.searchParams.delete(k));

    const query = u.searchParams.toString();
    const cleanPath = query ? `${u.pathname}?${query}` : u.pathname;
    return { cleanPath, utmSource, utmMedium, utmCampaign };
  } catch {
    return { cleanPath: pathWithQuery, utmSource: "", utmMedium: "", utmCampaign: "" };
  }
}

export async function GET(request: NextRequest) {
  try {
    const referer = request.headers.get("referer") || "";
    const ua = (request.headers.get("user-agent") || "").slice(0, 200);
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip") || "";

    // Prefer explicit path param, then fall back to internal referer path
    let rawPath = request.nextUrl.searchParams.get("p") || "/";
    if (!rawPath.startsWith("/")) rawPath = "/";
    if (rawPath === "/") {
      try {
        const url = new URL(referer);
        if (url.hostname.includes("freshcrate")) {
          rawPath = url.pathname + (url.search || "");
        }
      } catch {
        // Invalid referer, keep "/"
      }
    }

    const { cleanPath: path, utmSource: pathUtmSource, utmMedium: pathUtmMedium, utmCampaign: pathUtmCampaign } = stripTrackingParams(rawPath);
    const explicitReferrer = sanitizeReferrerHost(request.nextUrl.searchParams.get("r"));
    const utmSource = sanitizeUtm(request.nextUrl.searchParams.get("us")) || pathUtmSource;
    const utmMedium = sanitizeUtm(request.nextUrl.searchParams.get("um")) || pathUtmMedium;
    const utmCampaign = sanitizeUtm(request.nextUrl.searchParams.get("uc")) || pathUtmCampaign;

    // External referrer (for traffic source tracking)
    let externalRef = explicitReferrer;
    if (!externalRef) {
      try {
        const url = new URL(referer);
        if (!url.hostname.includes("freshcrate")) {
          externalRef = sanitizeReferrerHost(url.hostname);
        }
      } catch {
        // no referrer
      }
    }

    const { trafficType, uaFamily, host } = classifyTraffic(request, "page");
    const { country, region, city } = extractGeo(request);
    const isBot = trafficType === "crawler_bot" || BOT_PATTERNS.test(ua) ? 1 : 0;
    const ipHash = hashIp(ip);

    const eventType = sanitizeEvent(request.nextUrl.searchParams.get("e"));
    const eventTarget = sanitizeTarget(request.nextUrl.searchParams.get("t"));

    const existingSid = request.cookies.get(SESSION_COOKIE)?.value;
    const sessionId = existingSid && SESSION_ID_RE.test(existingSid)
      ? existingSid
      : crypto.randomUUID();

    const db = getDb();
    db.prepare(
      "INSERT INTO page_views (path, referrer, ip_hash, user_agent, is_bot, host, traffic_type, ua_family, session_id, event_type, event_target, utm_source, utm_medium, utm_campaign, country, region, city) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      path,
      externalRef,
      ipHash,
      ua,
      isBot,
      host,
      trafficType,
      uaFamily,
      sessionId,
      eventType,
      eventTarget,
      utmSource,
      utmMedium,
      utmCampaign,
      country,
      region,
      city,
    );

    const response = new NextResponse(PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": PIXEL.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Expires": "Thu, 01 Jan 1970 00:00:00 GMT",
      },
    });

    // Refresh cookie on every hit so active visitors keep their session id.
    if (!isBot) {
      response.cookies.set({
        name: SESSION_COOKIE,
        value: sessionId,
        maxAge: SESSION_MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        path: "/",
      });
    }

    return response;
  } catch {
    // Never let tracking break the page
    return new NextResponse(PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": PIXEL.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  }
}
