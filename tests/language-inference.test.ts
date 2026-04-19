import { describe, it, expect } from "vitest";
import { inferRepoLanguage } from "../scripts/lib/repo-language.mjs";

describe("repo language inference", () => {
  it("keeps GitHub primary language when present", () => {
    expect(inferRepoLanguage({ repo: { language: "Python" } })).toBe("Python");
  });

  it("infers TypeScript from tsconfig + package manifest", () => {
    expect(
      inferRepoLanguage({
        repo: { language: "", name: "ts-app", description: "" },
        rootContents: [{ name: "package.json" }, { name: "tsconfig.json" }],
      }),
    ).toBe("TypeScript");
  });

  it("classifies awesome/docs repos as Docs / Meta", () => {
    expect(
      inferRepoLanguage({
        repo: { language: "", name: "Awesome-Agent-Memory", description: "curated list of agent memory repos", topics: ["awesome", "agents"] },
        rootContents: [{ name: "README.md" }, { name: "LICENSE" }, { name: "docs" }],
      }),
    ).toBe("Docs / Meta");
  });

  it("returns Mixed when multiple ecosystems are present", () => {
    expect(
      inferRepoLanguage({
        repo: { language: "", name: "polyglot", description: "" },
        rootContents: [{ name: "go.mod" }, { name: "Cargo.toml" }],
      }),
    ).toBe("Mixed");
  });

  it("classifies zip-only archive repos as Docs / Meta", () => {
    expect(
      inferRepoLanguage({
        repo: { language: "", name: "archive-repo", description: "" },
        rootContents: [{ name: "README.md" }, { name: "bundle.zip" }],
      }),
    ).toBe("Docs / Meta");
  });

  it("supports manual edge-case mappings", () => {
    expect(
      inferRepoLanguage({
        repo: { full_name: "tauhidislam929/crypto_market_analysis", language: "", name: "crypto_market_analysis" },
      }),
    ).toBe("Python");
  });
});
