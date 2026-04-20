import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("languages ui metadata", () => {
  it("recognizes Docs / Meta and Mixed buckets", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app", "languages", "page.tsx"), "utf-8");
    expect(page).toContain('"Docs / Meta"');
    expect(page).toContain('Mixed');
  });

  it("surfaces auditable language source breakdown", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app", "languages", "page.tsx"), "utf-8");
    expect(page).toContain("Language source audit");
    expect(page).toContain("GitHub primary");
    expect(page).toContain("Inferred");
    expect(page).toContain("Manual map");
    expect(page).toContain("Docs / Meta bucket");
  });
});
