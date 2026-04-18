import { describe, it, expect } from "vitest";
import {
  getOrchestraBrief,
  getOrchestraFilterOptions,
  getOrchestraPatterns,
  getOrchestraPlaybook,
} from "@/lib/orchestra";

describe("orchestra dataset", () => {
  it("returns non-empty summary counts", () => {
    const summary = getOrchestraBrief();
    expect(summary.principles).toBeGreaterThan(0);
    expect(summary.patterns).toBeGreaterThan(0);
    expect(summary.antiPatterns).toBeGreaterThan(0);
  });

  it("returns valid filter options", () => {
    const options = getOrchestraFilterOptions();
    expect(options.themes.length).toBeGreaterThan(0);
    expect(options.stages.length).toBeGreaterThan(0);
  });

  it("filters patterns by theme", () => {
    const rows = getOrchestraPatterns({ theme: "delegation" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.themes.includes("delegation"))).toBe(true);
  });

  it("filters patterns by stage", () => {
    const rows = getOrchestraPatterns({ stage: "production" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.stage === "production")).toBe(true);
  });

  it("filters patterns by keyword query", () => {
    const rows = getOrchestraPatterns({ q: "review gate" });
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.some(
        (row) =>
          row.title.toLowerCase().includes("review") ||
          row.summary.toLowerCase().includes("review") ||
          row.anti_patterns.some((item) => item.toLowerCase().includes("review"))
      )
    ).toBe(true);
  });

  it("builds an actionable orchestration playbook", () => {
    const playbook = getOrchestraPlaybook({ theme: "delegation", stage: "production" });
    expect(playbook.score).toBeGreaterThan(0);
    expect(playbook.actions.length).toBeGreaterThan(0);
    expect(playbook.actions.some((action) => action.checklist.length > 0)).toBe(true);
  });
});
