import { getDb } from "./db";

/**
 * Verification checks — each returns pass/fail with evidence.
 * All checks are machine-executable, no human review needed.
 */

export interface VerificationCheck {
  check: string;
  passed: boolean;
  detail: string;
}

export interface VerificationResult {
  verified: boolean;
  score: number;       // 0-100
  checks: VerificationCheck[];
  verified_at: string;
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

async function ghFetch(url: string): Promise<any> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "freshcrate-verify",
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Run all verification checks against a package.
 * Returns a scored result with individual check outcomes.
 */
export async function verifyPackage(project: {
  id: number;
  name: string;
  short_desc: string;
  description: string;
  repo_url: string;
  homepage_url: string;
  license: string;
  author: string;
  latest_version: string;
}): Promise<VerificationResult> {
  const checks: VerificationCheck[] = [];

  // ── Check 1: Repository exists and is accessible ──
  const repoInfo = parseGithubUrl(project.repo_url);
  let repoData: any = null;
  if (repoInfo) {
    repoData = await ghFetch(
      `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`
    );
  }

  checks.push({
    check: "repo_exists",
    passed: !!repoData,
    detail: repoData
      ? `Repository found: ${repoData.full_name}`
      : `Repository not accessible: ${project.repo_url}`,
  });

  // ── Check 2: Repository is not archived ──
  if (repoData) {
    checks.push({
      check: "not_archived",
      passed: !repoData.archived,
      detail: repoData.archived
        ? "Repository is archived"
        : "Repository is active",
    });
  }

  // ── Check 3: Has recent activity (pushed in last 12 months) ──
  if (repoData) {
    const lastPush = new Date(repoData.pushed_at);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const isActive = lastPush > oneYearAgo;

    checks.push({
      check: "recent_activity",
      passed: isActive,
      detail: `Last push: ${repoData.pushed_at.slice(0, 10)} (${isActive ? "active" : "stale"})`,
    });
  }

  // ── Check 4: Description matches (fuzzy) ──
  if (repoData && repoData.description) {
    // Check if repo description overlaps meaningfully with submitted description
    const repoWords = new Set(
      repoData.description.toLowerCase().split(/\W+/).filter((w: string) => w.length > 3)
    );
    const submittedWords = project.short_desc
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3);
    const overlap = submittedWords.filter((w) => repoWords.has(w)).length;
    const ratio = submittedWords.length > 0 ? overlap / submittedWords.length : 0;
    const matches = ratio > 0.2;

    checks.push({
      check: "description_matches",
      passed: matches,
      detail: `${Math.round(ratio * 100)}% word overlap with GitHub description (threshold: 20%)`,
    });
  }

  // ── Check 5: License matches ──
  if (repoData) {
    const ghLicense = repoData.license?.spdx_id || "Unknown";
    const matches =
      ghLicense === project.license ||
      ghLicense === "NOASSERTION" ||
      project.license === "Unknown";

    checks.push({
      check: "license_matches",
      passed: matches,
      detail: matches
        ? `License confirmed: ${ghLicense}`
        : `Mismatch: submitted "${project.license}", GitHub has "${ghLicense}"`,
    });
  }

  // ── Check 6: Has a release or tag ──
  if (repoInfo) {
    const releases = await ghFetch(
      `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/releases?per_page=1`
    );
    const hasRelease = releases && releases.length > 0;

    if (!hasRelease) {
      const tags = await ghFetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/tags?per_page=1`
      );
      checks.push({
        check: "has_release",
        passed: !!(tags && tags.length > 0),
        detail: tags && tags.length > 0
          ? `Has tag: ${tags[0].name}`
          : "No releases or tags found",
      });
    } else {
      checks.push({
        check: "has_release",
        passed: true,
        detail: `Latest release: ${releases[0].tag_name}`,
      });
    }
  }

  // ── Check 7: Has a README ──
  if (repoInfo) {
    const readme = await ghFetch(
      `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/readme`
    );
    checks.push({
      check: "has_readme",
      passed: !!readme,
      detail: readme ? `README found (${readme.size} bytes)` : "No README",
    });
  }

  // ── Check 8: Minimum stars (basic legitimacy signal) ──
  if (repoData) {
    const minStars = 5;
    checks.push({
      check: "minimum_stars",
      passed: repoData.stargazers_count >= minStars,
      detail: `${repoData.stargazers_count} stars (minimum: ${minStars})`,
    });
  }

  // ── Check 9: Not a fork (original work) ──
  if (repoData) {
    checks.push({
      check: "not_fork",
      passed: !repoData.fork,
      detail: repoData.fork
        ? `Fork of ${repoData.parent?.full_name || "unknown"}`
        : "Original repository",
    });
  }

  // ── Check 10: Has a license file ──
  if (repoData) {
    checks.push({
      check: "has_license",
      passed: !!repoData.license,
      detail: repoData.license
        ? `License: ${repoData.license.spdx_id}`
        : "No license detected",
    });
  }

  // ── Score ──
  const passed = checks.filter((c) => c.passed).length;
  const score = checks.length > 0 ? Math.round((passed / checks.length) * 100) : 0;
  const verified = score >= 70; // 7/10 checks must pass

  const result: VerificationResult = {
    verified,
    score,
    checks,
    verified_at: new Date().toISOString(),
  };

  return result;
}

/**
 * Run verification and persist results to the database.
 */
export async function verifyAndStore(projectId: number): Promise<VerificationResult> {
  const db = getDb();

  const project = db
    .prepare(
      `SELECT p.id, p.name, p.short_desc, p.description, p.repo_url,
              p.homepage_url, p.license, p.author,
              r.version as latest_version
       FROM projects p
       LEFT JOIN releases r ON r.project_id = p.id
         AND r.id = (SELECT MAX(r2.id) FROM releases r2 WHERE r2.project_id = p.id)
       WHERE p.id = ?`
    )
    .get(projectId) as any;

  if (!project) throw new Error(`Project ${projectId} not found`);

  const result = await verifyPackage(project);

  db.prepare(
    `UPDATE projects
     SET verified = ?, verification_json = ?, verified_at = ?
     WHERE id = ?`
  ).run(
    result.verified ? 1 : 0,
    JSON.stringify(result),
    result.verified_at,
    projectId
  );

  return result;
}

/**
 * Get verification status for a project.
 */
export function getVerificationStatus(projectId: number): VerificationResult | null {
  const db = getDb();
  const row = db
    .prepare("SELECT verification_json FROM projects WHERE id = ?")
    .get(projectId) as { verification_json: string } | undefined;

  if (!row || row.verification_json === "{}") return null;

  try {
    const data = JSON.parse(row.verification_json);
    // Handle legacy format where checks is {name: bool} instead of [{check, passed, detail}]
    if (data.checks && !Array.isArray(data.checks)) {
      data.checks = Object.entries(data.checks).map(([check, passed]) => ({
        check,
        passed: !!passed,
        detail: "",
      }));
      data.verified = (data.score ?? 0) >= 70;
      data.verified_at = data.checked_at || data.verified_at;
    }
    return data;
  } catch {
    return null;
  }
}

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}
