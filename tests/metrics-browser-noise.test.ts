import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { NextRequest } from "next/server";
import { classifyTraffic } from "@/lib/traffic-classification";

function build(headers: Record<string, string>): NextRequest {
  return new NextRequest("https://www.freshcrate.ai/", { headers: new Headers(headers) });
}

describe("metrics browser-noise diagnostics", () => {
  it("exposes browser-shaped 4xx breakdowns in metrics route", () => {
    const metricsRoute = fs.readFileSync(path.join(process.cwd(), "app", "api", "metrics", "route.ts"), "utf-8");

    expect(metricsRoute).toContain("top_4xx_browser_paths");
    expect(metricsRoute).toContain("top_4xx_browser_methods");
    expect(metricsRoute).toContain("top_4xx_browser_hosts");
    expect(metricsRoute).toContain("top_4xx_browser_countries");
    // Both browser-ish buckets, so a client that lands in browser_unverified
    // still shows up when it walks into a broken link.
    expect(metricsRoute).toContain("'browser_shaped', 'browser_unverified'");
  });

  it("reports the browser_unverified bucket alongside browser_shaped", () => {
    const metricsRoute = fs.readFileSync(path.join(process.cwd(), "app", "api", "metrics", "route.ts"), "utf-8");

    expect(metricsRoute).toContain("browser_unverified_24h");
    expect(metricsRoute).toContain("browser_shaped_24h");
  });

  it("hardens browser classification so weak Mozilla-like requests are not treated as human browsers", () => {
    const weak = build({
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en-US,en;q=0.9",
    });

    expect(classifyTraffic(weak, "page").trafficType).not.toBe("browser_shaped");
  });

  it("still recognises a real browser as human", () => {
    const real = build({
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en-US,en;q=0.9",
      "sec-ch-ua": '"Chromium";v="133", "Not(A:Brand";v="24"',
      "sec-fetch-mode": "navigate",
    });

    expect(classifyTraffic(real, "page").trafficType).toBe("browser_shaped");
  });
});
