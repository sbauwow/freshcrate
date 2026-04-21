import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("orchestra page metadata and framing", () => {
  it("positions orchestra as agent-ecosystem orchestration guidance", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app", "orchestra", "page.tsx"), "utf8");
    expect(page).toContain("orchestration patterns for the agent ecosystem");
    expect(page).toContain("patterns for coordinating the agent ecosystem");
    expect(page).toContain("delegation, supervision, review gates, artifact spines");
    expect(page).toContain("freshcrate orchestra");
  });

  it("ships page-level open graph and twitter metadata for orchestra", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "app", "orchestra", "page.tsx"), "utf8");
    expect(page).toContain("openGraph");
    expect(page).toContain("twitter");
    expect(page).toContain("https://freshcrate.ai/orchestra");
    expect(page).toContain("freshcrate orchestra");
  });
});
