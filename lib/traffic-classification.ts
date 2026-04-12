import { NextRequest } from "next/server";

export type TrafficType = "human_browser" | "agent_browser" | "api_client" | "crawler_bot";

const CRAWLER_PATTERNS = [
  { pattern: /googlebot/i, family: "Googlebot" },
  { pattern: /bingbot/i, family: "Bingbot" },
  { pattern: /yandex/i, family: "Yandex" },
  { pattern: /baiduspider/i, family: "Baiduspider" },
  { pattern: /semrush/i, family: "Semrush" },
  { pattern: /ahrefs/i, family: "Ahrefs" },
  { pattern: /mj12bot/i, family: "MJ12Bot" },
  { pattern: /bytespider/i, family: "Bytespider" },
  { pattern: /gptbot/i, family: "GPTBot" },
  { pattern: /ccbot/i, family: "CCBot" },
  { pattern: /amazonbot/i, family: "Amazonbot" },
  { pattern: /facebookexternalhit/i, family: "FacebookExternalHit" },
  { pattern: /bot|crawler|spider|scraper|lighthouse/i, family: "Crawler" },
];

const AGENT_PATTERNS = [
  { pattern: /chatgpt/i, family: "ChatGPT" },
  { pattern: /claude/i, family: "Claude" },
  { pattern: /anthropic/i, family: "Anthropic" },
  { pattern: /perplexity/i, family: "Perplexity" },
  { pattern: /openai/i, family: "OpenAI" },
  { pattern: /copilot/i, family: "Copilot" },
  { pattern: /cursor/i, family: "Cursor" },
  { pattern: /cline/i, family: "Cline" },
  { pattern: /windsurf/i, family: "Windsurf" },
  { pattern: /llm/i, family: "LLM Agent" },
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

function browserLike(request: NextRequest, ua: string): boolean {
  const accept = request.headers.get("accept") || "";
  return ua.includes("Mozilla/")
    || accept.includes("text/html")
    || accept.includes("image/")
    || request.headers.has("sec-ch-ua")
    || request.headers.has("sec-fetch-mode");
}

export function classifyTraffic(request: NextRequest, surface: "api" | "page"): { trafficType: TrafficType; uaFamily: string; host: string } {
  const ua = (request.headers.get("user-agent") || "").slice(0, 200);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";

  const crawlerFamily = firstMatch(ua, CRAWLER_PATTERNS);
  if (crawlerFamily) {
    return { trafficType: "crawler_bot", uaFamily: crawlerFamily, host };
  }

  const agentFamily = firstMatch(ua, AGENT_PATTERNS);
  if (agentFamily) {
    return { trafficType: surface === "page" ? "agent_browser" : "api_client", uaFamily: agentFamily, host };
  }

  const apiFamily = firstMatch(ua, API_PATTERNS);
  if (apiFamily) {
    return { trafficType: "api_client", uaFamily: apiFamily, host };
  }

  if (browserLike(request, ua)) {
    return { trafficType: "human_browser", uaFamily: ua.includes("Mozilla/") ? "Browser" : "Unknown Browser", host };
  }

  return { trafficType: surface === "page" ? "agent_browser" : "api_client", uaFamily: ua ? "Unknown Client" : "Unknown", host };
}
