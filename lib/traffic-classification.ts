import { NextRequest } from "next/server";

export type TrafficType =
  | "human_browser"
  | "browser_unverified"
  | "agent_browser"
  | "ai_agent"
  | "ai_training"
  | "api_client"
  | "crawler_bot";

// AI products that fetch pages live to answer a user's prompt. Highest-signal
// traffic — every hit is a human-driven request bouncing through an LLM.
const AI_LIVE_PATTERNS = [
  { pattern: /chatgpt-user/i, family: "ChatGPT-User" },
  { pattern: /oai-searchbot/i, family: "OAI-SearchBot" },
  { pattern: /perplexitybot/i, family: "PerplexityBot" },
  { pattern: /perplexity-user/i, family: "Perplexity-User" },
  { pattern: /claude-web/i, family: "Claude-Web" },
  { pattern: /claude-user/i, family: "Claude-User" },
  { pattern: /chatgpt-image/i, family: "ChatGPT-Image" },
  { pattern: /youbot|you\.com/i, family: "YouBot" },
  { pattern: /phindbot/i, family: "PhindBot" },
];

// AI corpus / model-training crawlers and search-index ingest. Lower per-hit
// value than ai_agent but the input shape that decides whether you appear in
// future LLM answers at all.
const AI_TRAINING_PATTERNS = [
  { pattern: /gptbot/i, family: "GPTBot" },
  { pattern: /claudebot/i, family: "ClaudeBot" },
  { pattern: /anthropic-ai/i, family: "anthropic-ai" },
  { pattern: /google-extended/i, family: "Google-Extended" },
  { pattern: /applebot-extended/i, family: "Applebot-Extended" },
  { pattern: /ccbot/i, family: "CCBot" },
  { pattern: /bytespider/i, family: "Bytespider" },
  { pattern: /amazonbot/i, family: "Amazonbot" },
  { pattern: /diffbot/i, family: "Diffbot" },
  { pattern: /omgilibot/i, family: "Omgilibot" },
  { pattern: /cohere-ai/i, family: "cohere-ai" },
  { pattern: /meta-externalagent/i, family: "Meta-ExternalAgent" },
  { pattern: /meta-externalfetcher/i, family: "Meta-ExternalFetcher" },
  { pattern: /facebookbot/i, family: "FacebookBot" },
];

const CRAWLER_PATTERNS = [
  { pattern: /googlebot/i, family: "Googlebot" },
  { pattern: /googleother/i, family: "GoogleOther" },
  { pattern: /google-(?:inspectiontool|cloudvertexbot|site-?verification)/i, family: "Google" },
  { pattern: /bingbot/i, family: "Bingbot" },
  { pattern: /yandex/i, family: "Yandex" },
  { pattern: /baiduspider/i, family: "Baiduspider" },
  { pattern: /duckduckbot/i, family: "DuckDuckBot" },
  { pattern: /applebot/i, family: "Applebot" },
  { pattern: /semrush/i, family: "Semrush" },
  { pattern: /ahrefs/i, family: "Ahrefs" },
  { pattern: /mj12bot/i, family: "MJ12Bot" },
  { pattern: /facebookexternalhit/i, family: "FacebookExternalHit" },
  { pattern: /bot|crawler|spider|scraper|lighthouse/i, family: "Crawler" },
];

// IDE / coding agents driven by a developer locally. Distinct from ai_agent
// (consumer AI products) — these get bucketed as agent_browser/api_client so
// existing dashboards keep working.
const AGENT_PATTERNS = [
  { pattern: /copilot/i, family: "Copilot" },
  { pattern: /cursor/i, family: "Cursor" },
  { pattern: /cline/i, family: "Cline" },
  { pattern: /windsurf/i, family: "Windsurf" },
  { pattern: /\bllm\b|llm-agent/i, family: "LLM Agent" },
];

const API_PATTERNS = [
  { pattern: /^curl\//i, family: "curl" },
  { pattern: /^wget\//i, family: "wget" },
  { pattern: /python-requests|python-httpx|aiohttp/i, family: "Python HTTP" },
  { pattern: /go-http-client/i, family: "Go HTTP" },
  { pattern: /node|undici|axios|postmanruntime/i, family: "Node HTTP" },
  { pattern: /java\//i, family: "Java HTTP" },
  { pattern: /okhttp/i, family: "OkHttp" },
  { pattern: /insomnia/i, family: "Insomnia" },
];

function firstMatch(ua: string, patterns: Array<{ pattern: RegExp; family: string }>): string | null {
  for (const entry of patterns) {
    if (entry.pattern.test(ua)) return entry.family;
  }
  return null;
}

type HeaderSource = { get(name: string): string | null; has?(name: string): boolean };

function hasHeader(headers: HeaderSource, name: string): boolean {
  return headers.has?.(name) ?? headers.get(name) !== null;
}

function browserLike(headers: HeaderSource, ua: string): boolean {
  const accept = headers.get("accept") || "";
  return ua.includes("Mozilla/")
    || accept.includes("text/html")
    || accept.includes("image/")
    || hasHeader(headers, "sec-ch-ua")
    || hasHeader(headers, "sec-fetch-mode");
}

/**
 * Fetch metadata (`Sec-Fetch-*`) and UA client hints (`Sec-CH-UA*`) are the only
 * header signals a scraper cannot cheaply fake its way past by copying a UA
 * string, because they are set by the browser engine, not the caller. Every
 * engine still shipping sends at least one: Chrome 76+, Firefox 90+, Safari
 * 16.4+.
 *
 * This used to also accept `Mozilla/` + `text/html` + `accept-language`, which
 * is the exact header set every HTTP scraping library emits by default. On
 * 2026-08-06 that branch put 13,559 hits/24h into `human_browser` against 45
 * real beacon page views — a ~300x overcount that made every human-traffic
 * number downstream fiction. Header shape alone cannot carry this decision.
 */
function hasEngineSignals(headers: HeaderSource): boolean {
  const hasSecFetch = hasHeader(headers, "sec-fetch-mode") || hasHeader(headers, "sec-fetch-site") || hasHeader(headers, "sec-fetch-dest");
  const hasClientHints = hasHeader(headers, "sec-ch-ua") || hasHeader(headers, "sec-ch-ua-mobile") || hasHeader(headers, "sec-ch-ua-platform");
  return hasSecFetch || hasClientHints;
}

const SESSION_COOKIE_RE = /(?:^|;\s*)fc_sid=([a-f0-9-]{16,64})(?:;|$)/i;

/**
 * A request carrying `fc_sid` has already loaded the layout's beacon pixel on a
 * previous hit and been handed the cookie back — a subresource fetch plus a
 * cookie round-trip that plain HTML scrapers do not perform. This is what keeps
 * pre-16.4 Safari and other engines with no fetch metadata classified as human
 * from their second page view on, rather than being demoted forever.
 *
 * Corroboration only: it promotes a browser-shaped request, and deliberately
 * runs after the SpoofedChromeUA gate so a forged cookie cannot buy a scraper
 * pool its way back past the 429.
 */
function hasVerifiedSession(headers: HeaderSource): boolean {
  return SESSION_COOKIE_RE.test(headers.get("cookie") || "");
}

/**
 * Harder call than `browser_unverified`: a browser-shaped request that asks for
 * HTML while sending no `accept-language` at all. Every shipping engine sends
 * one, so its absence — unlike missing fetch metadata — has no legitimate
 * explanation. These stay `crawler_bot` and stay subject to the /search
 * throttle.
 */
function looksLikeSuspiciousBrowserLike(headers: HeaderSource, ua: string): boolean {
  if (!ua.includes("Mozilla/")) return false;
  const accept = headers.get("accept") || "";
  const wantsHtml = accept.includes("text/html") || accept.includes("application/xhtml+xml");
  const hasAcceptLanguage = !!(headers.get("accept-language") || "").trim();
  const hasSecFetch = hasHeader(headers, "sec-fetch-mode") || hasHeader(headers, "sec-fetch-site") || hasHeader(headers, "sec-fetch-dest");
  const hasClientHints = hasHeader(headers, "sec-ch-ua") || hasHeader(headers, "sec-ch-ua-mobile") || hasHeader(headers, "sec-ch-ua-platform");
  if (!wantsHtml || hasAcceptLanguage) return false;
  return !(hasSecFetch && hasClientHints);
}

/**
 * Real Chrome >= 89 always sends `sec-ch-ua` AND `sec-fetch-mode` on top-level
 * navigations. A request claiming `Chrome/<n>` that sends neither is a scraper
 * pool spoofing a desktop browser. Requiring *both* absent (not either) avoids
 * false-positives on privacy extensions that strip one of the two.
 */
function looksLikeSpoofedChrome(headers: HeaderSource, ua: string): boolean {
  if (!/Chrome\/\d+/i.test(ua)) return false;
  const hasSecCh = hasHeader(headers, "sec-ch-ua");
  const hasSecFetch = hasHeader(headers, "sec-fetch-mode");
  return !hasSecCh && !hasSecFetch;
}

export function classifyHeaders(headers: HeaderSource, surface: "api" | "page"): { trafficType: TrafficType; uaFamily: string; host: string } {
  const ua = (headers.get("user-agent") || "").slice(0, 200);
  const host = headers.get("x-forwarded-host") || headers.get("host") || "";

  // Order matters: AI live > AI training > generic crawler. Without this,
  // the catch-all "bot|crawler|spider" in CRAWLER_PATTERNS swallows
  // ChatGPT-User and Perplexity (their UA strings end with "+...openai.com/bot").
  const aiLiveFamily = firstMatch(ua, AI_LIVE_PATTERNS);
  if (aiLiveFamily) {
    return { trafficType: "ai_agent", uaFamily: aiLiveFamily, host };
  }

  const aiTrainingFamily = firstMatch(ua, AI_TRAINING_PATTERNS);
  if (aiTrainingFamily) {
    return { trafficType: "ai_training", uaFamily: aiTrainingFamily, host };
  }

  const crawlerFamily = firstMatch(ua, CRAWLER_PATTERNS);
  if (crawlerFamily) {
    return { trafficType: "crawler_bot", uaFamily: crawlerFamily, host };
  }

  const agentFamily = firstMatch(ua, AGENT_PATTERNS);
  if (agentFamily) {
    return { trafficType: surface === "page" ? "agent_browser" : "api_client", uaFamily: agentFamily, host };
  }

  if (looksLikeSpoofedChrome(headers, ua)) {
    return { trafficType: "crawler_bot", uaFamily: "SpoofedChromeUA", host };
  }

  const apiFamily = firstMatch(ua, API_PATTERNS);
  if (apiFamily) {
    return { trafficType: "api_client", uaFamily: apiFamily, host };
  }

  if (looksLikeSuspiciousBrowserLike(headers, ua)) {
    return { trafficType: "crawler_bot", uaFamily: "BrowserLikeWeakSignals", host };
  }

  if (browserLike(headers, ua)) {
    if (hasEngineSignals(headers) || hasVerifiedSession(headers)) {
      return { trafficType: "human_browser", uaFamily: ua.includes("Mozilla/") ? "Browser" : "Unknown Browser", host };
    }
    // Browser-shaped, but nothing here was produced by a browser engine: a UA
    // string, an accept header and a language are all caller-supplied. Real but
    // ancient engines and default-configured scrapers are indistinguishable at
    // this point, so bucket them apart from both instead of guessing. Not
    // counted as human, and not gated as a bot either — the /search throttle
    // and the spoofed-UA 429 both stay off this bucket, so a genuine old
    // browser still gets served and can earn `human_browser` via fc_sid.
    return { trafficType: "browser_unverified", uaFamily: ua.includes("Mozilla/") ? "Browser" : "Unknown Browser", host };
  }

  return { trafficType: surface === "page" ? "agent_browser" : "api_client", uaFamily: ua ? "Unknown Client" : "Unknown", host };
}

export function classifyTraffic(request: NextRequest, surface: "api" | "page") {
  return classifyHeaders(request.headers, surface);
}
