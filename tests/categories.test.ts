import { describe, it, expect } from "vitest";
import { CATEGORIES, CATEGORY_RULES, categorize, LICENSES } from "@/lib/categories";

describe("CATEGORIES", () => {
  it("contains expected categories", () => {
    expect(CATEGORIES).toContain("AI Agents");
    expect(CATEGORIES).toContain("MCP Servers");
    expect(CATEGORIES).toContain("Frameworks");
    expect(CATEGORIES).toContain("Uncategorized");
  });

  it("has no duplicates", () => {
    const set = new Set(CATEGORIES);
    expect(set.size).toBe(CATEGORIES.length);
  });
});

describe("categorize", () => {
  it("detects MCP servers", () => {
    expect(categorize("mcp-server-files", "file operations", [])).toBe("MCP Servers");
    expect(categorize("something", "a great MCP tool", [])).toBe("MCP Servers");
  });

  it("detects AI Agents", () => {
    expect(categorize("coding-agent", "an autonomous tool", [])).toBe("AI Agents");
    expect(categorize("copilot-helper", "", [])).toBe("AI Agents");
  });

  it("detects Frameworks", () => {
    expect(categorize("langchain", "orchestration framework", [])).toBe("Frameworks");
  });

  it("detects Databases", () => {
    expect(categorize("vectordb", "vector database for embeddings", [])).toBe("Databases");
  });

  it("detects Security", () => {
    expect(categorize("sandbox-runner", "", [])).toBe("Security");
  });

  it("uses topics for categorization", () => {
    expect(categorize("mylib", "does stuff", ["mcp", "tools"])).toBe("MCP Servers");
  });

  it("returns Uncategorized when no rules match", () => {
    expect(categorize("foo", "bar", [])).toBe("Uncategorized");
  });
});

describe("LICENSES", () => {
  it("contains standard licenses", () => {
    expect(LICENSES).toContain("MIT");
    expect(LICENSES).toContain("Apache-2.0");
    expect(LICENSES).toContain("GPL-3.0");
    expect(LICENSES).toContain("Unknown");
  });
});

describe("CATEGORY_RULES", () => {
  it("each rule has a valid category", () => {
    for (const rule of CATEGORY_RULES) {
      expect(CATEGORIES).toContain(rule.category);
    }
  });
});
