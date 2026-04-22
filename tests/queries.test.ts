import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { createTestDb, insertTestProject, _resetDb } from "./setup";
import {
  getLatestReleases,
  getLatestVerifiedReleases,
  getProjectTags,
  getProjectByName,
  getProjectReleases,
  getCategories,
  getProjectsByCategory,
  getProjectsByAuthor,
  getAuthors,
  getTags,
  getProjectsByTag,
  searchProjects,
  getStats,
  submitProject,
  rebuildSearchIndex,
} from "@/lib/queries";

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  _resetDb();
});

describe("getLatestReleases", () => {
  it("returns empty array when no projects exist", () => {
    const results = getLatestReleases();
    expect(results).toEqual([]);
  });

  it("returns projects with latest release info", () => {
    insertTestProject(db, { name: "pkg-alpha", version: "1.0.0" });
    insertTestProject(db, { name: "pkg-beta", version: "2.0.0" });

    const results = getLatestReleases();
    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty("name");
    expect(results[0]).toHaveProperty("latest_version");
    expect(results[0]).toHaveProperty("tags");
    expect(Array.isArray(results[0].tags)).toBe(true);
  });

  it("respects limit and offset", () => {
    for (let i = 0; i < 5; i++) {
      insertTestProject(db, { name: `pkg-${i}`, version: `${i}.0.0` });
    }

    const page1 = getLatestReleases(2, 0);
    expect(page1).toHaveLength(2);

    const page2 = getLatestReleases(2, 2);
    expect(page2).toHaveLength(2);

    const page3 = getLatestReleases(2, 4);
    expect(page3).toHaveLength(1);
  });

  it("filters by verifiedOnly option", () => {
    const verifiedId = insertTestProject(db, { name: "verified-one" });
    insertTestProject(db, { name: "unverified-one" });
    db.prepare("UPDATE projects SET verified = 1 WHERE id = ?").run(verifiedId);

    const verified = getLatestReleases(20, 0, { verifiedOnly: true });
    expect(verified).toHaveLength(1);
    expect(verified[0].name).toBe("verified-one");
  });

  it("uses ranking v2 for browse when sort=rank", () => {
    const weakId = insertTestProject(db, {
      name: "aaa-zombie",
      category: "Security",
      short_desc: "agent sandbox guardrail",
      repo_url: "https://github.com/test/aaa-zombie",
    });
    const strongId = insertTestProject(db, {
      name: "zzz-active",
      category: "Security",
      short_desc: "agent sandbox guardrail",
      repo_url: "https://github.com/test/zzz-active",
    });

    db.prepare("UPDATE projects SET stars = 5, forks = 1, verified = 0, created_at = datetime('now', '-900 days') WHERE id = ?").run(weakId);
    db.prepare("UPDATE releases SET created_at = datetime('now', '-500 days') WHERE project_id = ?").run(weakId);

    db.prepare("UPDATE projects SET stars = 120, forks = 30, verified = 1, verification_json = '{\"score\":92}', created_at = datetime('now', '-120 days') WHERE id = ?").run(strongId);
    db.prepare("UPDATE releases SET created_at = datetime('now', '-3 days') WHERE project_id = ?").run(strongId);
    db.prepare("INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, '1.1.0', 'fresh', 'Low', datetime('now', '-2 days'))").run(strongId);
    db.prepare("INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, '1.2.0', 'fresher', 'Low', datetime('now', '-1 days'))").run(strongId);

    const ranked = getLatestReleases(20, 0, { sort: "rank", category: "Security" });
    expect(ranked).toHaveLength(2);
    expect(ranked[0].name).toBe("zzz-active");
  });

  it("keeps deterministic SQL ordering for browse when ranking sort is not selected", () => {
    const weakId = insertTestProject(db, {
      name: "aaa-zombie",
      category: "Security",
      short_desc: "agent sandbox guardrail",
      repo_url: "https://github.com/test/aaa-zombie",
    });
    const strongId = insertTestProject(db, {
      name: "zzz-active",
      category: "Security",
      short_desc: "agent sandbox guardrail",
      repo_url: "https://github.com/test/zzz-active",
    });

    db.prepare("UPDATE projects SET stars = 5, forks = 1, verified = 0, created_at = datetime('now', '-900 days') WHERE id = ?").run(weakId);
    db.prepare("UPDATE projects SET stars = 120, forks = 30, verified = 1, verification_json = '{\"score\":92}', created_at = datetime('now', '-120 days') WHERE id = ?").run(strongId);

    const alphabetical = getLatestReleases(20, 0, { sort: "name", category: "Security" });
    expect(alphabetical.map((p) => p.name)).toEqual(["aaa-zombie", "zzz-active"]);
  });
});

describe("getLatestVerifiedReleases", () => {
  it("returns only verified projects", () => {
    const id = insertTestProject(db, { name: "verified-feed" });
    insertTestProject(db, { name: "not-verified-feed" });
    db.prepare("UPDATE projects SET verified = 1 WHERE id = ?").run(id);

    const rows = getLatestVerifiedReleases();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("verified-feed");
  });
});

describe("getProjectTags", () => {
  it("returns tags for a project", () => {
    const id = insertTestProject(db, { tags: ["ai", "mcp", "tool"] });
    const tags = getProjectTags(id);
    expect(tags).toEqual(expect.arrayContaining(["ai", "mcp", "tool"]));
    expect(tags).toHaveLength(3);
  });

  it("returns empty array for nonexistent project", () => {
    const tags = getProjectTags(999);
    expect(tags).toEqual([]);
  });
});

describe("getProjectByName", () => {
  it("returns project with release and tags", () => {
    insertTestProject(db, {
      name: "my-agent",
      version: "3.0.0",
      category: "AI Agents",
      tags: ["agent", "coding"],
    });

    const project = getProjectByName("my-agent");
    expect(project).not.toBeNull();
    expect(project!.name).toBe("my-agent");
    expect(project!.latest_version).toBe("3.0.0");
    expect(project!.category).toBe("AI Agents");
    expect(project!.tags).toEqual(expect.arrayContaining(["agent", "coding"]));
  });

  it("returns null for nonexistent project", () => {
    const project = getProjectByName("does-not-exist");
    expect(project).toBeNull();
  });
});

describe("getProjectReleases", () => {
  it("returns all releases for a project ordered by date desc", () => {
    const id = insertTestProject(db, { name: "multi-release" });

    // Add a second release with a later timestamp
    db.prepare(
      "INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, ?, ?, ?, datetime('now', '+1 second'))"
    ).run(id, "2.0.0", "Major update", "High");

    const releases = getProjectReleases(id);
    expect(releases).toHaveLength(2);
    expect(releases[0].version).toBe("2.0.0");
    expect(releases[1].version).toBe("1.0.0");
  });
});

describe("getCategories", () => {
  it("returns categories with counts", () => {
    insertTestProject(db, { name: "a1", category: "AI Agents" });
    insertTestProject(db, { name: "a2", category: "AI Agents" });
    insertTestProject(db, { name: "m1", category: "MCP Servers" });

    const categories = getCategories();
    expect(categories.length).toBeGreaterThanOrEqual(2);

    const agents = categories.find((c) => c.category === "AI Agents");
    expect(agents).toBeDefined();
    expect(agents!.count).toBe(2);

    const mcp = categories.find((c) => c.category === "MCP Servers");
    expect(mcp).toBeDefined();
    expect(mcp!.count).toBe(1);
  });
});

describe("getProjectsByCategory", () => {
  it("returns projects in specified category", () => {
    insertTestProject(db, { name: "sec-1", category: "Security" });
    insertTestProject(db, { name: "sec-2", category: "Security" });
    insertTestProject(db, { name: "agent-1", category: "AI Agents" });

    const security = getProjectsByCategory("Security");
    expect(security).toHaveLength(2);
    expect(security.every((p) => p.category === "Security")).toBe(true);
  });

  it("ranks stronger trusted packages ahead of stale alphabetic results when ranking v2 is enabled", () => {
    const weakId = insertTestProject(db, {
      name: "aaa-zombie",
      category: "Security",
      short_desc: "agent sandbox guardrail",
      repo_url: "https://github.com/test/aaa-zombie",
    });
    const strongId = insertTestProject(db, {
      name: "zzz-active",
      category: "Security",
      short_desc: "agent sandbox guardrail",
      repo_url: "https://github.com/test/zzz-active",
    });

    db.prepare("UPDATE projects SET stars = 5, forks = 1, verified = 0, created_at = datetime('now', '-900 days') WHERE id = ?").run(weakId);
    db.prepare("UPDATE releases SET created_at = datetime('now', '-500 days') WHERE project_id = ?").run(weakId);

    db.prepare("UPDATE projects SET stars = 120, forks = 30, verified = 1, verification_json = '{\"score\":92}', created_at = datetime('now', '-120 days') WHERE id = ?").run(strongId);
    db.prepare("UPDATE releases SET created_at = datetime('now', '-3 days') WHERE project_id = ?").run(strongId);
    db.prepare("INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, '1.1.0', 'fresh', 'Low', datetime('now', '-2 days'))").run(strongId);
    db.prepare("INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, '1.2.0', 'fresher', 'Low', datetime('now', '-1 days'))").run(strongId);

    const security = getProjectsByCategory("Security");
    expect(security).toHaveLength(2);
    expect(security[0].name).toBe("zzz-active");
  });

  it("falls back to legacy alphabetical browse ordering when ranking v2 is disabled", () => {
    process.env.FRESHCRATE_RANKING_V2 = "0";

    const weakId = insertTestProject(db, {
      name: "aaa-zombie",
      category: "Security",
      short_desc: "agent sandbox guardrail",
      repo_url: "https://github.com/test/aaa-zombie",
    });
    const strongId = insertTestProject(db, {
      name: "zzz-active",
      category: "Security",
      short_desc: "agent sandbox guardrail",
      repo_url: "https://github.com/test/zzz-active",
    });

    db.prepare("UPDATE projects SET stars = 5, forks = 1, verified = 0, created_at = datetime('now', '-900 days') WHERE id = ?").run(weakId);
    db.prepare("UPDATE projects SET stars = 120, forks = 30, verified = 1, verification_json = '{\"score\":92}', created_at = datetime('now', '-120 days') WHERE id = ?").run(strongId);

    const security = getProjectsByCategory("Security");
    expect(security.map((p) => p.name)).toEqual(["aaa-zombie", "zzz-active"]);

    delete process.env.FRESHCRATE_RANKING_V2;
  });

  it("returns empty array for empty category", () => {
    const results = getProjectsByCategory("Nonexistent Category");
    expect(results).toEqual([]);
  });
});

describe("getProjectsByAuthor", () => {
  it("returns projects for an exact author", () => {
    const a1 = insertTestProject(db, { name: "alice-1", author: "Alice" });
    const a2 = insertTestProject(db, { name: "alice-2", author: "Alice" });
    const b1 = insertTestProject(db, { name: "bob-1", author: "Bob" });
    db.prepare("UPDATE projects SET stars = ? WHERE id = ?").run(12, a1);
    db.prepare("UPDATE projects SET stars = ? WHERE id = ?").run(4, a2);
    db.prepare("UPDATE projects SET stars = ? WHERE id = ?").run(40, b1);

    const results = getProjectsByAuthor("Alice");
    expect(results).toHaveLength(2);
    expect(results.every((p) => p.author === "Alice")).toBe(true);
    expect(results.map((p) => p.name)).toEqual(expect.arrayContaining(["alice-1", "alice-2"]));
  });

  it("returns empty when author has no projects", () => {
    insertTestProject(db, { name: "other", author: "Someone" });
    expect(getProjectsByAuthor("Nobody")).toEqual([]);
  });
});

describe("getAuthors", () => {
  it("returns author summaries with package counts and total stars", () => {
    const p1 = insertTestProject(db, { name: "alpha", author: "Alice" });
    const p2 = insertTestProject(db, { name: "beta", author: "Alice" });
    const p3 = insertTestProject(db, { name: "gamma", author: "Bob" });
    db.prepare("UPDATE projects SET stars = ? WHERE id = ?").run(10, p1);
    db.prepare("UPDATE projects SET stars = ? WHERE id = ?").run(5, p2);
    db.prepare("UPDATE projects SET stars = ? WHERE id = ?").run(8, p3);

    const authors = getAuthors();
    const alice = authors.find((a) => a.author === "Alice");
    const bob = authors.find((a) => a.author === "Bob");

    expect(alice).toBeDefined();
    expect(alice!.package_count).toBe(2);
    expect(alice!.total_stars).toBe(15);
    expect(bob).toBeDefined();
    expect(bob!.package_count).toBe(1);
    expect(bob!.total_stars).toBe(8);
  });
});

describe("getTags", () => {
  it("returns tags with project counts", () => {
    insertTestProject(db, { name: "tag-a", tags: ["mcp", "agent"] });
    insertTestProject(db, { name: "tag-b", tags: ["mcp"] });

    const tags = getTags();
    const mcp = tags.find((t) => t.tag === "mcp");
    const agent = tags.find((t) => t.tag === "agent");

    expect(mcp).toBeDefined();
    expect(mcp!.project_count).toBe(2);
    expect(agent).toBeDefined();
    expect(agent!.project_count).toBe(1);
  });
});

describe("getProjectsByTag", () => {
  it("returns projects for an exact tag", () => {
    insertTestProject(db, { name: "mcp-one", tags: ["mcp", "tool"] });
    insertTestProject(db, { name: "mcp-two", tags: ["mcp"] });
    insertTestProject(db, { name: "other", tags: ["security"] });

    const results = getProjectsByTag("mcp");
    expect(results).toHaveLength(2);
    expect(results.map((p) => p.name)).toEqual(expect.arrayContaining(["mcp-one", "mcp-two"]));
    expect(results.every((p) => p.tags.includes("mcp"))).toBe(true);
  });

  it("returns empty when tag has no projects", () => {
    insertTestProject(db, { name: "other", tags: ["security"] });
    expect(getProjectsByTag("nonexistent")).toEqual([]);
  });
});

describe("searchProjects", () => {
  it("finds projects by name", () => {
    insertTestProject(db, { name: "special-agent-tool" });
    insertTestProject(db, { name: "unrelated-db" });

    const results = searchProjects("special");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((p) => p.name === "special-agent-tool")).toBe(true);
  });

  it("ranks stronger trusted matches ahead of stale low-trust matches", () => {
    const weakId = insertTestProject(db, {
      name: "weak-match",
      short_desc: "agent orchestration platform",
      description: "agent orchestration platform for teams",
      category: "AI Agents",
      repo_url: "https://github.com/test/weak-match",
      tags: ["agent"],
    });
    const strongId = insertTestProject(db, {
      name: "strong-match",
      short_desc: "agent orchestration platform",
      description: "agent orchestration platform for teams",
      category: "AI Agents",
      repo_url: "https://github.com/test/strong-match",
      tags: ["agent"],
    });

    db.prepare("UPDATE projects SET stars = 3, forks = 0, verified = 0, created_at = datetime('now', '-1000 days') WHERE id = ?").run(weakId);
    db.prepare("UPDATE releases SET created_at = datetime('now', '-400 days') WHERE project_id = ?").run(weakId);

    db.prepare("UPDATE projects SET stars = 200, forks = 50, verified = 1, verification_json = '{\"score\":97}', created_at = datetime('now', '-150 days') WHERE id = ?").run(strongId);
    db.prepare("UPDATE releases SET created_at = datetime('now', '-5 days') WHERE project_id = ?").run(strongId);
    db.prepare("INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, '1.1.0', 'fresh', 'Low', datetime('now', '-3 days'))").run(strongId);
    db.prepare("INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, '1.2.0', 'fresher', 'Low', datetime('now', '-1 days'))").run(strongId);

    const results = searchProjects("agent orchestration");
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].name).toBe("strong-match");
  });

  it("finds projects by description", () => {
    insertTestProject(db, {
      name: "finder",
      short_desc: "A unique quantum computing framework",
    });

    const results = searchProjects("quantum");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((p) => p.name === "finder")).toBe(true);
  });

  it("finds projects by tag", () => {
    insertTestProject(db, {
      name: "tagged-project",
      tags: ["blockchain", "crypto"],
    });

    const results = searchProjects("blockchain");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((p) => p.name === "tagged-project")).toBe(true);
  });

  it("returns empty for no matches", () => {
    insertTestProject(db, { name: "something" });
    const results = searchProjects("zzzznonexistent");
    expect(results).toEqual([]);
  });
});

describe("getStats", () => {
  it("returns correct counts", () => {
    insertTestProject(db, { name: "s1", category: "AI Agents" });
    insertTestProject(db, { name: "s2", category: "AI Agents" });
    insertTestProject(db, { name: "s3", category: "Security" });

    const stats = getStats();
    expect(stats.projects).toBe(3);
    expect(stats.releases).toBe(3);
    expect(stats.categories).toBe(2);
  });

  it("returns zeros when empty", () => {
    const stats = getStats();
    expect(stats.projects).toBe(0);
    expect(stats.releases).toBe(0);
    expect(stats.categories).toBe(0);
  });
});

describe("submitProject", () => {
  it("creates project with release and tags", () => {
    const id = submitProject({
      name: "new-package",
      short_desc: "A new package",
      description: "Full description",
      homepage_url: "https://example.com",
      repo_url: "https://github.com/test/new-package",
      license: "MIT",
      category: "Developer Tools",
      author: "Dev",
      version: "0.1.0",
      changes: "First release",
      tags: ["tool", "new"],
    });

    expect(id).toBeGreaterThan(0);

    const project = getProjectByName("new-package");
    expect(project).not.toBeNull();
    expect(project!.name).toBe("new-package");
    expect(project!.latest_version).toBe("0.1.0");
    expect(project!.tags).toEqual(expect.arrayContaining(["tool", "new"]));
  });

  it("rejects duplicate project names", () => {
    submitProject({
      name: "dupe-test",
      short_desc: "First",
      description: "",
      homepage_url: "",
      repo_url: "",
      license: "MIT",
      category: "AI Agents",
      author: "A",
      version: "1.0.0",
      changes: "",
      tags: [],
    });

    expect(() =>
      submitProject({
        name: "dupe-test",
        short_desc: "Second",
        description: "",
        homepage_url: "",
        repo_url: "",
        license: "MIT",
        category: "AI Agents",
        author: "B",
        version: "2.0.0",
        changes: "",
        tags: [],
      })
    ).toThrow(/UNIQUE/);
  });
});

describe("rebuildSearchIndex", () => {
  it("rebuilds FTS index without error", () => {
    insertTestProject(db, { name: "fts-test" });
    expect(() => rebuildSearchIndex()).not.toThrow();
  });
});
