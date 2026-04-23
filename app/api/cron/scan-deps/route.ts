import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scanDependencies } from "@/lib/deps";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface ProjectRow {
  id: number;
  name: string;
  repo_url: string;
  license: string | null;
}

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 2000);
  const all = url.searchParams.get("all") === "1";
  const single = url.searchParams.get("name") || null;
  const token = process.env.GITHUB_TOKEN || "";

  const db = getDb();

  // Ensure columns exist (idempotent)
  try { db.exec("ALTER TABLE projects ADD COLUMN deps_scanned_at TEXT"); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE projects ADD COLUMN deps_audit_json TEXT"); } catch { /* already exists */ }

  // Ensure deps table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      dep_name TEXT NOT NULL, dep_version TEXT NOT NULL DEFAULT '*',
      dep_type TEXT NOT NULL DEFAULT 'runtime', ecosystem TEXT NOT NULL DEFAULT 'unknown',
      license TEXT, license_category TEXT, dep_repo_url TEXT, resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_deps_unique ON dependencies(project_id, ecosystem, dep_name);
  `);

  let projects: ProjectRow[];
  if (single) {
    projects = db.prepare(
      "SELECT id, name, repo_url, license FROM projects WHERE name = ? AND repo_url LIKE '%github.com%'"
    ).all(single) as ProjectRow[];
  } else if (all) {
    projects = db.prepare(
      "SELECT id, name, repo_url, license FROM projects WHERE repo_url LIKE '%github.com%' ORDER BY name LIMIT ?"
    ).all(limit) as ProjectRow[];
  } else {
    // Only unscanned projects
    projects = db.prepare(
      "SELECT id, name, repo_url, license FROM projects WHERE repo_url LIKE '%github.com%' AND deps_scanned_at IS NULL ORDER BY name LIMIT ?"
    ).all(limit) as ProjectRow[];
  }

  const results: { name: string; deps: number; conflicts: number; error?: string }[] = [];
  let scanned = 0;
  let errors = 0;

  for (const project of projects) {
    const match = project.repo_url.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
    if (!match) continue;
    const [, owner, repoRaw] = match;
    const repo = repoRaw.replace(/\.git$/, "");

    try {
      const result = await scanDependencies(project.id, owner, repo, token || undefined);
      results.push({
        name: project.name,
        deps: result.deps.length,
        conflicts: result.audit.conflicts.length,
      });
      scanned++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ name: project.name, deps: 0, conflicts: 0, error: msg });
      errors++;
    }

    // Rate limit: 200ms with token, 1s without
    await new Promise((r) => setTimeout(r, token ? 200 : 1000));
  }

  return NextResponse.json({
    ok: true,
    scanned,
    errors,
    total_candidates: projects.length,
    results: results.slice(0, 50), // cap response size
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
