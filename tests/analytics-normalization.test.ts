import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTestDb, _resetDb } from "./setup";
import { getEntryPages, getExitPages, getTopTransitions, getTimeOnPage, getTopPages } from "@/lib/analytics";

let db: Database.Database;

function insertPageView(sessionId: string, path: string, createdAt: string) {
  db.prepare(
    "INSERT INTO page_views (path, referrer, ip_hash, user_agent, is_bot, host, traffic_type, ua_family, session_id, event_type, event_target, utm_source, utm_medium, utm_campaign, created_at) VALUES (?, '', ?, 'Mozilla/5.0', 0, 'www.freshcrate.ai', 'browser_shaped', 'Browser', ?, 'pageview', '', '', '', '', ?)"
  ).run(path, `${sessionId}-ip`, sessionId, createdAt);
}

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  _resetDb();
});

describe("analytics path normalization", () => {
  it("collapses legacy UTM-polluted page paths in entry/exit/top page reports", () => {
    insertPageView("sess-1", "/projects/AntennaSim?utm_source=chatgpt.com&utm_medium=referral", "2099-01-01 00:00:00");
    insertPageView("sess-2", "/projects/AntennaSim", "2099-01-01 00:01:00");
    insertPageView("sess-3", "/learn?utm_source=chatgpt.com", "2099-01-01 00:02:00");

    expect(getEntryPages(1, 10)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/projects/AntennaSim", sessions: 2, views: 2 }),
        expect.objectContaining({ path: "/learn", sessions: 1, views: 1 }),
      ])
    );

    expect(getExitPages(1, 10)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/projects/AntennaSim", sessions: 2, views: 2 }),
        expect.objectContaining({ path: "/learn", sessions: 1, views: 1 }),
      ])
    );

    expect(getTopPages(1, 10)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/projects/AntennaSim", views: 2 }),
        expect.objectContaining({ path: "/learn", views: 1 }),
      ])
    );
  });

  it("preserves non-tracking query params while stripping UTM noise", () => {
    insertPageView("sess-1", "/search?q=chi&utm_source=chatgpt.com&utm_campaign=launch", "2099-01-01 00:00:00");
    insertPageView("sess-1", "/projects/AntennaSim?utm_source=chatgpt.com", "2099-01-01 00:00:05");

    expect(getEntryPages(1, 10)[0]).toEqual(expect.objectContaining({ path: "/search?q=chi" }));
    expect(getTopTransitions(1, 10)[0]).toEqual(
      expect.objectContaining({ from_path: "/search?q=chi", to_path: "/projects/AntennaSim" })
    );
  });

  it("aggregates time-on-page by normalized path", () => {
    insertPageView("sess-1", "/projects/AntennaSim?utm_source=chatgpt.com", "2099-01-01 00:00:00");
    insertPageView("sess-1", "/learn", "2099-01-01 00:00:10");
    insertPageView("sess-2", "/projects/AntennaSim", "2099-01-01 00:01:00");
    insertPageView("sess-2", "/learn", "2099-01-01 00:01:20");
    insertPageView("sess-3", "/projects/AntennaSim?utm_medium=referral", "2099-01-01 00:02:00");
    insertPageView("sess-3", "/learn", "2099-01-01 00:02:30");
    insertPageView("sess-4", "/projects/AntennaSim?utm_campaign=launch", "2099-01-01 00:03:00");
    insertPageView("sess-4", "/learn", "2099-01-01 00:03:40");
    insertPageView("sess-5", "/projects/AntennaSim?fbclid=abc", "2099-01-01 00:04:00");
    insertPageView("sess-5", "/learn", "2099-01-01 00:04:50");

    expect(getTimeOnPage(1, 10)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/projects/AntennaSim", views: 5, avg_seconds: 30 }),
      ])
    );
  });
});
