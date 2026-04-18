import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("agent edition ui surfacing", () => {
  it("surfaces a strong Agent Edition homepage hero with operator framing and CTAs", () => {
    const homepage = fs.readFileSync(path.join(process.cwd(), "app", "page.tsx"), "utf-8");

    expect(homepage).toContain("freshcrate Agent Edition");
    expect(homepage).toContain("Linux for agent operators");
    expect(homepage).toContain("minimal agentic substrate");
    expect(homepage).toContain("Ubuntu 24.04 x86_64");
    expect(homepage).toContain("/workbench");
    expect(homepage).toContain("/install/agent-edition");
    expect(homepage).toContain("Open Agent Edition");
    expect(homepage).toContain("Install Agent Edition");
  });

  it("renames primary navigation from workbench to agent edition", () => {
    const layout = fs.readFileSync(path.join(process.cwd(), "app", "layout.tsx"), "utf-8");

    expect(layout).toContain('href="/workbench"');
    expect(layout).toContain(">agent edition<");
  });

  it("updates the logo asset to minimal crate Agent Edition branding", () => {
    const logoSvg = fs.readFileSync(path.join(process.cwd(), "public", "logo.svg"), "utf-8");
    const logoPng = path.join(process.cwd(), "public", "logo.png");

    expect(logoSvg).toContain("freshcrate");
    expect(logoSvg).toContain("agent edition");
    expect(logoSvg).toContain("minimal crate");
    expect(fs.existsSync(logoPng)).toBe(true);
  });
});
