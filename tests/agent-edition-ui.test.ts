import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("agent edition ui surfacing", () => {
  it("surfaces a broader freshcrate homepage hero with ecosystem framing and CTAs", () => {
    const homepage = fs.readFileSync(path.join(process.cwd(), "app", "page.tsx"), "utf-8");

    expect(homepage).toContain("Open source packages for agents");
    expect(homepage).toContain("Discover the agent ecosystem in one place");
    expect(homepage).toContain("MCP servers");
    expect(homepage).toContain("Explore Orchestra");
    expect(homepage).toContain("/agent-edition");
    expect(homepage).toContain("Browse ecosystem");
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
  });

  it("redirects legacy workbench and install routes to /agent-edition", () => {
    const nextConfig = fs.readFileSync(path.join(process.cwd(), "next.config.ts"), "utf-8");
    expect(nextConfig).toContain('source: "/workbench"');
    expect(nextConfig).toContain('source: "/install/agent-edition"');
    expect(nextConfig).toContain('destination: "/agent-edition"');
    const workbenchPagePath = path.join(process.cwd(), "app", "workbench", "page.tsx");
    const installPagePath = path.join(process.cwd(), "app", "install", "agent-edition", "page.tsx");
    expect(fs.existsSync(workbenchPagePath)).toBe(false);
    expect(fs.existsSync(installPagePath)).toBe(false);
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
