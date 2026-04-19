import { getDb } from "./db";

// ── Types ────────────────────────────────────────────────────────────

export interface Dependency {
  id: number;
  project_id: number;
  dep_name: string;
  dep_version: string;
  dep_type: string;
  ecosystem: string;
  license: string | null;
  license_category: string | null;
  dep_repo_url: string | null;
  resolved_at: string | null;
}

export interface LicenseAudit {
  project_license: string;
  project_license_category: string;
  total_deps: number;
  resolved: number;
  unresolved: number;
  permissive: number;
  copyleft: number;
  weak_copyleft: number;
  unknown: number;
  conflicts: LicenseConflict[];
  warnings: string[];
  score: number; // 0-100
  scanned_at: string;
}

export interface LicenseConflict {
  dep_name: string;
  dep_license: string;
  dep_category: string;
  project_license: string;
  reason: string;
  severity: "error" | "warning";
}

export interface DependencyAuditSummary {
  project_id: number;
  total_deps: number;
  resolved: number;
  unresolved: number;
  conflict_count: number;
  warning_count: number;
  score: number;
  scanned_at: string | null;
}

export interface DependencyConflictProject extends DependencyAuditSummary {
  name: string;
}

export interface DependencyScanHealth {
  total_projects: number;
  audited_projects: number;
  unscanned_projects: number;
  total_conflicts: number;
  unknown_licenses: number;
  scanned_projects_with_unknowns: number;
}

// ── License classification ───────────────────────────────────────────

const PERMISSIVE = new Set([
  "MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0",
  "Unlicense", "0BSD", "CC0-1.0", "Zlib", "BSL-1.0", "PSF-2.0",
  "MIT-0", "BlueOak-1.0.0",
]);

const COPYLEFT = new Set([
  "GPL-2.0", "GPL-2.0-only", "GPL-2.0-or-later",
  "GPL-3.0", "GPL-3.0-only", "GPL-3.0-or-later",
  "AGPL-3.0", "AGPL-3.0-only", "AGPL-3.0-or-later",
  "SSPL-1.0", "EUPL-1.2", "OSL-3.0",
]);

const WEAK_COPYLEFT = new Set([
  "LGPL-2.1", "LGPL-2.1-only", "LGPL-2.1-or-later",
  "LGPL-3.0", "LGPL-3.0-only", "LGPL-3.0-or-later",
  "MPL-2.0", "EPL-2.0", "EPL-1.0", "CDDL-1.0",
  "CPL-1.0", "CC-BY-SA-4.0",
]);

export function classifyLicense(spdx: string | null | undefined): string {
  if (!spdx || spdx === "NOASSERTION" || spdx === "NONE") return "unknown";
  const normalized = spdx.replace(/-only$/, "").replace(/-or-later$/, "");
  if (PERMISSIVE.has(spdx) || PERMISSIVE.has(normalized)) return "permissive";
  if (COPYLEFT.has(spdx) || COPYLEFT.has(normalized)) return "copyleft";
  if (WEAK_COPYLEFT.has(spdx) || WEAK_COPYLEFT.has(normalized)) return "weak_copyleft";
  return "unknown";
}

// ── Package file parsers ─────────────────────────────────────────────

interface ParsedDep {
  name: string;
  version: string;
  type: string; // runtime, dev, optional, peer
}

export function parsePackageJson(content: string): { ecosystem: string; deps: ParsedDep[] } {
  const pkg = JSON.parse(content);
  const deps: ParsedDep[] = [];

  for (const [name, version] of Object.entries(pkg.dependencies || {})) {
    deps.push({ name, version: String(version), type: "runtime" });
  }
  for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
    deps.push({ name, version: String(version), type: "dev" });
  }
  for (const [name, version] of Object.entries(pkg.peerDependencies || {})) {
    deps.push({ name, version: String(version), type: "peer" });
  }
  for (const [name, version] of Object.entries(pkg.optionalDependencies || {})) {
    deps.push({ name, version: String(version), type: "optional" });
  }

  return { ecosystem: "npm", deps };
}

export function parseRequirementsTxt(content: string): { ecosystem: string; deps: ParsedDep[] } {
  const deps: ParsedDep[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;
    // Handle: package==1.0, package>=1.0, package~=1.0, package
    const match = trimmed.match(/^([a-zA-Z0-9_.-]+)\s*([><=!~]+\s*[\d.*]+)?/);
    if (match) {
      deps.push({ name: match[1], version: match[2]?.trim() || "*", type: "runtime" });
    }
  }
  return { ecosystem: "pypi", deps };
}

export function parsePyprojectToml(content: string): { ecosystem: string; deps: ParsedDep[] } {
  const deps: ParsedDep[] = [];
  // Simple TOML parsing for dependencies array
  const depsMatch = content.match(/\bdependencies\s*=\s*\[([\s\S]*?)\]/);
  if (depsMatch) {
    const entries = depsMatch[1].match(/"([^"]+)"/g) || [];
    for (const entry of entries) {
      const clean = entry.replace(/"/g, "");
      const match = clean.match(/^([a-zA-Z0-9_.-]+)\s*(.*)?$/);
      if (match) {
        deps.push({ name: match[1], version: match[2]?.trim() || "*", type: "runtime" });
      }
    }
  }
  // Optional deps
  const optMatch = content.match(/\[project\.optional-dependencies\]([\s\S]*?)(?:\n\[|$)/);
  if (optMatch) {
    const entries = optMatch[1].match(/"([^"]+)"/g) || [];
    for (const entry of entries) {
      const clean = entry.replace(/"/g, "");
      const match = clean.match(/^([a-zA-Z0-9_.-]+)/);
      if (match) {
        deps.push({ name: match[1], version: "*", type: "optional" });
      }
    }
  }
  return { ecosystem: "pypi", deps };
}

export function parseCargoToml(content: string): { ecosystem: string; deps: ParsedDep[] } {
  const deps: ParsedDep[] = [];
  // Match [dependencies] section
  const sections = [
    { regex: /\[dependencies\]([\s\S]*?)(?:\n\[|$)/, type: "runtime" as const },
    { regex: /\[dev-dependencies\]([\s\S]*?)(?:\n\[|$)/, type: "dev" as const },
    { regex: /\[build-dependencies\]([\s\S]*?)(?:\n\[|$)/, type: "dev" as const },
  ];
  for (const { regex, type } of sections) {
    const match = content.match(regex);
    if (!match) continue;
    for (const line of match[1].split("\n")) {
      const depMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
      if (depMatch) {
        deps.push({ name: depMatch[1], version: depMatch[2], type });
        continue;
      }
      const tableMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*\{.*version\s*=\s*"([^"]+)"/);
      if (tableMatch) {
        deps.push({ name: tableMatch[1], version: tableMatch[2], type });
      }
    }
  }
  return { ecosystem: "cargo", deps };
}

export function parseGoMod(content: string): { ecosystem: string; deps: ParsedDep[] } {
  const deps: ParsedDep[] = [];
  const requireBlock = content.match(/require\s*\(([\s\S]*?)\)/);
  const lines = requireBlock ? requireBlock[1].split("\n") : content.split("\n");
  for (const line of lines) {
    const match = line.trim().match(/^([\w./\-@]+)\s+(v[\d.]+\S*)/);
    if (match && !match[1].startsWith("//")) {
      deps.push({ name: match[1], version: match[2], type: "runtime" });
    }
  }
  return { ecosystem: "go", deps };
}

// ── Detect and parse from file map ───────────────────────────────────

const PARSERS: Record<string, (content: string) => { ecosystem: string; deps: ParsedDep[] }> = {
  "package.json": parsePackageJson,
  "requirements.txt": parseRequirementsTxt,
  "pyproject.toml": parsePyprojectToml,
  "Cargo.toml": parseCargoToml,
  "go.mod": parseGoMod,
};

export const SUPPORTED_FILES = Object.keys(PARSERS);

export function parseDepFile(filename: string, content: string): { ecosystem: string; deps: ParsedDep[] } | null {
  const parser = PARSERS[filename];
  if (!parser) return null;
  try {
    return parser(content);
  } catch {
    return null;
  }
}

// ── License resolution from registries ───────────────────────────────

export async function resolveNpmLicense(name: string): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.license || null;
  } catch {
    return null;
  }
}

export async function resolvePypiLicense(name: string): Promise<string | null> {
  try {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.info?.license || null;
  } catch {
    return null;
  }
}

export async function resolveCratesLicense(name: string): Promise<string | null> {
  try {
    const res = await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`, {
      headers: { "User-Agent": "freshcrate" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.crate?.max_version_license || data.versions?.[0]?.license || null;
  } catch {
    return null;
  }
}

const RESOLVERS: Record<string, (name: string) => Promise<string | null>> = {
  npm: resolveNpmLicense,
  pypi: resolvePypiLicense,
  cargo: resolveCratesLicense,
};

export async function resolveLicense(ecosystem: string, name: string): Promise<string | null> {
  const resolver = RESOLVERS[ecosystem];
  return resolver ? resolver(name) : null;
}

// ── GitHub file fetcher ──────────────────────────────────────────────

export async function fetchDepFiles(owner: string, repo: string, token?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw+json",
    "User-Agent": "freshcrate",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const files: Record<string, string> = {};

  await Promise.all(
    SUPPORTED_FILES.map(async (filename) => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`,
          { headers }
        );
        if (res.ok) {
          files[filename] = await res.text();
        }
      } catch {
        // file doesn't exist, skip
      }
    })
  );

  return files;
}

// ── Full scan pipeline ───────────────────────────────────────────────

export async function scanDependencies(
  projectId: number,
  owner: string,
  repo: string,
  token?: string
): Promise<{ ecosystem: string; deps: Dependency[]; audit: LicenseAudit }> {
  const db = getDb();

  // 1. Fetch dep files from GitHub
  const files = await fetchDepFiles(owner, repo, token);

  // 2. Parse all found dep files
  let ecosystem = "unknown";
  const allDeps: ParsedDep[] = [];

  for (const [filename, content] of Object.entries(files)) {
    const result = parseDepFile(filename, content);
    if (result) {
      ecosystem = result.ecosystem;
      allDeps.push(...result.deps);
    }
  }

  // 3. Deduplicate
  const seen = new Set<string>();
  const uniqueDeps = allDeps.filter((d) => {
    const key = `${d.name}:${d.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 4. Clear old deps for this project
  db.prepare("DELETE FROM dependencies WHERE project_id = ?").run(projectId);

  // 5. Resolve licenses and insert
  const insert = db.prepare(
    `INSERT INTO dependencies (project_id, dep_name, dep_version, dep_type, ecosystem, license, license_category, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const inserted: Dependency[] = [];

  // Batch resolve licenses (limit concurrency)
  const BATCH_SIZE = 10;
  for (let i = 0; i < uniqueDeps.length; i += BATCH_SIZE) {
    const batch = uniqueDeps.slice(i, i + BATCH_SIZE);
    const resolved = await Promise.all(
      batch.map(async (dep) => {
        const license = await resolveLicense(ecosystem, dep.name);
        const category = classifyLicense(license);
        return { ...dep, license, category };
      })
    );

    for (const dep of resolved) {
      const result = insert.run(
        projectId,
        dep.name,
        dep.version,
        dep.type,
        ecosystem,
        dep.license,
        dep.category,
        dep.license ? new Date().toISOString() : null
      );
      inserted.push({
        id: result.lastInsertRowid as number,
        project_id: projectId,
        dep_name: dep.name,
        dep_version: dep.version,
        dep_type: dep.type,
        ecosystem,
        license: dep.license,
        license_category: dep.category,
        dep_repo_url: null,
        resolved_at: dep.license ? new Date().toISOString() : null,
      });
    }
  }

  // 6. Run license audit
  const project = db.prepare("SELECT license FROM projects WHERE id = ?").get(projectId) as { license: string } | undefined;
  const audit = auditLicenses(project?.license || "Unknown", inserted);

  // 7. Store audit results
  db.prepare("UPDATE projects SET deps_scanned_at = ?, deps_audit_json = ? WHERE id = ?")
    .run(new Date().toISOString(), JSON.stringify(audit), projectId);

  return { ecosystem, deps: inserted, audit };
}

// ── License audit logic ──────────────────────────────────────────────

export function auditLicenses(projectLicense: string, deps: Dependency[]): LicenseAudit {
  const projectCategory = classifyLicense(projectLicense);
  const runtimeDeps = deps.filter((d) => d.dep_type === "runtime" || d.dep_type === "peer");
  const allDeps = deps;

  const counts = { permissive: 0, copyleft: 0, weak_copyleft: 0, unknown: 0 };
  let resolved = 0;

  for (const dep of allDeps) {
    const cat = dep.license_category || "unknown";
    if (cat in counts) counts[cat as keyof typeof counts]++;
    if (dep.license) resolved++;
  }

  const conflicts: LicenseConflict[] = [];
  const warnings: string[] = [];

  for (const dep of runtimeDeps) {
    const depCat = dep.license_category || "unknown";

    // Copyleft dep in permissive project = conflict
    if (depCat === "copyleft" && projectCategory === "permissive") {
      conflicts.push({
        dep_name: dep.dep_name,
        dep_license: dep.license || "unknown",
        dep_category: depCat,
        project_license: projectLicense,
        reason: `Copyleft dependency (${dep.license}) in a permissive (${projectLicense}) project — derivative work must be relicensed`,
        severity: "error",
      });
    }

    // AGPL in non-AGPL project = warning (network use trigger)
    if (dep.license?.startsWith("AGPL") && !projectLicense.startsWith("AGPL")) {
      conflicts.push({
        dep_name: dep.dep_name,
        dep_license: dep.license,
        dep_category: depCat,
        project_license: projectLicense,
        reason: `AGPL dependency triggers source disclosure for network/API use`,
        severity: "error",
      });
    }

    // GPL-2.0 with Apache-2.0 = incompatible
    if (dep.license?.startsWith("GPL-2.0") && projectLicense === "Apache-2.0") {
      conflicts.push({
        dep_name: dep.dep_name,
        dep_license: dep.license,
        dep_category: depCat,
        project_license: projectLicense,
        reason: `GPL-2.0 is not compatible with Apache-2.0 (patent clause conflict)`,
        severity: "error",
      });
    }

    // Unknown license = warning
    if (depCat === "unknown" && dep.dep_type === "runtime") {
      warnings.push(`${dep.dep_name}: license unknown — could be proprietary or restrictive`);
    }
  }

  // Copyleft in weak_copyleft project
  for (const dep of runtimeDeps) {
    if (dep.license_category === "copyleft" && projectCategory === "weak_copyleft") {
      conflicts.push({
        dep_name: dep.dep_name,
        dep_license: dep.license || "unknown",
        dep_category: dep.license_category,
        project_license: projectLicense,
        reason: `Strong copyleft (${dep.license}) may override weak copyleft (${projectLicense})`,
        severity: "warning",
      });
    }
  }

  // No license on project itself
  if (projectCategory === "unknown") {
    warnings.push("Project license is unknown — agents cannot determine usage rights");
  }

  // Score: start at 100, deduct for issues
  let score = 100;
  score -= conflicts.filter((c) => c.severity === "error").length * 20;
  score -= conflicts.filter((c) => c.severity === "warning").length * 5;
  score -= warnings.length * 2;
  if (allDeps.length > 0) {
    const unresolvedPct = (allDeps.length - resolved) / allDeps.length;
    score -= Math.round(unresolvedPct * 20);
  }
  score = Math.max(0, Math.min(100, score));

  return {
    project_license: projectLicense,
    project_license_category: projectCategory,
    total_deps: allDeps.length,
    resolved,
    unresolved: allDeps.length - resolved,
    ...counts,
    conflicts,
    warnings,
    score,
    scanned_at: new Date().toISOString(),
  };
}

// ── Query helpers ────────────────────────────────────────────────────

export function getDependencies(projectId: number): Dependency[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM dependencies WHERE project_id = ? ORDER BY dep_type, dep_name"
  ).all(projectId) as Dependency[];
}

export function getDependencyAudit(projectId: number): LicenseAudit | null {
  const db = getDb();
  const row = db.prepare(
    "SELECT deps_audit_json FROM projects WHERE id = ?"
  ).get(projectId) as { deps_audit_json: string | null } | undefined;
  if (!row?.deps_audit_json) return null;
  try {
    return JSON.parse(row.deps_audit_json);
  } catch {
    return null;
  }
}

export function getDependencyAuditSummary(projectId: number): DependencyAuditSummary | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT id as project_id,
            deps_scanned_at as scanned_at,
            json_extract(deps_audit_json, '$.total_deps') as total_deps,
            json_extract(deps_audit_json, '$.resolved') as resolved,
            json_extract(deps_audit_json, '$.unresolved') as unresolved,
            json_array_length(json_extract(deps_audit_json, '$.conflicts')) as conflict_count,
            json_array_length(json_extract(deps_audit_json, '$.warnings')) as warning_count,
            json_extract(deps_audit_json, '$.score') as score
     FROM projects
     WHERE id = ? AND deps_audit_json IS NOT NULL AND deps_audit_json != ''`
  ).get(projectId) as {
    project_id: number;
    scanned_at: string | null;
    total_deps: number | null;
    resolved: number | null;
    unresolved: number | null;
    conflict_count: number | null;
    warning_count: number | null;
    score: number | null;
  } | undefined;

  if (!row) return null;
  return {
    project_id: row.project_id,
    scanned_at: row.scanned_at,
    total_deps: row.total_deps ?? 0,
    resolved: row.resolved ?? 0,
    unresolved: row.unresolved ?? 0,
    conflict_count: row.conflict_count ?? 0,
    warning_count: row.warning_count ?? 0,
    score: row.score ?? 0,
  };
}

export function getProjectsWithDependencyConflicts(limit = 20): DependencyConflictProject[] {
  const db = getDb();
  return db.prepare(
    `SELECT id as project_id,
            name,
            deps_scanned_at as scanned_at,
            json_extract(deps_audit_json, '$.total_deps') as total_deps,
            json_extract(deps_audit_json, '$.resolved') as resolved,
            json_extract(deps_audit_json, '$.unresolved') as unresolved,
            json_array_length(json_extract(deps_audit_json, '$.conflicts')) as conflict_count,
            json_array_length(json_extract(deps_audit_json, '$.warnings')) as warning_count,
            json_extract(deps_audit_json, '$.score') as score
     FROM projects
     WHERE deps_audit_json IS NOT NULL AND deps_audit_json != ''
       AND COALESCE(json_array_length(json_extract(deps_audit_json, '$.conflicts')), 0) > 0
     ORDER BY conflict_count DESC, unresolved DESC, name ASC
     LIMIT ?`
  ).all(limit) as DependencyConflictProject[];
}

export function getDependencyScanHealth(): DependencyScanHealth {
  const db = getDb();
  const total_projects = (db.prepare("SELECT COUNT(*) as c FROM projects").get() as { c: number }).c;
  const audited_projects = (db.prepare(
    "SELECT COUNT(*) as c FROM projects WHERE deps_audit_json IS NOT NULL AND deps_audit_json != ''"
  ).get() as { c: number }).c;
  const unscanned_projects = (db.prepare(
    "SELECT COUNT(*) as c FROM projects WHERE deps_scanned_at IS NULL"
  ).get() as { c: number }).c;
  const total_conflicts = (db.prepare(
    `SELECT COALESCE(SUM(COALESCE(json_array_length(json_extract(deps_audit_json, '$.conflicts')), 0)), 0) as c
     FROM projects
     WHERE deps_audit_json IS NOT NULL AND deps_audit_json != ''`
  ).get() as { c: number }).c;
  const unknown_licenses = (db.prepare(
    "SELECT COUNT(*) as c FROM dependencies WHERE license IS NULL OR license = '' OR license_category IS NULL OR license_category = 'unknown'"
  ).get() as { c: number }).c;
  const scanned_projects_with_unknowns = (db.prepare(
    `SELECT COUNT(*) as c
     FROM projects
     WHERE deps_audit_json IS NOT NULL AND deps_audit_json != ''
       AND COALESCE(json_extract(deps_audit_json, '$.unresolved'), 0) > 0`
  ).get() as { c: number }).c;

  return {
    total_projects,
    audited_projects,
    unscanned_projects,
    total_conflicts,
    unknown_licenses,
    scanned_projects_with_unknowns,
  };
}
