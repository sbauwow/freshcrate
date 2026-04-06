import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

/**
 * GET /api/beacon — 1x1 transparent GIF page view tracker.
 *
 * Loaded as an <img> in the layout. Logs:
 *   - Path (from Referer header)
 *   - Hashed IP (daily rotating salt, same as request_log)
 *   - User-Agent (truncated)
 *   - Bot detection
 *   - Referrer (external only)
 *
 * No cookies. No JS. No PII stored. GDPR-safe.
 */

// 1x1 transparent GIF (43 bytes)
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

const BOT_PATTERNS = /bot|crawler|spider|scraper|curl|wget|python|go-http|java|fetch|headless|phantom|lighthouse|googlebot|bingbot|yandex|baidu|semrush|ahrefs|mj12/i;

function hashIp(ip: string): string {
  const salt = "freshcrate-" + new Date().toISOString().slice(0, 10);
  return crypto.createHash("sha256").update(salt + ip).digest("hex").slice(0, 16);
}

export async function GET(request: NextRequest) {
  try {
    const referer = request.headers.get("referer") || "";
    const ua = (request.headers.get("user-agent") || "").slice(0, 200);
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip") || "";

    // Extract path from referer (internal pages)
    let path = "/";
    try {
      const url = new URL(referer);
      if (url.hostname.includes("freshcrate")) {
        path = url.pathname;
      }
    } catch {
      // Invalid referer, use "/"
    }

    // External referrer (for traffic source tracking)
    let externalRef = "";
    try {
      const url = new URL(referer);
      if (!url.hostname.includes("freshcrate")) {
        externalRef = url.hostname;
      }
    } catch {
      // no referrer
    }

    const isBot = BOT_PATTERNS.test(ua) ? 1 : 0;
    const ipHash = hashIp(ip);

    const db = getDb();
    db.prepare(
      "INSERT INTO page_views (path, referrer, ip_hash, user_agent, is_bot) VALUES (?, ?, ?, ?, ?)"
    ).run(path, externalRef, ipHash, ua, isBot);
  } catch {
    // Never let tracking break the page
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": PIXEL.length.toString(),
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Expires": "Thu, 01 Jan 1970 00:00:00 GMT",
    },
  });
}
