import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { classifyTraffic } from "@/lib/traffic-classification";

const CHROME_133 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";
const CHROME_103 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36";
const SAFARI_17 = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

function build(headers: Record<string, string>): NextRequest {
  const h = new Headers(headers);
  return new NextRequest("https://www.freshcrate.ai/", { headers: h });
}

describe("classifyTraffic — declared bots", () => {
  it("classifies Amazonbot as ai_training", () => {
    const r = build({ "user-agent": "Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)" });
    expect(classifyTraffic(r, "page")).toEqual(expect.objectContaining({ trafficType: "ai_training", uaFamily: "Amazonbot" }));
  });

  it("classifies Bingbot as crawler_bot", () => {
    const r = build({ "user-agent": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)" });
    expect(classifyTraffic(r, "page")).toEqual(expect.objectContaining({ trafficType: "crawler_bot", uaFamily: "Bingbot" }));
  });
});

describe("classifyTraffic — SpoofedChromeUA", () => {
  it("flags Chrome UA missing both sec-ch-ua and sec-fetch-mode", () => {
    const r = build({ "user-agent": CHROME_133, accept: "text/html" });
    expect(classifyTraffic(r, "page")).toEqual({
      trafficType: "crawler_bot",
      uaFamily: "SpoofedChromeUA",
      host: "",
    });
  });

  it("flags stale Chrome UA missing both sec-* headers", () => {
    const r = build({ "user-agent": CHROME_103, accept: "text/html" });
    expect(classifyTraffic(r, "page").trafficType).toBe("crawler_bot");
  });

  it("does NOT flag real Chrome (sends both sec-ch-ua and sec-fetch-mode)", () => {
    const r = build({
      "user-agent": CHROME_133,
      accept: "text/html",
      "sec-ch-ua": '"Chromium";v="133", "Not(A:Brand";v="24"',
      "sec-fetch-mode": "navigate",
    });
    expect(classifyTraffic(r, "page").trafficType).toBe("browser_shaped");
  });

  it("classifies a Chrome UA with only sec-fetch-mode and no accept-language as crawler noise", () => {
    const r = build({
      "user-agent": CHROME_133,
      accept: "text/html",
      "sec-fetch-mode": "navigate",
    });
    expect(classifyTraffic(r, "page")).toEqual(expect.objectContaining({
      trafficType: "crawler_bot",
      uaFamily: "BrowserLikeWeakSignals",
    }));
  });

  it("classifies a Chrome UA with only sec-ch-ua and no accept-language as crawler noise", () => {
    const r = build({
      "user-agent": CHROME_133,
      accept: "text/html",
      "sec-ch-ua": '"Chromium";v="133"',
    });
    expect(classifyTraffic(r, "page")).toEqual(expect.objectContaining({
      trafficType: "crawler_bot",
      uaFamily: "BrowserLikeWeakSignals",
    }));
  });

  it("keeps a Chrome UA with accept-language and sec-fetch-mode as browser_shaped", () => {
    const r = build({
      "user-agent": CHROME_133,
      accept: "text/html",
      "accept-language": "en-US,en;q=0.9",
      "sec-fetch-mode": "navigate",
    });
    expect(classifyTraffic(r, "page").trafficType).toBe("browser_shaped");
  });

  it("does NOT misclassify a Googlebot UA that happens to mention Chrome", () => {
    const r = build({
      "user-agent": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/120.0.0.0 Safari/537.36",
    });
    expect(classifyTraffic(r, "page").uaFamily).toBe("Googlebot");
  });
});

describe("classifyTraffic — well-formed clients still pass", () => {
  it("classifies curl as api_client", () => {
    const r = build({ "user-agent": "curl/8.4.0" });
    expect(classifyTraffic(r, "api")).toEqual(expect.objectContaining({ trafficType: "api_client", uaFamily: "curl" }));
  });

  it("classifies a browser-like request with no language or sec-* hints as crawler_bot", () => {
    const r = build({
      "user-agent": SAFARI_17,
      accept: "text/html",
    });
    expect(classifyTraffic(r, "page")).toEqual(expect.objectContaining({ trafficType: "crawler_bot", uaFamily: "BrowserLikeWeakSignals" }));
  });

  it("classifies a non-Chrome browser UA with no engine signals as browser_unverified", () => {
    const r = build({
      "user-agent": SAFARI_17,
      accept: "text/html",
      "accept-language": "en-US,en;q=0.9",
    });
    expect(classifyTraffic(r, "page")).toEqual(expect.objectContaining({
      trafficType: "browser_unverified",
      uaFamily: "Browser",
    }));
  });
});

describe("classifyTraffic — browser_unverified", () => {
  // The regression this bucket exists for: these are the default headers of
  // every HTTP scraping library, and they used to read as browser_shaped.
  it("does not count default scraper headers as human", () => {
    const r = build({
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en-US,en;q=0.9",
    });
    expect(classifyTraffic(r, "page").trafficType).toBe("browser_unverified");
  });

  it("promotes to browser_shaped once the request carries an fc_sid session", () => {
    const r = build({
      "user-agent": SAFARI_17,
      accept: "text/html",
      "accept-language": "en-US,en;q=0.9",
      cookie: "fc_theme=modern; fc_sid=8f14e45fceea167a5a36dedd4bea2543; fc_lang=en",
    });
    expect(classifyTraffic(r, "page").trafficType).toBe("browser_shaped");
  });

  it("ignores an fc_sid that is not shaped like a session id", () => {
    const r = build({
      "user-agent": SAFARI_17,
      accept: "text/html",
      "accept-language": "en-US,en;q=0.9",
      cookie: "fc_sid=; fc_theme=modern",
    });
    expect(classifyTraffic(r, "page").trafficType).toBe("browser_unverified");
  });

  it("does not let a forged fc_sid buy a spoofed Chrome UA past the bot gate", () => {
    const r = build({
      "user-agent": CHROME_133,
      accept: "text/html",
      "accept-language": "en-US,en;q=0.9",
      cookie: "fc_sid=8f14e45fceea167a5a36dedd4bea2543",
    });
    expect(classifyTraffic(r, "page")).toEqual(expect.objectContaining({
      trafficType: "crawler_bot",
      uaFamily: "SpoofedChromeUA",
    }));
  });

  it("still classifies declared crawlers ahead of the browser buckets", () => {
    const r = build({
      "user-agent": "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
      accept: "text/html",
      "accept-language": "en-US,en;q=0.9",
      cookie: "fc_sid=8f14e45fceea167a5a36dedd4bea2543",
    });
    expect(classifyTraffic(r, "page").trafficType).toBe("crawler_bot");
  });
});
