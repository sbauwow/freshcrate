import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTestDb, _resetDb } from "./setup";
import {
  getLandingPageConversion,
  getSourceConversionBreakdown,
  getSourceFunnel,
} from "@/lib/analytics";

let db: Database.Database;

function insertEvent(row: {
  sessionId: string;
  path: string;
  createdAt: string;
  eventType?: string;
  eventTarget?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}) {
  db.prepare(
    "INSERT INTO page_views (path, referrer, ip_hash, user_agent, is_bot, host, traffic_type, ua_family, session_id, event_type, event_target, utm_source, utm_medium, utm_campaign, created_at) VALUES (?, ?, ?, 'Mozilla/5.0', 0, 'www.freshcrate.ai', 'browser_shaped', 'Browser', ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    row.path,
    row.referrer || "",
    `${row.sessionId}-ip`,
    row.sessionId,
    row.eventType || "pageview",
    row.eventTarget || "",
    row.utmSource || "",
    row.utmMedium || "",
    row.utmCampaign || "",
    row.createdAt,
  );
}

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  _resetDb();
});

describe("analytics conversion breakdowns", () => {
  beforeEach(() => {
    insertEvent({ sessionId: "s1", path: "/projects/A?utm_source=chatgpt.com", createdAt: "2099-01-01 00:00:00", referrer: "chatgpt.com", utmSource: "chatgpt.com", utmMedium: "referral", utmCampaign: "launch" });
    insertEvent({ sessionId: "s1", path: "/search?q=vesc", createdAt: "2099-01-01 00:00:10", eventType: "search", eventTarget: "search:header" });
    insertEvent({ sessionId: "s1", path: "/projects/A", createdAt: "2099-01-01 00:00:20", eventType: "outbound", eventTarget: "repo:github.com@project" });

    insertEvent({ sessionId: "s2", path: "/projects/A", createdAt: "2099-01-01 00:01:00", referrer: "chatgpt.com", utmSource: "chatgpt.com", utmMedium: "referral", utmCampaign: "launch" });
    insertEvent({ sessionId: "s2", path: "/projects/A", createdAt: "2099-01-01 00:01:10", eventType: "search", eventTarget: "search:header" });

    insertEvent({ sessionId: "s3", path: "/learn?utm_source=reddit", createdAt: "2099-01-01 00:02:00", referrer: "reddit.com", utmSource: "reddit", utmMedium: "social", utmCampaign: "jan" });

    insertEvent({ sessionId: "s4", path: "/learn", createdAt: "2099-01-01 00:03:00" });
    insertEvent({ sessionId: "s4", path: "/learn", createdAt: "2099-01-01 00:03:20", eventType: "outbound", eventTarget: "repo:github.com@learn" });
  });

  it("reports source-level search/outbound conversion", () => {
    expect(getSourceConversionBreakdown(1, 10)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "chatgpt.com",
          sessions: 2,
          with_search: 2,
          with_outbound_or_install: 1,
        }),
        expect.objectContaining({
          source: "reddit",
          sessions: 1,
          with_search: 0,
          with_outbound_or_install: 0,
        }),
        expect.objectContaining({
          source: "(direct)",
          sessions: 1,
          with_search: 0,
          with_outbound_or_install: 1,
        }),
      ])
    );
  });

  it("keeps the source funnel on first-touch attribution even if later events carry a different utm source", () => {
    insertEvent({
      sessionId: "s5",
      path: "/projects/B?utm_source=chatgpt.com",
      createdAt: "2099-01-01 00:04:00",
      referrer: "chatgpt.com",
      utmSource: "chatgpt.com",
      utmMedium: "referral",
      utmCampaign: "launch",
    });
    insertEvent({
      sessionId: "s5",
      path: "/search?q=agent",
      createdAt: "2099-01-01 00:04:10",
      eventType: "search",
      eventTarget: "search:header",
      utmSource: "reddit",
      utmMedium: "social",
      utmCampaign: "late-touch",
    });

    expect(getSourceFunnel(1, 10)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "chatgpt.com",
          sessions: 3,
          with_search: 3,
          with_outbound_or_install: 1,
        }),
        expect.not.objectContaining({
          source: "reddit",
          sessions: 2,
        }),
      ])
    );
  });

  it("reports landing-page conversion with normalized paths", () => {
    expect(getLandingPageConversion(1, 10)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          landing_path: "/projects/A",
          sessions: 2,
          with_search: 2,
          with_outbound_or_install: 1,
        }),
        expect.objectContaining({
          landing_path: "/learn",
          sessions: 2,
          with_search: 0,
          with_outbound_or_install: 1,
        }),
      ])
    );
  });
});
