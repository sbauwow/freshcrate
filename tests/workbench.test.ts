import { describe, it, expect } from "vitest";
import {
  getWorkbenchBrief,
  getWorkbenchBundles,
  getWorkbenchFilterOptions,
  getWorkbenchInstallModes,
  getWorkbenchPlaybook,
} from "@/lib/workbench";

describe("workbench dataset", () => {
  it("returns non-empty summary counts", () => {
    const brief = getWorkbenchBrief();
    expect(brief.bundles).toBeGreaterThan(0);
    expect(brief.principles).toBeGreaterThan(0);
    expect(brief.verificationChecks).toBeGreaterThan(0);
  });

  it("returns valid filter options", () => {
    const options = getWorkbenchFilterOptions();
    expect(options.personas.length).toBeGreaterThan(0);
    expect(options.targets).toContain("ubuntu-24.04-x86_64");
    expect(options.modes).toContain("headless");
  });

  it("filters bundles by persona and install mode", () => {
    const bundles = getWorkbenchBundles({ persona: "security", mode: "headless" });
    expect(bundles.length).toBeGreaterThan(0);
    expect(bundles.every((bundle) => bundle.persona === "security")).toBe(true);
    expect(bundles.every((bundle) => bundle.installModes.includes("headless"))).toBe(true);
  });

  it("supports keyword filtering for minimal substrate positioning", () => {
    const bundles = getWorkbenchBundles({ q: "minimal substrate" });
    expect(bundles.length).toBeGreaterThan(0);
    expect(
      bundles.some(
        (bundle) =>
          bundle.summary.toLowerCase().includes("minimal") ||
          bundle.philosophy.toLowerCase().includes("substrate") ||
          bundle.packages.some((item) => item.toLowerCase().includes("tmux"))
      )
    ).toBe(true);
  });

  it("returns install modes with explicit anti-bloat guidance", () => {
    const modes = getWorkbenchInstallModes();
    expect(modes.some((mode) => mode.id === "headless")).toBe(true);
    expect(modes.some((mode) => mode.antiGoals.some((goal) => goal.toLowerCase().includes("heavy desktop")))).toBe(true);
  });

  it("ships exact bootstrap and verification commands for every bundle", () => {
    const bundles = getWorkbenchBundles();
    expect(bundles.length).toBeGreaterThan(0);
    for (const bundle of bundles) {
      expect(bundle.bootstrapCommand).toContain("scripts/bootstrap-agent-edition.sh");
      expect(bundle.verifyCommand).toContain("scripts/verify-agent-edition.sh");
      expect(bundle.verifyCommand).toContain(bundle.id);
    }
  });

  it("builds an actionable playbook for a minimal agentic substrate", () => {
    const playbook = getWorkbenchPlaybook({ persona: "automation", mode: "headless" });
    expect(playbook.score).toBeGreaterThan(0);
    expect(playbook.actions.length).toBeGreaterThan(0);
    expect(playbook.actions.some((action) => action.checklist.length > 0)).toBe(true);
  });
});
