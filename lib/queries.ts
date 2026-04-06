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

export function getProjectTags(projectId: number): string[] {
  const db = getDb();
  return (db.prepare("SELECT tag FROM tags WHERE project_id = ?").all(projectId) as { tag: string }[])
    .map((r) => r.tag);
}

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

export function getProjectReleases(projectId: number): Release[] {
  const db = getDb();
  return db.prepare("SELECT * FROM releases WHERE project_id = ? ORDER BY created_at DESC").all(projectId) as Release[];
}

export function getCategories(): { category: string; count: number }[] {
  const db = getDb();
  return db.prepare("SELECT category, COUNT(*) as count FROM projects GROUP BY category ORDER BY count DESC").all() as { category: string; count: number }[];
}

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

export function searchProjects(query: string): ProjectWithRelease[] {
  const db = getDb();
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

export function getStats(): { projects: number; releases: number; categories: number } {
  const db = getDb();
  const projects = (db.prepare("SELECT COUNT(*) as c FROM projects").get() as { c: number }).c;
  const releases = (db.prepare("SELECT COUNT(*) as c FROM releases").get() as { c: number }).c;
  const categories = (db.prepare("SELECT COUNT(DISTINCT category) as c FROM projects").get() as { c: number }).c;
  return { projects, releases, categories };
}

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
