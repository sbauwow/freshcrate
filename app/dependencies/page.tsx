import Link from "next/link";
import { getDb } from "@/lib/db";
import { getDependencyScanHealth } from "@/lib/deps";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "freshcrate — Dependency Explorer",
  description:
    "Explore the dependency ecosystem across all freshcrate packages. See the most common dependencies, heaviest packages, license risks, and ecosystem breakdown.",
};

// Dependency stats change as scans run; this page must render at request time.
export const dynamic = "force-dynamic";

/* ── Ecosystem colors ── */
const ECO_COLORS: Record<string, string> = {
  npm: "#CB3837",
  pypi: "#3775A9",
  cargo: "#DEA584",
  go: "#00ADD8",
  unknown: "#8B8B8B",
};

/* ── License pill (matches homepage LicensePill) ── */
function LicensePill({ license, category }: { license: string | null; category: string | null }) {
  const l = license || "Unknown";
  const cat = category || "unknown";
  let color = "bg-gray-200 text-gray-700";
  if (cat === "permissive") color = "bg-green-100 text-green-800";
  else if (cat === "copyleft") color = "bg-yellow-100 text-yellow-800";
  else if (cat === "weak_copyleft") color = "bg-blue-100 text-blue-800";
  return (
    <span className={`${color} px-1.5 py-0.5 rounded text-[9px] font-mono font-bold`}>
      {l}
    </span>
  );
}

function EcoBadge({ eco }: { eco: string }) {
  const bg = ECO_COLORS[eco] || ECO_COLORS.unknown;
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-white"
      style={{ backgroundColor: bg }}
    >
      {eco}
    </span>
  );
}

function SectionHeader({ id, title }: { id: string; title: string }) {
  return (
    <div id={id} className="border-b-2 border-fm-green mt-6 mb-2 pb-1 scroll-mt-4">
      <h2 className="text-[14px] font-bold text-fm-green">{title}</h2>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    HIGH: "bg-red-100 text-red-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    LOW: "bg-green-100 text-green-800",
  };
  return (
    <span className={`${colors[level] || "bg-gray-200 text-gray-700"} px-1.5 py-0.5 rounded text-[9px] font-mono font-bold`}>
      {level}
    </span>
  );
}

/* ── Types ── */
interface OverviewStats {
  total_deps: number;
  projects_scanned: number;
  unique_deps: number;
  ecosystems: number;
  license_coverage: number;
  copyleft_count: number;
}

interface MostDepended {
  dep_name: string;
  project_count: number;
  ecosystem: string;
  license: string | null;
  license_category: string | null;
}

interface HeaviestPkg {
  project_id: number;
  name: string;
  total: number;
  runtime: number;
  dev: number;
  copyleft: number;
  unknown: number;
}

interface LicenseConflict {
  project_id: number;
  pkg_name: string;
  pkg_license: string;
  dep_name: string;
  dep_license: string | null;
  dep_category: string | null;
  risk: string;
}

interface EcoBreakdown {
  ecosystem: string;
  count: number;
  top_dep: string;
}

interface AuditProjectRow {
  project_id: number;
  name: string;
  total_deps: number;
  resolved: number;
  unresolved: number;
  conflict_count: number;
  warning_count: number;
  score: number;
  scanned_at: string | null;
}

export default async function DependenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const scanHealth = getDependencyScanHealth();
  const view = params.view === "all" || params.view === "unresolved" ? params.view : "conflicts";
  const sort = params.sort === "unresolved" || params.sort === "score" || params.sort === "recent" || params.sort === "name" ? params.sort : "conflicts";

  // ── 1. OVERVIEW ──
  const overview: OverviewStats = {
    total_deps: (db.prepare("SELECT COUNT(*) as c FROM dependencies").get() as { c: number }).c,
    projects_scanned: (db.prepare("SELECT COUNT(DISTINCT project_id) as c FROM dependencies").get() as { c: number }).c,
    unique_deps: (db.prepare("SELECT COUNT(DISTINCT dep_name) as c FROM dependencies").get() as { c: number }).c,
    ecosystems: (db.prepare("SELECT COUNT(DISTINCT ecosystem) as c FROM dependencies WHERE ecosystem != 'unknown'").get() as { c: number }).c,
    license_coverage: (() => {
      const r = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN license IS NOT NULL AND license != '' THEN 1 ELSE 0 END) as covered FROM dependencies").get() as { total: number; covered: number };
      return r.total > 0 ? Math.round((r.covered / r.total) * 100) : 0;
    })(),
    copyleft_count: (db.prepare("SELECT COUNT(*) as c FROM dependencies WHERE license_category = 'copyleft'").get() as { c: number }).c,
  };

  // ── 2. MOST DEPENDED-ON ──
  const mostDepended = db.prepare(`
    SELECT dep_name, COUNT(DISTINCT project_id) as project_count,
           ecosystem,
           license, license_category
    FROM dependencies
    GROUP BY dep_name
    ORDER BY project_count DESC, dep_name ASC
    LIMIT 30
  `).all() as MostDepended[];

  // ── 3. HEAVIEST PACKAGES ──
  const heaviest = db.prepare(`
    SELECT d.project_id, p.name,
           COUNT(*) as total,
           SUM(CASE WHEN d.dep_type = 'runtime' THEN 1 ELSE 0 END) as runtime,
           SUM(CASE WHEN d.dep_type = 'dev' THEN 1 ELSE 0 END) as dev,
           SUM(CASE WHEN d.license_category = 'copyleft' THEN 1 ELSE 0 END) as copyleft,
           SUM(CASE WHEN d.license_category IS NULL OR d.license_category = 'unknown' OR d.license IS NULL THEN 1 ELSE 0 END) as unknown
    FROM dependencies d
    JOIN projects p ON p.id = d.project_id
    GROUP BY d.project_id
    ORDER BY total DESC
    LIMIT 20
  `).all() as HeaviestPkg[];

  // ── 4. LICENSE RISK MAP ──
  const conflicts = db.prepare(`
    SELECT d.project_id, p.name as pkg_name, p.license as pkg_license,
           d.dep_name, d.license as dep_license, d.license_category as dep_category
    FROM dependencies d
    JOIN projects p ON p.id = d.project_id
    WHERE (
      (d.license_category = 'copyleft' AND p.license NOT LIKE '%GPL%' AND p.license NOT LIKE '%AGPL%')
      OR (d.license IS NULL OR d.license = '' OR d.license_category = 'unknown')
    )
    ORDER BY
      CASE WHEN d.license_category = 'copyleft' THEN 0 ELSE 1 END,
      p.name, d.dep_name
  `).all() as Array<{
    project_id: number;
    pkg_name: string;
    pkg_license: string;
    dep_name: string;
    dep_license: string | null;
    dep_category: string | null;
  }>;

  const licenseConflicts: LicenseConflict[] = conflicts.map((r) => ({
    ...r,
    risk: r.dep_category === "copyleft" ? "HIGH" : "MEDIUM",
  }));

  // ── 5. ECOSYSTEM BREAKDOWN ──
  const ecoRows = db.prepare(`
    SELECT ecosystem, COUNT(*) as count
    FROM dependencies
    WHERE ecosystem != 'unknown'
    GROUP BY ecosystem
    ORDER BY count DESC
  `).all() as { ecosystem: string; count: number }[];

  const totalEcoDeps = ecoRows.reduce((s, r) => s + r.count, 0);

  const ecoBreakdown: EcoBreakdown[] = ecoRows.map((row) => {
    const topDep = db.prepare(`
      SELECT dep_name, COUNT(DISTINCT project_id) as c
      FROM dependencies
      WHERE ecosystem = ?
      GROUP BY dep_name
      ORDER BY c DESC
      LIMIT 1
    `).get(row.ecosystem) as { dep_name: string; c: number } | undefined;
    return {
      ecosystem: row.ecosystem,
      count: row.count,
      top_dep: topDep?.dep_name || "—",
    };
  });

  const viewWhere =
    view === "all"
      ? "deps_audit_json IS NOT NULL AND deps_audit_json != ''"
      : view === "unresolved"
        ? "deps_audit_json IS NOT NULL AND deps_audit_json != '' AND COALESCE(json_extract(deps_audit_json, '$.unresolved'), 0) > 0"
        : "deps_audit_json IS NOT NULL AND deps_audit_json != '' AND COALESCE(json_array_length(json_extract(deps_audit_json, '$.conflicts')), 0) > 0";

  const sortSql =
    sort === "unresolved"
      ? "unresolved DESC, conflict_count DESC, name ASC"
      : sort === "score"
        ? "score ASC, conflict_count DESC, unresolved DESC, name ASC"
        : sort === "recent"
          ? "scanned_at DESC, conflict_count DESC, unresolved DESC, name ASC"
          : sort === "name"
            ? "name ASC"
            : "conflict_count DESC, unresolved DESC, name ASC";

  const auditProjects = db.prepare(`
    SELECT id as project_id,
           name,
           deps_scanned_at as scanned_at,
           COALESCE(json_extract(deps_audit_json, '$.total_deps'), 0) as total_deps,
           COALESCE(json_extract(deps_audit_json, '$.resolved'), 0) as resolved,
           COALESCE(json_extract(deps_audit_json, '$.unresolved'), 0) as unresolved,
           COALESCE(json_array_length(json_extract(deps_audit_json, '$.conflicts')), 0) as conflict_count,
           COALESCE(json_array_length(json_extract(deps_audit_json, '$.warnings')), 0) as warning_count,
           COALESCE(json_extract(deps_audit_json, '$.score'), 0) as score
    FROM projects
    WHERE ${viewWhere}
    ORDER BY ${sortSql}
    LIMIT 25
  `).all() as AuditProjectRow[];

  return (
    <div>
      {/* Page title */}
      <div className="border-b-2 border-fm-green pb-1 mb-2">
        <h1 className="text-[14px] font-bold text-fm-green">
          Dependency Explorer
        </h1>
        <p className="text-[10px] text-fm-text-light mt-0.5">
          The dependency ecosystem across {overview.projects_scanned} scanned packages — {overview.total_deps.toLocaleString()} total dependencies tracked.
        </p>
      </div>

      {/* Anchor nav */}
      <div className="bg-fm-sidebar-bg border border-fm-border px-3 py-1.5 mb-4 text-[11px]">
        <span className="font-bold text-fm-text">Jump to: </span>
        <Link href="#overview" className="text-fm-link">overview</Link>
        {" | "}
        <Link href="#scan-health" className="text-fm-link">scan health</Link>
        {" | "}
        <Link href="#most-depended" className="text-fm-link">most depended-on</Link>
        {" | "}
        <Link href="#heaviest" className="text-fm-link">heaviest packages</Link>
        {" | "}
        <Link href="#license-risk" className="text-fm-link">license risk</Link>
        {" | "}
        <Link href="#ecosystem" className="text-fm-link">ecosystem breakdown</Link>
      </div>

      {/* ========== 1. OVERVIEW ========== */}
      <SectionHeader id="overview" title="Overview" />
      <div className="overflow-x-auto">
        <table className="border-collapse text-[11px] w-full max-w-[500px]">
          <tbody>
            {[
              ["Total dependencies tracked", overview.total_deps.toLocaleString()],
              ["Projects scanned", String(overview.projects_scanned)],
              ["Unique dependencies", overview.unique_deps.toLocaleString()],
              ["Ecosystems", String(overview.ecosystems)],
              ["License coverage", `${overview.license_coverage}%`],
              ["Copyleft dependencies", String(overview.copyleft_count)],
            ].map(([label, val], i) => (
              <tr key={label} className={i % 2 === 0 ? "bg-fm-sidebar-bg" : ""}>
                <td className="px-2 py-1 border border-fm-border font-bold text-fm-text">{label}</td>
                <td className="px-2 py-1 border border-fm-border font-mono text-right">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionHeader id="scan-health" title="Scan Health" />
      <p className="text-[10px] text-fm-text-light mb-2">
        Live backfill health: what has been audited, what is still missing, and which packages currently carry license conflicts.
      </p>
      <div className="grid gap-2 md:grid-cols-4 mb-3">
        {[
          ["Audited projects", scanHealth.audited_projects.toLocaleString()],
          ["Unscanned projects", scanHealth.unscanned_projects.toLocaleString()],
          ["Conflicts found", scanHealth.total_conflicts.toLocaleString()],
          ["Unknown licenses", scanHealth.unknown_licenses.toLocaleString()],
        ].map(([label, value]) => (
          <div key={label} className="bg-fm-sidebar-bg border border-fm-border rounded px-3 py-2">
            <div className="text-[10px] text-fm-text-light">{label}</div>
            <div className="text-[14px] font-bold text-fm-text">{value}</div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-fm-text-light mb-2">
        {scanHealth.scanned_projects_with_unknowns.toLocaleString()} audited projects still have unresolved license metadata.
      </div>
      <form method="GET" className="bg-fm-sidebar-bg border border-fm-border rounded px-3 py-2 mb-3 text-[10px]">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-fm-text-light">View</span>
            <select name="view" defaultValue={view} className="border border-fm-border bg-white px-1 py-0.5 text-[10px]">
              <option value="conflicts">conflicts only</option>
              <option value="unresolved">unresolved-heavy</option>
              <option value="all">all audited</option>
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-fm-text-light">Sort</span>
            <select name="sort" defaultValue={sort} className="border border-fm-border bg-white px-1 py-0.5 text-[10px]">
              <option value="conflicts">highest conflict count</option>
              <option value="unresolved">most unresolved</option>
              <option value="score">worst audit score</option>
              <option value="recent">recently scanned</option>
              <option value="name">name</option>
            </select>
          </label>
          <button type="submit" className="border border-[#999] bg-[#dddddd] text-black px-2 py-0.5 font-bold hover:bg-[#cccccc]">
            Apply
          </button>
          <a href="/dependencies#scan-health" className="text-fm-link hover:text-fm-link-hover">Reset</a>
          <span className="ml-auto text-fm-text-light">Showing {auditProjects.length} projects</span>
        </div>
      </form>
      <div className="overflow-x-auto mb-4">
        <table className="border-collapse text-[10px] w-full">
          <thead>
            <tr className="bg-fm-sidebar-bg">
              <th className="px-2 py-1 border border-fm-border text-left">Project</th>
              <th className="px-2 py-1 border border-fm-border text-right">Conflicts</th>
              <th className="px-2 py-1 border border-fm-border text-right">Unresolved</th>
              <th className="px-2 py-1 border border-fm-border text-right">Audit Score</th>
              <th className="px-2 py-1 border border-fm-border text-right">Scanned</th>
            </tr>
          </thead>
          <tbody>
            {auditProjects.map((row, i) => (
              <tr key={row.project_id} className={i % 2 === 0 ? "bg-white/50" : ""}>
                <td className="px-2 py-1 border border-fm-border">
                  <Link href={`/projects/${encodeURIComponent(row.name)}`} className="text-fm-link font-bold">
                    {row.name}
                  </Link>
                </td>
                <td className="px-2 py-1 border border-fm-border text-right font-mono font-bold text-red-700">{row.conflict_count}</td>
                <td className="px-2 py-1 border border-fm-border text-right font-mono text-yellow-700">{row.unresolved}</td>
                <td className="px-2 py-1 border border-fm-border text-right font-mono">{row.score}</td>
                <td className="px-2 py-1 border border-fm-border text-right text-fm-text-light">{row.scanned_at ? new Date(row.scanned_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ========== 2. MOST DEPENDED-ON ========== */}
      <SectionHeader id="most-depended" title="Most Depended-On" />
      <p className="text-[10px] text-fm-text-light mb-2">
        What does the agent ecosystem actually depend on? Top 30 dependencies by project usage.
      </p>
      <div className="overflow-x-auto">
        <table className="border-collapse text-[10px] w-full">
          <thead>
            <tr className="bg-fm-sidebar-bg">
              <th className="px-2 py-1 border border-fm-border text-left">#</th>
              <th className="px-2 py-1 border border-fm-border text-left">Dependency</th>
              <th className="px-2 py-1 border border-fm-border text-right">Used by</th>
              <th className="px-2 py-1 border border-fm-border text-center">Ecosystem</th>
              <th className="px-2 py-1 border border-fm-border text-center">License</th>
            </tr>
          </thead>
          <tbody>
            {mostDepended.map((row, i) => (
              <tr key={row.dep_name} className={i % 2 === 0 ? "bg-white/50" : ""}>
                <td className="px-2 py-1 border border-fm-border text-fm-text-light font-mono">{i + 1}</td>
                <td className="px-2 py-1 border border-fm-border font-bold">{row.dep_name}</td>
                <td className="px-2 py-1 border border-fm-border text-right font-mono">
                  {row.project_count} {row.project_count === 1 ? "project" : "projects"}
                </td>
                <td className="px-2 py-1 border border-fm-border text-center">
                  <EcoBadge eco={row.ecosystem} />
                </td>
                <td className="px-2 py-1 border border-fm-border text-center">
                  <LicensePill license={row.license} category={row.license_category} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ========== 3. HEAVIEST PACKAGES ========== */}
      <SectionHeader id="heaviest" title="Heaviest Packages" />
      <p className="text-[10px] text-fm-text-light mb-2">
        Packages with the most dependencies. Top 20.
      </p>
      <div className="overflow-x-auto">
        <table className="border-collapse text-[10px] w-full">
          <thead>
            <tr className="bg-fm-sidebar-bg">
              <th className="px-2 py-1 border border-fm-border text-left">#</th>
              <th className="px-2 py-1 border border-fm-border text-left">Package</th>
              <th className="px-2 py-1 border border-fm-border text-right">Total Deps</th>
              <th className="px-2 py-1 border border-fm-border text-right">Runtime</th>
              <th className="px-2 py-1 border border-fm-border text-right">Dev</th>
              <th className="px-2 py-1 border border-fm-border text-center">License Risk</th>
            </tr>
          </thead>
          <tbody>
            {heaviest.map((row, i) => {
              const riskParts: string[] = [];
              if (row.copyleft > 0) riskParts.push(`${row.copyleft} copyleft`);
              if (row.unknown > 0) riskParts.push(`${row.unknown} unknown`);
              const riskText = riskParts.length > 0 ? riskParts.join(", ") : "clean";
              const riskColor = row.copyleft > 0
                ? "text-red-700 font-bold"
                : row.unknown > 0
                  ? "text-yellow-700"
                  : "text-green-700";
              return (
                <tr key={row.project_id} className={i % 2 === 0 ? "bg-white/50" : ""}>
                  <td className="px-2 py-1 border border-fm-border text-fm-text-light font-mono">{i + 1}</td>
                  <td className="px-2 py-1 border border-fm-border">
                    <Link href={`/projects/${encodeURIComponent(row.name)}`} className="text-fm-link font-bold">
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-2 py-1 border border-fm-border text-right font-mono font-bold">{row.total}</td>
                  <td className="px-2 py-1 border border-fm-border text-right font-mono">{row.runtime}</td>
                  <td className="px-2 py-1 border border-fm-border text-right font-mono">{row.dev}</td>
                  <td className={`px-2 py-1 border border-fm-border text-center text-[9px] ${riskColor}`}>{riskText}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ========== 4. LICENSE RISK MAP ========== */}
      <SectionHeader id="license-risk" title="License Risk Map" />
      <p className="text-[10px] text-fm-text-light mb-2">
        Packages with potential license conflicts. Copyleft dependency in a permissive project = HIGH risk. Unknown license = MEDIUM risk.
      </p>
      {licenseConflicts.length === 0 ? (
        <p className="text-[11px] text-fm-text-light italic">
          No license conflicts detected. 🎉
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse text-[10px] w-full">
            <thead>
              <tr className="bg-fm-sidebar-bg">
                <th className="px-2 py-1 border border-fm-border text-left">Package</th>
                <th className="px-2 py-1 border border-fm-border text-left">Package License</th>
                <th className="px-2 py-1 border border-fm-border text-left">Dependency</th>
                <th className="px-2 py-1 border border-fm-border text-left">Dep License</th>
                <th className="px-2 py-1 border border-fm-border text-center">Risk</th>
              </tr>
            </thead>
            <tbody>
              {licenseConflicts.slice(0, 100).map((row, i) => (
                <tr key={`${row.project_id}-${row.dep_name}`} className={i % 2 === 0 ? "bg-white/50" : ""}>
                  <td className="px-2 py-1 border border-fm-border">
                    <Link href={`/projects/${encodeURIComponent(row.pkg_name)}`} className="text-fm-link font-bold">
                      {row.pkg_name}
                    </Link>
                  </td>
                  <td className="px-2 py-1 border border-fm-border font-mono">{row.pkg_license}</td>
                  <td className="px-2 py-1 border border-fm-border font-bold">{row.dep_name}</td>
                  <td className="px-2 py-1 border border-fm-border font-mono">{row.dep_license || "—"}</td>
                  <td className="px-2 py-1 border border-fm-border text-center">
                    <RiskBadge level={row.risk} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {licenseConflicts.length > 100 && (
            <p className="text-[10px] text-fm-text-light mt-1 italic">
              Showing first 100 of {licenseConflicts.length} conflicts.
            </p>
          )}
        </div>
      )}

      {/* ========== 5. ECOSYSTEM BREAKDOWN ========== */}
      <SectionHeader id="ecosystem" title="Ecosystem Breakdown" />
      <p className="text-[10px] text-fm-text-light mb-2">
        Dependency distribution across package ecosystems.
      </p>

      {/* Inline bar chart */}
      {totalEcoDeps > 0 && (
        <div className="mb-3">
          <div
            className="flex w-full overflow-hidden"
            style={{ height: 24, borderRadius: 6 }}
          >
            {ecoBreakdown.map((row, i) => {
              const pct = (row.count / totalEcoDeps) * 100;
              if (pct < 0.3) return null;
              const color = ECO_COLORS[row.ecosystem] || ECO_COLORS.unknown;
              const isFirst = i === 0;
              const isLast = i === ecoBreakdown.length - 1 ||
                ecoBreakdown.slice(i + 1).every((r) => (r.count / totalEcoDeps) * 100 < 0.3);
              return (
                <div
                  key={row.ecosystem}
                  title={`${row.ecosystem}: ${row.count} (${pct.toFixed(1)}%)`}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                    borderTopLeftRadius: isFirst ? 6 : 0,
                    borderBottomLeftRadius: isFirst ? 6 : 0,
                    borderTopRightRadius: isLast ? 6 : 0,
                    borderBottomRightRadius: isLast ? 6 : 0,
                  }}
                  className="flex items-center justify-center text-[9px] font-bold text-white overflow-hidden whitespace-nowrap"
                >
                  {pct > 10 ? row.ecosystem : ""}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {ecoBreakdown.map((row) => {
              const pct = (row.count / totalEcoDeps) * 100;
              return (
                <div key={row.ecosystem} className="flex items-center gap-1 text-[10px] text-fm-text">
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 8, height: 8, backgroundColor: ECO_COLORS[row.ecosystem] || ECO_COLORS.unknown }}
                  />
                  <span className="font-bold">{row.ecosystem}</span>
                  <span className="text-fm-text-light">
                    {row.count.toLocaleString()} ({pct.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ecosystem table */}
      <div className="overflow-x-auto">
        <table className="border-collapse text-[10px] w-full max-w-[600px]">
          <thead>
            <tr className="bg-fm-sidebar-bg">
              <th className="px-2 py-1 border border-fm-border text-left">Ecosystem</th>
              <th className="px-2 py-1 border border-fm-border text-right">Dependencies</th>
              <th className="px-2 py-1 border border-fm-border text-right">Share</th>
              <th className="px-2 py-1 border border-fm-border text-left">Most Common Dep</th>
            </tr>
          </thead>
          <tbody>
            {ecoBreakdown.map((row, i) => (
              <tr key={row.ecosystem} className={i % 2 === 0 ? "bg-white/50" : ""}>
                <td className="px-2 py-1 border border-fm-border">
                  <EcoBadge eco={row.ecosystem} />
                </td>
                <td className="px-2 py-1 border border-fm-border text-right font-mono font-bold">
                  {row.count.toLocaleString()}
                </td>
                <td className="px-2 py-1 border border-fm-border text-right font-mono">
                  {totalEcoDeps > 0 ? ((row.count / totalEcoDeps) * 100).toFixed(1) : 0}%
                </td>
                <td className="px-2 py-1 border border-fm-border font-bold">{row.top_dep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
