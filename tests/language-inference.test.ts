import { describe, it, expect } from "vitest";
import { inferRepoLanguage, resolveRepoLanguage } from "../scripts/lib/repo-language.mjs";

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

  it("marks GitHub primary language as github source", () => {
    expect(
      resolveRepoLanguage({
        repo: { language: "Python", name: "agent", description: "" },
      }),
    ).toEqual({ language: "Python", source: "github" });
  });

  it("marks manifest-derived language as inferred source", () => {
    expect(
      resolveRepoLanguage({
        repo: { language: "", name: "ts-app", description: "" },
        rootContents: [{ name: "package.json" }, { name: "tsconfig.json" }],
      }),
    ).toEqual({ language: "TypeScript", source: "inferred" });
  });

  it("marks docs/meta classification as docs_meta source", () => {
    expect(
      resolveRepoLanguage({
        repo: { language: "", name: "Awesome-Agent-Memory", description: "curated list of agent memory repos", topics: ["awesome", "agents"] },
        rootContents: [{ name: "README.md" }, { name: "LICENSE" }, { name: "docs" }],
      }),
    ).toEqual({ language: "Docs / Meta", source: "docs_meta" });
  });

  it("marks manual edge-case mappings as manual source", () => {
    expect(
      resolveRepoLanguage({
        repo: { full_name: "tauhidislam929/crypto_market_analysis", language: "", name: "crypto_market_analysis" },
      }),
    ).toEqual({ language: "Python", source: "manual" });
  });
});
