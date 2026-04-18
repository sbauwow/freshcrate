import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("agent edition ui surfacing", () => {
  it("surfaces Agent Edition on the homepage with install and workbench links", () => {
    const homepage = fs.readFileSync(path.join(process.cwd(), "app", "page.tsx"), "utf-8");

    expect(homepage).toContain("Agent Edition");
    expect(homepage).toContain("/workbench");
    expect(homepage).toContain("/install/agent-edition");
  });

  it("renames primary navigation from workbench to agent edition", () => {
    const layout = fs.readFileSync(path.join(process.cwd(), "app", "layout.tsx"), "utf-8");

    expect(layout).toContain('href="/workbench"');
    expect(layout).toContain(">agent edition<");
  });
});
