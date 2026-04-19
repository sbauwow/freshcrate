import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/projects/[name]/deps/route";
import { createTestDb, insertTestProject, _resetDb } from "./setup";

beforeEach(() => {
  createTestDb();
});

afterEach(() => {
  _resetDb();
});

describe("project deps api", () => {
  it("returns dependency audit summary with conflicts and unresolved counts", async () => {
    const db = createTestDb();
    const projectId = insertTestProject(db, { name: "conflict-demo", license: "MIT" });
    db.prepare(
      "INSERT INTO dependencies (project_id, dep_name, dep_version, dep_type, ecosystem, license, license_category, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(projectId, "left-pad", "1.0.0", "runtime", "npm", "GPL-3.0", "copyleft", new Date().toISOString());
    db.prepare(
      "UPDATE projects SET deps_scanned_at = ?, deps_audit_json = ? WHERE id = ?"
    ).run(
      "2026-04-19T08:00:00.000Z",
      JSON.stringify({
        project_license: "MIT",
        project_license_category: "permissive",
        total_deps: 1,
        resolved: 1,
        unresolved: 0,
        permissive: 0,
        copyleft: 1,
        weak_copyleft: 0,
        unknown: 0,
        conflicts: [{ dep_name: "left-pad", dep_license: "GPL-3.0", dep_category: "copyleft", project_license: "MIT", reason: "bad", severity: "error" }],
        warnings: [],
        score: 80,
        scanned_at: "2026-04-19T08:00:00.000Z",
      }),
      projectId,
    );

    const request = new NextRequest("https://freshcrate.ai/api/projects/conflict-demo/deps");
    const response = await GET(request, { params: Promise.resolve({ name: "conflict-demo" }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.summary).toMatchObject({
      total_deps: 1,
      resolved: 1,
      unresolved: 0,
      conflict_count: 1,
      warning_count: 0,
      score: 80,
    });
    expect(data.audit.conflicts).toHaveLength(1);
    expect(data.deps).toHaveLength(1);
  });
});
