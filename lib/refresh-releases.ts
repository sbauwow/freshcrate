import type Database from "better-sqlite3";

export interface RefreshOptions {
  limit?: number;
  concurrency?: number;
  token?: string;
  dryRun?: boolean;
}

export interface RefreshResult {
  checked: number;
  updated: number;
  unchanged: number;
  skipped: number;
  hasMore: boolean;
  durationMs: number;
}

interface ProjectRow {
  id: number;
  name: string;
  repo_url: string;
  latest_release_at: string | null;
}

interface StoredRelease {
  id: number;
  version: string;
  created_at: string;
}

interface GithubRelease {
  tag_name?: string;
  body?: string;
  published_at?: string;
}

interface GithubRepo {
  pushed_at?: string;
  default_branch?: string;
}

const SYNTHETIC_VERSION_RE = /^[^@\s]+@\d{4}-\d{2}-\d{2}$/;
const isSynthetic = (v: string | undefined) => SYNTHETIC_VERSION_RE.test(v || "");

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

function urgencyFromAge(dateStr: string): string {
  if (!dateStr) return "Low";
  const days = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (days < 7) return "High";
  if (days < 30) return "Medium";
  return "Low";
}

async function ghFetch<T>(endpoint: string, token?: string): Promise<T | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "freshcrate-refresh-releases",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com${endpoint}`, {
    headers,
    signal: AbortSignal.timeout(10000),
  });

  if (res.status === 404) return null;
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/**
 * Refreshes the latest-release row for a batch of projects. Selects the
 * staleest projects first (oldest stored release date). Falls back to
 * `pushed_at` on the default branch when a project has no GitHub release.
 *
 * Synthetic (`branch@date`) versions are updated in place so a daily cron
 * does not bloat the releases table with one row per day.
 */
export async function refreshReleases(
  db: Database.Database,
  opts: RefreshOptions = {}
): Promise<RefreshResult> {
  const limit = opts.limit ?? 500;
  const concurrency = Math.max(1, opts.concurrency ?? 5);
  const token = opts.token;
  const dryRun = opts.dryRun ?? false;
  const start = Date.now();

  const projects = db.prepare(`
    SELECT p.id, p.name, p.repo_url,
      (SELECT MAX(created_at) FROM releases WHERE project_id = p.id) as latest_release_at
    FROM projects p
    WHERE p.repo_url LIKE '%github.com%'
    ORDER BY latest_release_at ASC
    LIMIT ?
  `).all(limit) as ProjectRow[];

  const totalGh = (db.prepare(
    "SELECT COUNT(*) as c FROM projects WHERE repo_url LIKE '%github.com%'"
  ).get() as { c: number }).c;

  const latestReleaseStmt = db.prepare(
    "SELECT id, version, created_at FROM releases WHERE project_id = ? ORDER BY created_at DESC LIMIT 1"
  );
  const insertReleaseStmt = db.prepare(
    "INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, ?, ?, ?, ?)"
  );
  const updateReleaseStmt = db.prepare(
    "UPDATE releases SET version = ?, changes = ?, urgency = ?, created_at = ? WHERE id = ?"
  );

  const counters = { checked: 0, updated: 0, unchanged: 0, skipped: 0 };

  async function processProject(project: ProjectRow): Promise<void> {
    const gh = parseGithubUrl(project.repo_url);
    if (!gh) { counters.skipped++; return; }
    counters.checked++;

    const slug = `${gh.owner}/${gh.repo}`;

    let version: string;
    let changes: string;
    let releaseDate: string;

    try {
      const release = await ghFetch<GithubRelease>(`/repos/${slug}/releases/latest`, token);

      if (release && release.tag_name) {
        version = release.tag_name;
        changes = (release.body || "").slice(0, 500).replace(/\r\n/g, " ").replace(/\n/g, " ");
        releaseDate = release.published_at || new Date().toISOString();
      } else {
        const repo = await ghFetch<GithubRepo>(`/repos/${slug}`, token);
        if (!repo || !repo.pushed_at) {
          counters.skipped++;
          return;
        }
        const branch = repo.default_branch || "main";
        const date = repo.pushed_at.slice(0, 10);
        version = `${branch}@${date}`;
        changes = `Latest activity on ${branch} branch`;
        releaseDate = repo.pushed_at;
      }

      const stored = latestReleaseStmt.get(project.id) as StoredRelease | undefined;
      if (stored && stored.version === version) {
        counters.unchanged++;
        return;
      }

      const replaceInPlace = !!stored && isSynthetic(stored.version) && isSynthetic(version);

      if (!dryRun) {
        if (replaceInPlace && stored) {
          updateReleaseStmt.run(
            version,
            changes || `Latest release: ${version}`,
            urgencyFromAge(releaseDate),
            releaseDate,
            stored.id
          );
        } else {
          insertReleaseStmt.run(
            project.id,
            version,
            changes || `Latest release: ${version}`,
            urgencyFromAge(releaseDate),
            releaseDate
          );
        }
      }
      counters.updated++;
    } catch {
      counters.skipped++;
    }
  }

  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < projects.length) {
      const idx = cursor++;
      await processProject(projects[idx]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return {
    ...counters,
    hasMore: projects.length === limit && totalGh > limit,
    durationMs: Date.now() - start,
  };
}
