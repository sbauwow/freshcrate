import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

const switcher = fs.readFileSync(path.join(process.cwd(), "app", "components", "locale-switcher.tsx"), "utf-8");

describe("locale switcher", () => {
  it("uses plain anchors so the locale switch is a full document load", () => {
    // A next/link here makes the switch a soft navigation: /api/locale is
    // fetched as RSC, the cookie lands, but the rendered layout/page keep the
    // old language and the UI sits one click behind (looks stuck).
    expect(switcher).not.toMatch(/^import .*"next\/link"/m);
    expect(switcher).not.toMatch(/<Link\b/);
    expect(switcher).toMatch(/<a href={`\/api\/locale\?lang=en&redirect=/);
    expect(switcher).toMatch(/<a href={`\/api\/locale\?lang=zh-CN&redirect=/);
  });

  it("round-trips the current path and query through the redirect param", () => {
    expect(switcher).toContain("const redirect = query ? `${pathname}?${query}` : pathname;");
    expect(switcher).toContain("encodeURIComponent(redirect)");
  });
});
