import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import Database from "better-sqlite3";
import { createTestDb, insertTestProject, _resetDb } from "./setup";
import { GET as getRecommend } from "@/app/api/agent/recommend/route";
import { GET as getCompare } from "@/app/api/agent/compare/route";
import { GET as getPreflight } from "@/app/api/agent/preflight/route";
import { POST as postDecision } from "@/app/api/agent/decision/route";

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  _resetDb();
});

describe("agent decision api", () => {
  it("returns 400 when recommend is missing task", async () => {
    const request = new NextRequest("https://freshcrate.ai/api/agent/recommend");
    const response = await getRecommend(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/task/i) });
  });

  it("returns 404 when compare target is missing", async () => {
    insertTestProject(db, { name: "present-one", category: "AI Agents", tags: ["agent"] });

    const request = new NextRequest("https://freshcrate.ai/api/agent/compare?a=present-one&b=missing-one&task=agent");
    const response = await getCompare(request);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/must exist/i) });
  });

  it("returns 404 preflight payload for unknown project", async () => {
    const request = new NextRequest("https://freshcrate.ai/api/agent/preflight?name=missing-one");
    const response = await getPreflight(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.preflight.status).toBe("missing");
    expect(data.preflight.exists).toBe(false);
  });

  it("normalizes composite decision body booleans and string limit", async () => {
    const secureId = insertTestProject(db, {
      name: "secure-agent",
      category: "AI Agents",
      short_desc: "verified local agent",
      tags: ["agent", "local", "security"],
    });
    const backupId = insertTestProject(db, {
      name: "backup-agent",
      category: "AI Agents",
      short_desc: "another verified local agent",
      tags: ["agent", "local", "security"],
    });
    const noisyId = insertTestProject(db, {
      name: "noisy-agent",
      category: "AI Agents",
      short_desc: "unverified noisy agent",
      tags: ["agent", "cloud"],
    });

    db.prepare("UPDATE projects SET verified = 1, stars = 120, language = 'TypeScript' WHERE id = ?").run(secureId);
    db.prepare("UPDATE projects SET verified = 1, stars = 100, language = 'TypeScript' WHERE id = ?").run(backupId);
    db.prepare("UPDATE projects SET verified = 0, stars = 90, language = 'TypeScript' WHERE id = ?").run(noisyId);

    const request = new NextRequest("https://freshcrate.ai/api/agent/decision", {
      method: "POST",
      body: JSON.stringify({
        mode: "recommend",
        task: "security agent",
        verified_only: "true",
        require_accountability: "false",
        limit: "1",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await postDecision(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mode).toBe("recommend");
    expect(data.result).toHaveLength(1);
    expect(data.result[0].name).toBe("secure-agent");
  });
});
