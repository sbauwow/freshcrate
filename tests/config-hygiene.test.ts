import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import nextConfig from "../next.config";

describe("next config hygiene", () => {
  it("pins turbopack root to this repo", () => {
    expect(nextConfig.turbopack?.root).toBe(path.join(process.cwd()));
  });

  it("uses proxy.ts instead of middleware.ts", () => {
    expect(fs.existsSync(path.join(process.cwd(), "proxy.ts"))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "middleware.ts"))).toBe(false);
  });
});
