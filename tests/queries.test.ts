import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { createTestDb, insertTestProject, _resetDb } from "./setup";
import {
  getLatestReleases,
  getProjectTags,
  getProjectByName,
  getProjectReleases,
  getCategories,
  getProjectsByCategory,
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

  it("returns empty array for empty category", () => {
    const results = getProjectsByCategory("Nonexistent Category");
    expect(results).toEqual([]);
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
