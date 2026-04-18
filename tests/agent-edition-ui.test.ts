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

  it("adds a canonical /agent-edition landing page and routes navigation to it", () => {
    const layout = fs.readFileSync(path.join(process.cwd(), "app", "layout.tsx"), "utf-8");
    const sitemap = fs.readFileSync(path.join(process.cwd(), "app", "sitemap.ts"), "utf-8");
    const landingPath = path.join(process.cwd(), "app", "agent-edition", "page.tsx");

    expect(fs.existsSync(landingPath)).toBe(true);
    const landing = fs.readFileSync(landingPath, "utf-8");

    expect(layout).toContain('href="/agent-edition"');
    expect(layout).toContain(">agent edition<");
    expect(sitemap).toContain("/agent-edition");
    expect(landing).toContain("freshcrate Agent Edition");
    expect(landing).toContain("/workbench");
    expect(landing).toContain("/install/agent-edition");
  });

  it("keeps the original freshcrate logo in the hero position", () => {
    const logoSvg = fs.readFileSync(path.join(process.cwd(), "public", "logo.svg"), "utf-8");
    const logoPng = path.join(process.cwd(), "public", "logo.png");

    expect(logoSvg).toContain("freshcrate");
    expect(logoSvg).toContain("open source packages for agents");
    expect(logoSvg).not.toContain("agent edition");
    expect(fs.existsSync(logoPng)).toBe(true);
  });
});
