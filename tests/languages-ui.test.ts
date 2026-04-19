import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("languages ui metadata", () => {
  it("recognizes Docs / Meta and Mixed buckets", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app", "languages", "page.tsx"), "utf-8");
    expect(page).toContain('"Docs / Meta"');
    expect(page).toContain('Mixed');
  });
});
