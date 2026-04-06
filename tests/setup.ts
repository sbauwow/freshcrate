import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { _setDb, _resetDb } from "@/lib/db";

/**
 * Create a fresh in-memory SQLite database with the full schema applied.
 * Used by all test files for isolation.
 */
export function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");

  // Apply all migration SQL files in order
  const migrationsDir = path.join(process.cwd(), "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    db.exec(sql);
  }

  // Wire it into the singleton so lib/queries.ts uses this DB
  _setDb(db);

  return db;
}

/**
 * Insert a sample project with a release and tags for testing.
 */
export function insertTestProject(
  db: Database.Database,
  overrides: Partial<{
    name: string;
    short_desc: string;
    description: string;
    homepage_url: string;
    repo_url: string;
    license: string;
    category: string;
    author: string;
    version: string;
    changes: string;
    urgency: string;
    tags: string[];
  }> = {}
): number {
  const data = {
    name: overrides.name ?? "test-package",
    short_desc: overrides.short_desc ?? "A test package",
    description: overrides.description ?? "Full description of test package",
    homepage_url: overrides.homepage_url ?? "https://example.com",
    repo_url: overrides.repo_url ?? "https://github.com/test/test-package",
    license: overrides.license ?? "MIT",
    category: overrides.category ?? "AI Agents",
    author: overrides.author ?? "TestAuthor",
    version: overrides.version ?? "1.0.0",
    changes: overrides.changes ?? "Initial release",
    urgency: overrides.urgency ?? "Low",
    tags: overrides.tags ?? ["test", "agent"],
  };

  const result = db
    .prepare(
      "INSERT INTO projects (name, short_desc, description, homepage_url, repo_url, license, category, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      data.name,
      data.short_desc,
      data.description,
      data.homepage_url,
      data.repo_url,
      data.license,
      data.category,
      data.author
    );

  const projectId = result.lastInsertRowid as number;

  db.prepare(
    "INSERT INTO releases (project_id, version, changes, urgency) VALUES (?, ?, ?, ?)"
  ).run(projectId, data.version, data.changes, data.urgency);

  for (const tag of data.tags) {
    db.prepare("INSERT INTO tags (project_id, tag) VALUES (?, ?)").run(
      projectId,
      tag
    );
  }

  // Update FTS index
  try {
    db.exec("INSERT INTO projects_fts(projects_fts) VALUES('rebuild')");
  } catch {
    // FTS may not exist in all test scenarios
  }

  return projectId;
}

export { _resetDb };
