import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getGovernanceIssues,
  getLegislation,
  getLegislationFilterOptions,
  getLegislationSummary,
  getOperatorPlaybook,
} from "@/lib/legislation";
import { getDb } from "@/lib/db";
import { createTestDb, _resetDb } from "./setup";

describe("legislation dataset", () => {
  beforeEach(() => {
    createTestDb();
  });

  afterEach(() => {
    _resetDb();
  });

  it("returns non-empty summary counts", () => {
    const summary = getLegislationSummary();
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.inForce + summary.approvedPending + summary.negotiatedOrProposed).toBeLessThanOrEqual(summary.total);
  });

  it("returns valid filter options", () => {
    const options = getLegislationFilterOptions();
    expect(options.regions.length).toBeGreaterThan(0);
    expect(options.statuses.length).toBeGreaterThan(0);
    expect(options.themes.length).toBeGreaterThan(0);
  });

  it("filters by region", () => {
    const rows = getLegislation({ region: "Europe" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.region === "Europe")).toBe(true);
  });

  it("filters by keyword query", () => {
    const rows = getLegislation({ q: "foundation" });
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.some(
        (r) =>
          r.issues.join(" ").toLowerCase().includes("foundation") ||
          r.summary.toLowerCase().includes("foundation") ||
          r.themes.some((t) => t.toLowerCase().includes("foundation"))
      )
    ).toBe(true);
  });

  it("filters by theme + status composition", () => {
    const rows = getLegislation({ status: "in_force", theme: "transparency" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.status === "in_force" && r.themes.includes("transparency"))).toBe(true);
  });

  it("filters governance issues by region", () => {
    const rows = getGovernanceIssues("Europe");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.regions.includes("Global") || r.regions.includes("Europe"))).toBe(true);
  });

  it("builds actionable operator playbook", () => {
    const playbook = getOperatorPlaybook({ region: "Europe", q: "foundation" });
    expect(playbook.score).toBeGreaterThan(0);
    expect(playbook.actions.length).toBeGreaterThan(0);
    expect(playbook.actions.some((a) => a.evidence.length > 0)).toBe(true);
  });

  it("merges DB-ingested items with hardcoded anchors", () => {
    const baseline = getLegislationSummary().total;

    getDb()
      .prepare(
        `INSERT INTO legislation_items
         (id, source, jurisdiction, region, instrument, status, effective_date,
          themes, summary, issues, source_url, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "uk-parliament-9999",
        "uk-parliament",
        "United Kingdom",
        "Europe",
        "Test AI Bill",
        "proposed",
        null,
        JSON.stringify(["ai-policy"]),
        "Live ingested test bill",
        JSON.stringify([]),
        "https://bills.parliament.uk/bills/9999",
        "2026-04-26"
      );

    const after = getLegislationSummary().total;
    expect(after).toBe(baseline + 1);

    const ukRows = getLegislation({ region: "Europe" }).filter(
      (r) => r.jurisdiction === "United Kingdom"
    );
    expect(ukRows.some((r) => r.id === "uk-parliament-9999")).toBe(true);
  });

  it("anchor items take precedence over DB items with same id", () => {
    getDb()
      .prepare(
        `INSERT INTO legislation_items
         (id, source, jurisdiction, region, instrument, status, effective_date,
          themes, summary, issues, source_url, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "eu-ai-act",
        "eu-eur-lex",
        "European Union",
        "Europe",
        "STALE TITLE",
        "proposed",
        null,
        "[]",
        "stale",
        "[]",
        "https://example.com",
        "2020-01-01"
      );

    const euAiAct = getLegislation().find((l) => l.id === "eu-ai-act");
    expect(euAiAct?.instrument).toBe("EU AI Act");
  });
});
