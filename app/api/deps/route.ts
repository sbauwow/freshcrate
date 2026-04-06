import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET() {
  const db = getDb();

  // Overview stats
  const total_deps = (db.prepare("SELECT COUNT(*) as c FROM dependencies").get() as { c: number }).c;
  const projects_scanned = (db.prepare("SELECT COUNT(DISTINCT project_id) as c FROM dependencies").get() as { c: number }).c;
  const unique_deps = (db.prepare("SELECT COUNT(DISTINCT dep_name) as c FROM dependencies").get() as { c: number }).c;
  const ecosystems = (db.prepare("SELECT COUNT(DISTINCT ecosystem) as c FROM dependencies WHERE ecosystem != 'unknown'").get() as { c: number }).c;

  const coverage = db.prepare(
    "SELECT COUNT(*) as total, SUM(CASE WHEN license IS NOT NULL AND license != '' THEN 1 ELSE 0 END) as covered FROM dependencies"
  ).get() as { total: number; covered: number };
  const license_coverage_pct = coverage.total > 0 ? Math.round((coverage.covered / coverage.total) * 100) : 0;

  const copyleft_count = (db.prepare("SELECT COUNT(*) as c FROM dependencies WHERE license_category = 'copyleft'").get() as { c: number }).c;

  // Most depended-on (top 30)
  const most_depended_on = db.prepare(`
    SELECT dep_name, COUNT(DISTINCT project_id) as project_count,
           ecosystem, license, license_category
    FROM dependencies
    GROUP BY dep_name
    ORDER BY project_count DESC, dep_name ASC
    LIMIT 30
  `).all();

  return NextResponse.json({
    overview: {
      total_deps,
      projects_scanned,
      unique_deps,
      ecosystems,
      license_coverage_pct,
      copyleft_count,
    },
    most_depended_on,
  });
}
