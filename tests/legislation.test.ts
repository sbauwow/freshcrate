import { describe, it, expect } from "vitest";
import {
  getGovernanceIssues,
  getLegislation,
  getLegislationFilterOptions,
  getLegislationSummary,
} from "@/lib/legislation";

describe("legislation dataset", () => {
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
});
