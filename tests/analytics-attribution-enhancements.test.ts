import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTestDb, _resetDb } from "./setup";
import {
  getAttributionQuality,
  getLandingPagesBySource,
  getSourceLandingMatrix,
} from "@/lib/analytics";

let db: Database.Database;

function insertPageView(row: {
  sessionId: string;
  path: string;
  createdAt: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}) {
  db.prepare(
    "INSERT INTO page_views (path, referrer, ip_hash, user_agent, is_bot, host, traffic_type, ua_family, session_id, event_type, event_target, utm_source, utm_medium, utm_campaign, created_at) VALUES (?, ?, ?, 'Mozilla/5.0', 0, 'www.freshcrate.ai', 'browser_shaped', 'Browser', ?, 'pageview', '', ?, ?, ?, ?)"
  ).run(
    row.path,
    row.referrer || "",
    `${row.sessionId}-ip`,
    row.sessionId,
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

describe("analytics attribution enhancements", () => {
  beforeEach(() => {
    insertPageView({
      sessionId: "s1",
      path: "/projects/AntennaSim?utm_source=chatgpt.com",
      createdAt: "2099-01-01 00:00:00",
      referrer: "chatgpt.com",
      utmSource: "chatgpt.com",
      utmMedium: "referral",
      utmCampaign: "launch",
    });
    insertPageView({
      sessionId: "s2",
      path: "/learn?utm_source=reddit",
      createdAt: "2099-01-01 00:01:00",
      referrer: "reddit.com",
      utmSource: "reddit",
      utmMedium: "social",
      utmCampaign: "january",
    });
    insertPageView({
      sessionId: "s3",
      path: "/search?q=chi",
      createdAt: "2099-01-01 00:02:00",
      referrer: "google.com",
    });
    insertPageView({
      sessionId: "s4",
      path: "/",
      createdAt: "2099-01-01 00:03:00",
    });
  });

  it("reports landing pages by source with normalized paths", () => {
    expect(getLandingPagesBySource(1, 10)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "chatgpt.com",
          landing_path: "/projects/AntennaSim",
          sessions: 1,
        }),
        expect.objectContaining({
          source: "reddit",
          landing_path: "/learn",
          sessions: 1,
        }),
        expect.objectContaining({
          source: "(direct)",
          landing_path: "/",
          sessions: 1,
        }),
      ])
    );
  });

  it("builds a source x landing matrix from first-touch sessions", () => {
    expect(getSourceLandingMatrix(1, 10)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "chatgpt.com", landing_path: "/projects/AntennaSim", sessions: 1 }),
        expect.objectContaining({ source: "reddit", landing_path: "/learn", sessions: 1 }),
        expect.objectContaining({ source: "(direct)", landing_path: "/", sessions: 1 }),
      ])
    );
  });

  it("summarizes attribution quality across sessions", () => {
    expect(getAttributionQuality(1)).toEqual(
      expect.objectContaining({
        total_sessions: 4,
        sessions_with_utm: 2,
        sessions_with_external_referrer: 3,
        sessions_direct: 1,
        sessions_attributed: 3,
        sessions_unattributed: 1,
      })
    );
  });
});
