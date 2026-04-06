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
  tags: string[];
}

/**
 * @description Fetches the most recent project releases, ordered by release date.
 * @param limit - Maximum number of results to return (default: 20)
 * @param offset - Number of results to skip for pagination (default: 0)
 * @returns Array of projects with their latest release info and tags
 */
export function getLatestReleases(limit = 20, offset = 0): ProjectWithRelease[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.*, r.version as latest_version, r.changes as latest_changes,
           r.urgency as latest_urgency, r.created_at as release_date
    FROM projects p
    JOIN releases r ON r.project_id = p.id
    WHERE r.id = (SELECT MAX(r2.id) FROM releases r2 WHERE r2.project_id = p.id)
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as ProjectWithRelease[];

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
    WHERE p.name = ? AND r.id = (SELECT MAX(r2.id) FROM releases r2 WHERE r2.project_id = p.id)
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
    WHERE p.category = ? AND r.id = (SELECT MAX(r2.id) FROM releases r2 WHERE r2.project_id = p.id)
    ORDER BY p.name
  `).all(category) as ProjectWithRelease[];

  return rows.map((row) => ({ ...row, tags: getProjectTags(row.id) }));
}

/**
 * @description Searches projects using FTS5 full-text search with BM25 ranking, falling back to LIKE queries. Tags are searched separately via LIKE since they are not in the FTS index.
 * @param query - The search query string
 * @returns Array of matching projects with release info and tags, ranked by relevance
 */
export function searchProjects(query: string): ProjectWithRelease[] {
  const db = getDb();

  try {
    // Try FTS5 search on name, short_desc, description with BM25 ranking,
    // unioned with a LIKE search on tags (not in the FTS index)
    const rows = db.prepare(`
      SELECT DISTINCT p.*, r.version as latest_version, r.changes as latest_changes,
             r.urgency as latest_urgency, r.created_at as release_date
      FROM projects p
      JOIN releases r ON r.project_id = p.id
      WHERE r.id = (SELECT MAX(r2.id) FROM releases r2 WHERE r2.project_id = p.id)
        AND (
          p.id IN (
            SELECT rowid FROM projects_fts WHERE projects_fts MATCH ?
          )
          OR p.id IN (
            SELECT t.project_id FROM tags t WHERE t.tag LIKE ?
          )
        )
      ORDER BY (
        CASE WHEN p.id IN (SELECT rowid FROM projects_fts WHERE projects_fts MATCH ?)
        THEN (SELECT bm25(projects_fts) FROM projects_fts WHERE projects_fts MATCH ? AND rowid = p.id)
        ELSE 0 END
      )
    `).all(query, `%${query}%`, query, query) as ProjectWithRelease[];

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
      WHERE r.id = (SELECT MAX(r2.id) FROM releases r2 WHERE r2.project_id = p.id)
        AND (p.name LIKE ? OR p.short_desc LIKE ? OR p.description LIKE ? OR t.tag LIKE ?)
      ORDER BY r.created_at DESC
    `).all(like, like, like, like) as ProjectWithRelease[];

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
    WHERE p.name = ? AND r.id = (SELECT MAX(r2.id) FROM releases r2 WHERE r2.project_id = p.id)
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
        AND r.id = (SELECT MAX(r2.id) FROM releases r2 WHERE r2.project_id = p.id)
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
      AND r.id = (SELECT MAX(r2.id) FROM releases r2 WHERE r2.project_id = p.id)
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
