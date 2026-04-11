import Link from "next/link";
import { searchProjects, getCategories } from "@/lib/queries";
import { getDb } from "@/lib/db";
import { computeLifecycle } from "@/lib/lifecycle";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "freshcrate — Search",
  description: "Search packages by name, description, maintainer, tag, or language.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; language?: string; author?: string }>;
}) {
  const { q, category, language, author } = await searchParams;
  const hasQuery = !!(q || author);

  // Get filter options
  const categories = getCategories();
  const db = getDb();
  const languages = db
    .prepare("SELECT DISTINCT language FROM projects WHERE language != '' ORDER BY language")
    .all() as { language: string }[];

  // Search
  let results = hasQuery ? searchProjects(q || author || "") : [];

  // Apply filters
  if (category) {
    results = results.filter((p) => p.category === category);
  }
  if (language) {
    results = results.filter((p) => p.language === language);
  }
  if (author && !q) {
    // Direct author search — get all packages by this author
    const rows = db
      .prepare(
        `SELECT p.*, r.version as latest_version, r.changes as latest_changes,
                r.urgency as latest_urgency, r.created_at as release_date,
                (SELECT COUNT(*) FROM releases r3 WHERE r3.project_id = p.id) as release_count
         FROM projects p
         JOIN releases r ON r.project_id = p.id
         WHERE p.author = ? AND r.id = (SELECT MAX(r2.id) FROM releases r2 WHERE r2.project_id = p.id)
         ORDER BY p.stars DESC`
      )
      .all(author) as any[];
    results = rows.map((row) => ({
      ...row,
      tags: db.prepare("SELECT tag FROM tags WHERE project_id = ?").all(row.id).map((t: any) => t.tag),
    }));
  }

  // Author profile stats (when searching by author)
  let authorStats: { packages: number; totalStars: number; languages: string[]; categories: string[] } | null = null;
  if (author) {
    const stats = db.prepare(
      "SELECT COUNT(*) as c, SUM(stars) as s FROM projects WHERE author = ?"
    ).get(author) as { c: number; s: number };
    const authorLangs = db.prepare(
      "SELECT DISTINCT language FROM projects WHERE author = ? AND language != '' ORDER BY language"
    ).all(author) as { language: string }[];
    const authorCats = db.prepare(
      "SELECT DISTINCT category FROM projects WHERE author = ? ORDER BY category"
    ).all(author) as { category: string }[];
    if (stats.c > 0) {
      authorStats = {
        packages: stats.c,
        totalStars: stats.s || 0,
        languages: authorLangs.map((l) => l.language),
        categories: authorCats.map((c) => c.category),
      };
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-5">
      <div className="flex-1 min-w-0">
        <div className="border-b-2 border-fm-green pb-1 mb-3">
          <h2 className="text-[14px] font-bold text-fm-green">
            {author
              ? `Packages by ${author}`
              : q
              ? `Search results for "${q}"`
              : "Search"}
          </h2>
        </div>

        {/* Search form */}
        <form action="/search" method="GET" className="mb-4 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q || ""}
              placeholder="Search packages, tags, descriptions, maintainers..."
              className="flex-1 px-2 py-1.5 text-[11px] border border-fm-border rounded outline-none focus:border-fm-green"
            />
            <button
              type="submit"
              className="bg-fm-green text-white text-[11px] px-4 py-1.5 rounded hover:bg-fm-green-light cursor-pointer"
            >
              Search
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <select
              name="category"
              defaultValue={category || ""}
              className="px-2 py-1 border border-fm-border rounded text-[10px] bg-white"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category} ({c.count})
                </option>
              ))}
            </select>
            <select
              name="language"
              defaultValue={language || ""}
              className="px-2 py-1 border border-fm-border rounded text-[10px] bg-white"
            >
              <option value="">All languages</option>
              {languages.map((l) => (
                <option key={l.language} value={l.language}>
                  {l.language}
                </option>
              ))}
            </select>
            {(category || language) && (
              <Link href={`/search?q=${encodeURIComponent(q || "")}`} className="text-fm-link text-[10px] py-1">
                Clear filters
              </Link>
            )}
          </div>
        </form>

        {/* Author profile card */}
        {authorStats && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
            <div className="flex items-center gap-3 text-[11px]">
              <span className="font-bold text-fm-green text-[13px]">{author}</span>
              <span className="text-fm-text-light">{authorStats.packages} packages</span>
              <span className="text-fm-text-light">⭐ {authorStats.totalStars.toLocaleString()} total stars</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {authorStats.languages.map((l) => (
                <span key={l} className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
                  {l}
                </span>
              ))}
              {authorStats.categories.map((c) => (
                <span key={c} className="text-[9px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Result count */}
        {hasQuery && (
          <div className="text-[10px] text-fm-text-light mb-3">
            {results.length} result{results.length !== 1 ? "s" : ""} found
            {category ? ` in ${category}` : ""}
            {language ? ` (${language})` : ""}
          </div>
        )}

        {/* Results */}
        <div className="space-y-0">
          {results.map((project, i) => {
            const lc = computeLifecycle({
              stars: project.stars ?? 0,
              forks: project.forks ?? 0,
              releaseCount: (project as any).release_count ?? 1,
              lastReleaseDate: project.release_date,
              createdAt: project.created_at,
              verified: !!project.verified,
              license: project.license,
            });
            return (
              <div
                key={project.id}
                className={`py-2.5 px-2 ${i % 2 === 0 ? "bg-white/50" : ""} border-b border-fm-border/50`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <Link
                    href={`/projects/${project.name}`}
                    className="text-[13px] font-bold text-fm-link hover:text-fm-link-hover"
                  >
                    {project.name}
                  </Link>
                  {project.repo_url && (
                    <a href={project.repo_url} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-fm-text-light hover:text-fm-link" title="Source">
                      &#128193;
                    </a>
                  )}
                  <span className="text-[11px] text-fm-text-light font-mono">{project.latest_version}</span>
                  <span className={`${lc.color} ${lc.textColor} px-1.5 py-0.5 rounded text-[9px] font-bold`} title={lc.reason}>
                    {lc.emoji} {lc.label}
                  </span>
                  {project.stars > 0 && (
                    <span className="text-[9px] text-fm-text-light">⭐{project.stars.toLocaleString()}</span>
                  )}
                </div>
                <p className="text-[11px] text-fm-text">{project.short_desc}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {project.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/search?q=${tag}`}
                      className="text-[9px] bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded hover:bg-[#bbddff]"
                    >
                      {tag}
                    </Link>
                  ))}
                  <span className="text-[9px] text-fm-text-light ml-auto">
                    by{" "}
                    <Link href={`/author/${encodeURIComponent(project.author)}`} className="text-fm-link hover:text-fm-link-hover">
                      {project.author}
                    </Link>
                  </span>
                  {project.language && (
                    <Link
                      href={`/search?q=${encodeURIComponent(q || "")}&language=${encodeURIComponent(project.language)}`}
                      className="text-[9px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono"
                    >
                      {project.language}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hasQuery && results.length === 0 && (
          <p className="text-[11px] text-fm-text-light py-4">
            No packages found matching &ldquo;{q || author}&rdquo;.
          </p>
        )}

        {/* Search tips */}
        {!hasQuery && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-4 mt-2">
            <h3 className="text-[11px] font-bold text-fm-green mb-2">Search tips</h3>
            <div className="space-y-1 text-[10px] text-fm-text-light">
              <p>🔍 <strong>Package name:</strong> <Link href="/search?q=langchain" className="text-fm-link">langchain</Link></p>
              <p>🏷️ <strong>Tag:</strong> <Link href="/search?q=mcp" className="text-fm-link">mcp</Link></p>
              <p>👤 <strong>Maintainer:</strong> <Link href="/author/anthropics" className="text-fm-link">anthropics</Link></p>
              <p>💬 <strong>Description:</strong> <Link href="/search?q=vector+database" className="text-fm-link">vector database</Link></p>
              <p>🔤 <strong>Language:</strong> Use the dropdown filter above</p>
              <p>📂 <strong>Category:</strong> Use the dropdown filter, or <Link href="/browse" className="text-fm-link">browse all</Link></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
