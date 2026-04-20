import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("dependency visibility ui", () => {
  it("surfaces scan health and conflict project table on dependency explorer", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app", "dependencies", "page.tsx"), "utf-8");
    expect(page).toContain("Scan Health");
    expect(page).toContain("Audited projects");
    expect(page).toContain("Conflicts found");
    expect(page).toContain("Unknown licenses");
    expect(page).toContain("Audit Score");
    expect(page).toContain("conflicts only");
    expect(page).toContain("unresolved-heavy");
    expect(page).toContain("highest conflict count");
    expect(page).toContain("Presets:");
    expect(page).toContain("hot conflicts");
    expect(page).toContain("worst score");
  });

  it("surfaces dependency scan status on project detail pages", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app", "projects", "[name]", "page.tsx"), "utf-8");
    expect(page).toContain("Dependency Scan");
    expect(page).toContain("Open dependency risk map");
    expect(page).toContain("Audit score");
    expect(page).toContain("Language source");
  });

  it("documents the dependency audit api summary", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app", "api", "page.tsx"), "utf-8");
    expect(page).toContain("Project Dependency Audit");
    expect(page).toContain("GET /api/projects/:name/deps");
    expect(page).toContain("conflict count");
    expect(page).toContain("language_source");
  });
});
