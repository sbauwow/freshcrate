import { getDb } from "./db";

export interface Project {
  id: number;
  name: string;
  short_desc: string;
  description: string;
  homepage_url: string;
  repo_url: string;
  license: string;
  category: string;
  author: string;
  created_at: string;
  updated_at: string;
  stars: number;
  forks: number;
  language: string;
  verified: number;
}

export interface Release {
  id: number;
  project_id: number;
  version: string;
  changes: string;
  urgency: string;
  created_at: string;
}

export interface ProjectWithRelease extends Project {
  latest_version: string;
  latest_changes: string;
  latest_urgency: string;
  release_date: string;
  release_count: number;
  tags: string[];
}

export type ReleaseSort = "newest" | "oldest" | "stars" | "name";

export interface LatestReleaseOptions {
  category?: string;
  language?: string;
  sort?: ReleaseSort;
}

export interface AuthorSummary {
  author: string;
  package_count: number;
  total_stars: number;
}

/**
 * @description Fetches latest project releases with optional category/language filters and sort mode.
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip for pagination (default: 0)
 * @param options - Optional filters + sort behavior
 * @returns Array of projects with their latest release info and tags
 */
export function getLatestReleases(
  limit = 20,
  offset = 0,
  options: LatestReleaseOptions = {}
): ProjectWithRelease[] {
  const db = getDb();

  const where: string[] = [
    "r.id = (SELECT r2.id FROM releases r2 WHERE r2.project_id = p.id ORDER BY r2.created_at DESC LIMIT 1)",
  ];
  const params: (string | number)[] = [];

  if (options.category) {
    where.push("p.category = ?");
    params.push(options.category);
  }

  if (options.language) {
    if (options.language === "__unknown__") {
      where.push("(p.language IS NULL OR p.language = '')");
    } else {
      where.push("p.language = ?");
      params.push(options.language);
    }
  }

  const orderBy: Record<ReleaseSort, string> = {
    newest: "r.created_at DESC",
    oldest: "r.created_at ASC",
    stars: "COALESCE(p.stars, 0) DESC, r.created_at DESC",
    name: "LOWER(p.name) ASC",
  };

  const sort: ReleaseSort = options.sort ?? "newest";
  const sortSql = orderBy[sort] ?? orderBy.newest;

  const sql = `
    SELECT p.*, r.version as latest_version, r.changes as latest_changes,
           r.urgency as latest_urgency, r.created_at as release_date,
           (SELECT COUNT(*) FROM releases r3 WHERE r3.project_id = p.id) as release_count
    FROM projects p
    JOIN releases r ON r.project_id = p.id
    WHERE ${where.join(" AND ")}
    ORDER BY ${sortSql}
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(sql).all(...params, limit, offset) as ProjectWithRelease[];

  return rows.map((row) => ({
    ...row,
    tags: getProjectTags(row.id),
  }));
}

/**
 * @description Retrieves all tags associated with a given project.
 * @param projectId - The ID of the project
 * @returns Array of tag strings for the project
 */
export function getProjectTags(projectId: number): string[] {
  const db = getDb();
  return (db.prepare("SELECT tag FROM tags WHERE project_id = ?").all(projectId) as { tag: string }[])
    .map((r) => r.tag);
}

/**
 * @description Finds a project by its exact name, including latest release info.
 * @param name - The project name to look up
 * @returns The project with release info and tags, or null if not found
 */
export function getProjectByName(name: string): ProjectWithRelease | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT p.*, r.version as latest_version, r.changes as latest_changes,
           r.urgency as latest_urgency, r.created_at as release_date
    FROM projects p
    JOIN releases r ON r.project_id = p.id
    WHERE p.name = ? AND r.id = (SELECT r2.id FROM releases r2 WHERE r2.project_id = p.id ORDER BY r2.created_at DESC LIMIT 1)
  `).get(name) as ProjectWithRelease | undefined;

  if (!row) return null;
  return { ...row, tags: getProjectTags(row.id) };
}

/**
 * @description Retrieves all releases for a project, ordered by most recent first.
 * @param projectId - The ID of the project
 * @returns Array of releases for the project
 */
export function getProjectReleases(projectId: number): Release[] {
  const db = getDb();
  return db.prepare("SELECT * FROM releases WHERE project_id = ? ORDER BY created_at DESC").all(projectId) as Release[];
}

/**
 * @description Gets all unique categories with their project counts.
 * @returns Array of objects with category name and project count, sorted by count descending
 */
export function getCategories(): { category: string; count: number }[] {
  const db = getDb();
  return db.prepare("SELECT category, COUNT(*) as count FROM projects GROUP BY category ORDER BY count DESC").all() as { category: string; count: number }[];
}

/**
 * @description Gets all languages with project counts for filter UIs.
 * @returns Array of language/count pairs sorted by popularity
 */
export function getLanguages(): { language: string; count: number }[] {
  const db = getDb();
  return db.prepare(`
    SELECT language, COUNT(*) as count
    FROM projects
    WHERE language IS NOT NULL AND language != ''
    GROUP BY language
    ORDER BY count DESC, language ASC
  `).all() as { language: string; count: number }[];
}

/**
 * @description Fetches all projects in a given category with their latest release info.
 * @param category - The category name to filter by
 * @returns Array of projects in the category with release info and tags
 */
export function getProjectsByCategory(category: string): ProjectWithRelease[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.*, r.version as latest_version, r.changes as latest_changes,
           r.urgency as latest_urgency, r.created_at as release_date
    FROM projects p
    JOIN releases r ON r.project_id = p.id
    WHERE p.category = ? AND r.id = (SELECT r2.id FROM releases r2 WHERE r2.project_id = p.id ORDER BY r2.created_at DESC LIMIT 1)
    ORDER BY p.name
  `).all(category) as ProjectWithRelease[];

  return rows.map((row) => ({ ...row, tags: getProjectTags(row.id) }));
}

/**
 * @description Fetches all projects for an author with latest release info.
 * @param author - Exact author name to match
 * @returns Projects by that author ordered by stars then release recency
 */
export function getProjectsByAuthor(author: string): ProjectWithRelease[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.*, r.version as latest_version, r.changes as latest_changes,
           r.urgency as latest_urgency, r.created_at as release_date,
           (SELECT COUNT(*) FROM releases r3 WHERE r3.project_id = p.id) as release_count
    FROM projects p
    JOIN releases r ON r.project_id = p.id
    WHERE p.author = ?
      AND r.id = (SELECT r2.id FROM releases r2 WHERE r2.project_id = p.id ORDER BY r2.created_at DESC LIMIT 1)
    ORDER BY COALESCE(p.stars, 0) DESC, r.created_at DESC
  `).all(author) as ProjectWithRelease[];

  return rows.map((row) => ({ ...row, tags: getProjectTags(row.id) }));
}

/**
 * @description Gets all distinct authors with package counts and total stars.
 * @returns Author summaries ordered by package count then stars
 */
export function getAuthors(limit = 1000): AuthorSummary[] {
  const db = getDb();
  return db.prepare(`
    SELECT author,
           COUNT(*) as package_count,
           COALESCE(SUM(stars), 0) as total_stars
    FROM projects
    WHERE author IS NOT NULL AND TRIM(author) != ''
    GROUP BY author
    ORDER BY package_count DESC, total_stars DESC, author ASC
    LIMIT ?
  `).all(limit) as AuthorSummary[];
}

/**
 * @description Searches projects using FTS5 full-text search with BM25 ranking, falling back to LIKE queries. Tags are searched separately via LIKE since they are not in the FTS index.
 * @param query - The search query string
 * @returns Array of matching projects with release info and tags, ranked by relevance
 */
export function searchProjects(query: string): ProjectWithRelease[] {
  const db = getDb();

  try {
    // Try FTS5 search on name, short_desc, description, readme_text with BM25 ranking,
    // unioned with a LIKE search on tags (not in the FTS index)
    const rows = db.prepare(`
      SELECT DISTINCT p.*, r.version as latest_version, r.changes as latest_changes,
             r.urgency as latest_urgency, r.created_at as release_date
      FROM projects p
      JOIN releases r ON r.project_id = p.id
      WHERE r.id = (SELECT r2.id FROM releases r2 WHERE r2.project_id = p.id ORDER BY r2.created_at DESC LIMIT 1)
        AND (
          p.id IN (
            SELECT rowid FROM projects_fts WHERE projects_fts MATCH ?
          )
          OR p.id IN (
            SELECT t.project_id FROM tags t WHERE t.tag LIKE ?
          )
          OR p.author LIKE ?
        )
      ORDER BY (
        CASE WHEN p.id IN (SELECT rowid FROM projects_fts WHERE projects_fts MATCH ?)
        THEN (SELECT bm25(projects_fts) FROM projects_fts WHERE projects_fts MATCH ? AND rowid = p.id)
        ELSE 0 END
      )
    `).all(query, `%${query}%`, `%${query}%`, query, query) as ProjectWithRelease[];

    return rows.map((row) => ({ ...row, tags: getProjectTags(row.id) }));
  } catch {
    // Fallback to LIKE-based search if FTS5 table doesn't exist
    const like = `%${query}%`;
    const rows = db.prepare(`
      SELECT DISTINCT p.*, r.version as latest_version, r.changes as latest_changes,
             r.urgency as latest_urgency, r.created_at as release_date
      FROM projects p
      JOIN releases r ON r.project_id = p.id
      LEFT JOIN tags t ON t.project_id = p.id
      WHERE r.id = (SELECT r2.id FROM releases r2 WHERE r2.project_id = p.id ORDER BY r2.created_at DESC LIMIT 1)
        AND (p.name LIKE ? OR p.short_desc LIKE ? OR p.description LIKE ? OR p.readme_text LIKE ? OR t.tag LIKE ? OR p.author LIKE ?)
      ORDER BY r.created_at DESC
    `).all(like, like, like, like, like, like) as ProjectWithRelease[];

    return rows.map((row) => ({ ...row, tags: getProjectTags(row.id) }));
  }
}

/**
 * @description Returns aggregate statistics about the database.
 * @returns Object with total counts of projects, releases, and unique categories
 */
export function getStats(): { projects: number; releases: number; categories: number } {
  const db = getDb();
  const projects = (db.prepare("SELECT COUNT(*) as c FROM projects").get() as { c: number }).c;
  const releases = (db.prepare("SELECT COUNT(*) as c FROM releases").get() as { c: number }).c;
  const categories = (db.prepare("SELECT COUNT(DISTINCT category) as c FROM projects").get() as { c: number }).c;
  return { projects, releases, categories };
}

/**
 * @description Submits a new project with its initial release and tags.
 * @param data - Object containing project details, initial version/changes, and tags
 * @returns The ID of the newly created project
 */
export function submitProject(data: {
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
  tags: string[];
}): number {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO projects (name, short_desc, description, homepage_url, repo_url, license, category, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(data.name, data.short_desc, data.description, data.homepage_url, data.repo_url, data.license, data.category, data.author);

  const projectId = result.lastInsertRowid as number;

  db.prepare("INSERT INTO releases (project_id, version, changes) VALUES (?, ?, ?)").run(projectId, data.version, data.changes);

  const insertTag = db.prepare("INSERT INTO tags (project_id, tag) VALUES (?, ?)");
  for (const tag of data.tags) {
    insertTag.run(projectId, tag.trim().toLowerCase());
  }

  return projectId;
}

/**
 * @description Rebuilds the FTS5 search index for the projects_fts table.
 * @returns void
 */
export function rebuildSearchIndex(): void {
  const db = getDb();
  db.prepare("INSERT INTO projects_fts(projects_fts) VALUES('rebuild')").run();
}

export interface ProjectWithReadme extends ProjectWithRelease {
  stars: number;
  forks: number;
  language: string;
  readme_html: string;
}

/**
 * @description Fetches a project by name including enrichment data (stars, forks, language, readme_html).
 * @param name - The project name to look up
 * @returns The project with release info, tags, and GitHub enrichment data, or null if not found
 */
export function getProjectWithReadme(name: string): ProjectWithReadme | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT p.*, p.stars, p.forks, p.language, p.readme_html,
           r.version as latest_version, r.changes as latest_changes,
           r.urgency as latest_urgency, r.created_at as release_date
    FROM projects p
    JOIN releases r ON r.project_id = p.id
    WHERE p.name = ? AND r.id = (SELECT r2.id FROM releases r2 WHERE r2.project_id = p.id ORDER BY r2.created_at DESC LIMIT 1)
  `).get(name) as ProjectWithReadme | undefined;

  if (!row) return null;
  return { ...row, tags: getProjectTags(row.id) };
}

/**
 * @description Finds projects similar to the given one by matching category or overlapping tags.
 * @param projectId - The ID of the project to find similar projects for
 * @param category - The category to match against
 * @param tags - Array of tags to find overlap with
 * @param limit - Maximum number of similar projects to return (default: 5)
 * @returns Array of similar projects with release info and tags
 */
export function getSimilarProjects(
  projectId: number,
  category: string,
  tags: string[],
  limit = 5
): ProjectWithRelease[] {
  const db = getDb();

  if (tags.length === 0) {
    // Only match by category
    const rows = db.prepare(`
      SELECT p.*, r.version as latest_version, r.changes as latest_changes,
             r.urgency as latest_urgency, r.created_at as release_date
      FROM projects p
      JOIN releases r ON r.project_id = p.id
      WHERE p.id != ? AND p.category = ?
        AND r.id = (SELECT r2.id FROM releases r2 WHERE r2.project_id = p.id ORDER BY r2.created_at DESC LIMIT 1)
      ORDER BY r.created_at DESC
      LIMIT ?
    `).all(projectId, category, limit) as ProjectWithRelease[];

    return rows.map((row) => ({ ...row, tags: getProjectTags(row.id) }));
  }

  const placeholders = tags.map(() => "?").join(", ");
  const rows = db.prepare(`
    SELECT DISTINCT p.*, r.version as latest_version, r.changes as latest_changes,
           r.urgency as latest_urgency, r.created_at as release_date,
           (CASE WHEN p.category = ? THEN 1 ELSE 0 END) +
           (SELECT COUNT(*) FROM tags t WHERE t.project_id = p.id AND t.tag IN (${placeholders})) as relevance
    FROM projects p
    JOIN releases r ON r.project_id = p.id
    WHERE p.id != ?
      AND r.id = (SELECT r2.id FROM releases r2 WHERE r2.project_id = p.id ORDER BY r2.created_at DESC LIMIT 1)
      AND (p.category = ? OR p.id IN (SELECT t.project_id FROM tags t WHERE t.tag IN (${placeholders})))
    ORDER BY relevance DESC, r.created_at DESC
    LIMIT ?
  `).all(category, ...tags, projectId, category, ...tags, limit) as (ProjectWithRelease & { relevance: number })[];

  return rows.map(({ relevance: _relevance, ...row }) => ({ ...row, tags: getProjectTags(row.id) }));
}

/**
 * @description Updates GitHub enrichment data for a project (stars, forks, language, readme_html).
 * Also sets last_github_sync and readme_fetched_at to the current timestamp.
 * @param projectId - The ID of the project to update
 * @param data - Object containing stars, forks, language, and readme_html
 */
export interface FullStats {
  totals: {
    packages: number;
    releases: number;
    tags: number;
    categories: number;
    verified: number;
    totalStars: number;
    totalForks: number;
    languages: number;
    avgStars: number;
    readmeCoverage: number;
  };
  topByStars: {
    name: string;
    stars: number;
    category: string;
    version: string;
    author: string;
  }[];
  topByVitality: {
    name: string;
    version: string;
    urgency: string;
    release_date: string;
    category: string;
  }[];
  topVerified: {
    name: string;
    score: number;
    checks: Record<string, boolean>;
    category: string;
  }[];
  licenseBreakdown: { license: string; count: number; pct: number }[];
  languageBreakdown: { language: string; count: number; pct: number }[];
  hallOfFame: {
    longestReadme: { name: string; length: number } | null;
    speedDemon: { name: string; count: number } | null;
    tagHoarder: { name: string; count: number } | null;
    soloWarrior: { name: string; stars: number; forks: number; ratio: number } | null;
    licenseRebel: { name: string; stars: number } | null;
    dinosaur: { name: string; created_at: string } | null;
    freshest: { name: string; created_at: string } | null;
  };
  funFacts: {
    totalStarsDollars: number;
    avgNameLength: number;
    verifiedPct: number;
    mcpServerCount: number;
    novelCount: number;
    uniqueTags: number;
    tagsPerPackage: number;
  };
}

/**
 * @description Returns comprehensive statistics for the stats page.
 * Executes multiple queries and aggregates all stats in one call.
 * @returns FullStats object with all sections
 */
export function getFullStats(): FullStats {
  const db = getDb();

  // --- TOTALS ---
  const packages = (db.prepare("SELECT COUNT(*) as c FROM projects").get() as { c: number }).c;
  const releases = (db.prepare("SELECT COUNT(*) as c FROM releases").get() as { c: number }).c;
  const tags = (db.prepare("SELECT COUNT(*) as c FROM tags").get() as { c: number }).c;
  const categories = (db.prepare("SELECT COUNT(DISTINCT category) as c FROM projects").get() as { c: number }).c;
  const verified = (db.prepare("SELECT COUNT(*) as c FROM projects WHERE verified = 1").get() as { c: number }).c;
  const starForkSums = db.prepare("SELECT COALESCE(SUM(stars),0) as totalStars, COALESCE(SUM(forks),0) as totalForks FROM projects").get() as { totalStars: number; totalForks: number };
  const languages = (db.prepare("SELECT COUNT(DISTINCT language) as c FROM projects WHERE language IS NOT NULL AND language != ''").get() as { c: number }).c;
  const avgStars = packages > 0 ? Math.round(starForkSums.totalStars / packages) : 0;
  const readmeCount = (db.prepare("SELECT COUNT(*) as c FROM projects WHERE readme_html IS NOT NULL AND readme_html != ''").get() as { c: number }).c;
  const readmeCoverage = packages > 0 ? Math.round((readmeCount / packages) * 100) : 0;

  // --- TOP 20 BY STARS ---
  const topByStars = db.prepare(`
    SELECT p.name, p.stars, p.category, p.author,
           (SELECT r.version FROM releases r WHERE r.project_id = p.id ORDER BY r.created_at DESC LIMIT 1) as version
    FROM projects p
    ORDER BY p.stars DESC
    LIMIT 20
  `).all() as { name: string; stars: number; category: string; version: string; author: string }[];

  // --- TOP 20 BY VITALITY (most recent releases in last 30 days) ---
  const topByVitality = db.prepare(`
    SELECT p.name, r.version, r.urgency, r.created_at as release_date, p.category
    FROM projects p
    JOIN releases r ON r.project_id = p.id
    WHERE r.id = (SELECT r2.id FROM releases r2 WHERE r2.project_id = p.id ORDER BY r2.created_at DESC LIMIT 1)
      AND r.created_at >= datetime('now', '-30 days')
      AND r.created_at <= datetime('now')
    ORDER BY r.created_at DESC
    LIMIT 20
  `).all() as { name: string; version: string; urgency: string; release_date: string; category: string }[];

  // --- TOP 20 BEST VERIFIED ---
  const verifiedRows = db.prepare(`
    SELECT p.name, p.verification_json, p.category
    FROM projects p
    WHERE p.verified = 1 AND p.verification_json IS NOT NULL
    ORDER BY p.verified_at DESC
    LIMIT 20
  `).all() as { name: string; verification_json: string; category: string }[];

  const topVerified = verifiedRows.map((row) => {
    let checks: Record<string, boolean> = {};
    let score = 0;
    try {
      checks = JSON.parse(row.verification_json);
      const total = Object.keys(checks).length;
      const passed = Object.values(checks).filter(Boolean).length;
      score = total > 0 ? Math.round((passed / total) * 100) : 0;
    } catch {
      // ignore parse errors
    }
    return { name: row.name, score, checks, category: row.category };
  }).sort((a, b) => b.score - a.score);

  // --- LICENSE BREAKDOWN ---
  const licenseRows = db.prepare(`
    SELECT COALESCE(NULLIF(license, ''), 'Unknown') as license, COUNT(*) as count
    FROM projects GROUP BY 1 ORDER BY count DESC
  `).all() as { license: string; count: number }[];
  const licenseBreakdown = licenseRows.map((r) => ({
    ...r,
    pct: packages > 0 ? Math.round((r.count / packages) * 100) : 0,
  }));

  // --- LANGUAGE BREAKDOWN ---
  const langRows = db.prepare(`
    SELECT language, COUNT(*) as count
    FROM projects WHERE language IS NOT NULL AND language != ''
    GROUP BY language ORDER BY count DESC
  `).all() as { language: string; count: number }[];
  const langTotal = langRows.reduce((s, r) => s + r.count, 0);
  const languageBreakdown = langRows.map((r) => ({
    ...r,
    pct: langTotal > 0 ? Math.round((r.count / langTotal) * 100) : 0,
  }));

  // --- HALL OF FAME ---
  const longestReadme = db.prepare(`
    SELECT name, LENGTH(readme_html) as length FROM projects
    WHERE readme_html IS NOT NULL AND readme_html != ''
    ORDER BY LENGTH(readme_html) DESC LIMIT 1
  `).get() as { name: string; length: number } | undefined;

  const speedDemon = db.prepare(`
    SELECT p.name, COUNT(r.id) as count FROM projects p
    JOIN releases r ON r.project_id = p.id
    GROUP BY p.id ORDER BY count DESC LIMIT 1
  `).get() as { name: string; count: number } | undefined;

  const tagHoarder = db.prepare(`
    SELECT p.name, COUNT(t.id) as count FROM projects p
    JOIN tags t ON t.project_id = p.id
    GROUP BY p.id ORDER BY count DESC LIMIT 1
  `).get() as { name: string; count: number } | undefined;

  const soloWarrior = db.prepare(`
    SELECT name, stars, forks,
           CASE WHEN forks > 0 THEN CAST(stars AS REAL) / forks ELSE stars END as ratio
    FROM projects WHERE stars > 0
    ORDER BY ratio DESC LIMIT 1
  `).get() as { name: string; stars: number; forks: number; ratio: number } | undefined;

  const licenseRebel = db.prepare(`
    SELECT name, stars FROM projects
    WHERE license IS NULL OR license = '' OR LOWER(license) = 'unknown'
    ORDER BY stars DESC LIMIT 1
  `).get() as { name: string; stars: number } | undefined;

  const dinosaur = db.prepare(`
    SELECT name, created_at FROM projects ORDER BY created_at ASC LIMIT 1
  `).get() as { name: string; created_at: string } | undefined;

  const freshest = db.prepare(`
    SELECT name, created_at FROM projects ORDER BY created_at DESC LIMIT 1
  `).get() as { name: string; created_at: string } | undefined;

  // --- FUN FACTS ---
  const avgNameLen = db.prepare("SELECT AVG(LENGTH(name)) as avg FROM projects").get() as { avg: number };
  const uniqueTags = (db.prepare("SELECT COUNT(DISTINCT tag) as c FROM tags").get() as { c: number }).c;
  const mcpCount = (db.prepare("SELECT COUNT(*) as c FROM projects WHERE LOWER(category) LIKE '%mcp%'").get() as { c: number }).c;

  // Estimate word count from readme_html (rough: chars / 5)
  const totalReadmeChars = (db.prepare("SELECT COALESCE(SUM(LENGTH(readme_html)),0) as c FROM projects").get() as { c: number }).c;
  const estimatedWords = totalReadmeChars / 5;
  const novelCount = Math.round((estimatedWords / 80000) * 10) / 10;

  return {
    totals: {
      packages,
      releases,
      tags,
      categories,
      verified,
      totalStars: starForkSums.totalStars,
      totalForks: starForkSums.totalForks,
      languages,
      avgStars,
      readmeCoverage,
    },
    topByStars,
    topByVitality,
    topVerified,
    licenseBreakdown,
    languageBreakdown,
    hallOfFame: {
      longestReadme: longestReadme || null,
      speedDemon: speedDemon || null,
      tagHoarder: tagHoarder || null,
      soloWarrior: soloWarrior || null,
      licenseRebel: licenseRebel || null,
      dinosaur: dinosaur || null,
      freshest: freshest || null,
    },
    funFacts: {
      totalStarsDollars: starForkSums.totalStars,
      avgNameLength: Math.round(avgNameLen.avg || 0),
      verifiedPct: packages > 0 ? Math.round((verified / packages) * 100) : 0,
      mcpServerCount: mcpCount,
      novelCount,
      uniqueTags,
      tagsPerPackage: packages > 0 ? Math.round((uniqueTags / packages) * 10) / 10 : 0,
    },
  };
}

export function updateProjectGithubData(
  projectId: number,
  data: { stars: number; forks: number; language: string; readme_html: string }
): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE projects
    SET stars = ?, forks = ?, language = ?, readme_html = ?,
        last_github_sync = ?, readme_fetched_at = ?
    WHERE id = ?
  `).run(data.stars, data.forks, data.language, data.readme_html, now, now, projectId);
}
