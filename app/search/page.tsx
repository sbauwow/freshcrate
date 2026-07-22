import Link from "next/link";
import TrackedForm from "@/app/components/tracked-form";
import RankExplanation from "@/app/components/rank-explanation";
import { cookies } from "next/headers";
import { cleanAuthor } from "@/lib/author-slug";
import { searchProjects, getCategories } from "@/lib/queries";
import { getDb } from "@/lib/db";
import { computeLifecycle } from "@/lib/lifecycle";
import TrackOnMount from "@/app/components/track-on-mount";
import TrackedNextLink from "@/app/components/tracked-next-link";
import TrackedLink from "@/app/components/tracked-link";
import { getCopy, LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "freshcrate — Search",
  description: "Search packages by name, description, maintainer, tag, or language.",
};

const suggestedPaths = [
  {
    label: "Best MCP Servers for Claude Code",
    href: "/learn/best-mcp-servers-for-claude-code",
    blurb: "High-intent operator guide for Claude Code tool stacks.",
    eventTarget: "search:suggested:mcp-guide",
  },
  {
    label: "Best Open Source AI Agent Frameworks",
    href: "/learn/best-open-source-ai-agent-frameworks",
    blurb: "Direct framework selector for LangGraph, CrewAI, AgentScope, and more.",
    eventTarget: "search:suggested:framework-guide",
  },
  {
    label: "LangGraph vs CrewAI vs AutoGen",
    href: "/compare/langgraph-vs-crewai-vs-autogen",
    blurb: "Head-to-head compare page for a common framework decision.",
    eventTarget: "search:suggested:framework-compare",
  },
  {
    label: "Browse MCP Servers",
    href: "/browse?category=MCP%20Servers",
    blurb: "Jump straight into a high-signal category.",
    eventTarget: "search:suggested:browse-mcp",
  },
] as const;

function editDistance(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  if (!n) return m;
  if (!m) return n;
  const dp = Array.from({ length: n + 1 }, (_, i) => new Array<number>(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[n][m];
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; language?: string; author?: string }>;
}) {
  const { q, category, language, author } = await searchParams;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const t = getCopy(locale).searchPage;
  const tips = t.searchTipsExamples;
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
  let rescueTags: { tag: string; count: number }[] = [];
  let rescueProjects: { name: string; short_desc: string }[] = [];
  let typoSuggestions: string[] = [];
  if (hasQuery && results.length === 0) {
    const raw = (q || author || "").trim().toLowerCase();
    if (raw) {
      const like = `%${raw.replace(/[%_]/g, "")}%`;
      rescueTags = db
        .prepare(
          "SELECT tag, COUNT(DISTINCT project_id) as count FROM tags WHERE tag LIKE ? GROUP BY tag ORDER BY count DESC LIMIT 8"
        )
        .all(like) as { tag: string; count: number }[];
      if (rescueTags.length === 0) {
        rescueTags = db
          .prepare(
            "SELECT tag, COUNT(DISTINCT project_id) as count FROM tags GROUP BY tag ORDER BY count DESC LIMIT 8"
          )
          .all() as { tag: string; count: number }[];
      }

      const candidateTags = db
        .prepare("SELECT tag FROM tags GROUP BY tag ORDER BY COUNT(*) DESC LIMIT 400")
        .all() as { tag: string }[];
      typoSuggestions = candidateTags
        .map((r) => r.tag)
        .filter((t) => t.length >= 2 && Math.abs(t.length - raw.length) <= 3)
        .map((t) => ({ tag: t, d: editDistance(raw, t) }))
        .filter((x) => x.d > 0 && x.d <= 2)
        .sort((a, b) => a.d - b.d)
        .slice(0, 5)
        .map((x) => x.tag);

      rescueProjects = db
        .prepare(
          `SELECT p.name, p.short_desc
           FROM projects p
           LEFT JOIN tags t ON t.project_id = p.id
           WHERE p.name LIKE ? OR p.short_desc LIKE ? OR t.tag LIKE ?
           GROUP BY p.id
           ORDER BY COALESCE(p.stars, 0) DESC, p.updated_at DESC
           LIMIT 6`
        )
        .all(like, like, like) as { name: string; short_desc: string }[];
    }
  }

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

  const topCategoryPivots = Array.from(
    results.reduce((acc, project) => {
      acc.set(project.category, (acc.get(project.category) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4);

  const topTagPivots = Array.from(
    results.reduce((acc, project) => {
      for (const tag of project.tags || []) {
        acc.set(tag, (acc.get(tag) || 0) + 1);
      }
      return acc;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8);

  const topAuthorPivots = Array.from(
    results.reduce((acc, project) => {
      const authorName = cleanAuthor(project.author);
      if (!authorName) return acc;
      acc.set(authorName, (acc.get(authorName) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5);

  return (
    <div className="flex flex-col md:flex-row gap-5">
      {hasQuery && (
        <TrackOnMount event="search" target={(q || author || "").slice(0, 100)} />
      )}
      <div className="flex-1 min-w-0">
        <div className="border-b-2 border-fm-green pb-1 mb-3">
          <h2 className="text-[14px] font-bold text-fm-green">
            {author
              ? `${t.packagesBy} ${author}`
              : q
              ? `${t.resultsFor} \"${q}\"`
              : t.title}
          </h2>
        </div>

        {/* Search form */}
        <TrackedForm event="search" eventTarget="search:search-page" action="/search" method="GET" className="mb-4 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q || ""}
              placeholder={t.placeholder}
              className="flex-1 px-2 py-1.5 text-[11px] border border-fm-border rounded outline-none focus:border-fm-green"
            />
            <button
              type="submit"
              className="bg-fm-green text-white text-[11px] px-4 py-1.5 rounded hover:bg-fm-green-light cursor-pointer"
            >
              {t.searchButton}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px]">
            <select
              name="category"
              defaultValue={category || ""}
              className="px-2 py-1 border border-fm-border rounded text-[10px] bg-fm-bg text-fm-text"
            >
              <option value="">{t.allCategories}</option>
              {categories.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category} ({c.count})
                </option>
              ))}
            </select>
            <select
              name="language"
              defaultValue={language || ""}
              className="px-2 py-1 border border-fm-border rounded text-[10px] bg-fm-bg text-fm-text"
            >
              <option value="">{t.allLanguages}</option>
              {languages.map((l) => (
                <option key={l.language} value={l.language}>
                  {l.language}
                </option>
              ))}
            </select>
            {(category || language) && (
              <Link href={`/search?q=${encodeURIComponent(q || "")}`} className="text-fm-link text-[10px] py-1">
                {t.clearFilters}
              </Link>
            )}
          </div>
        </TrackedForm>

        {/* Author profile card */}
        {authorStats && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
            <div className="flex items-center gap-3 text-[11px]">
              <span className="font-bold text-fm-green text-[13px]">{author}</span>
              <span className="text-fm-text-light">{authorStats.packages} {t.packagesWord}</span>
              <span className="text-fm-text-light">⭐ {authorStats.totalStars.toLocaleString()} {t.totalStars}</span>
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

        {!hasQuery && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
            <h3 className="text-[11px] font-bold text-fm-green mb-2">Suggested paths</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {suggestedPaths.map((item) => (
                <TrackedNextLink
                  key={item.href}
                  event="related_click"
                  eventTarget={item.eventTarget}
                  href={item.href}
                  className="block rounded border border-fm-border bg-white/70 p-2 hover:bg-white"
                >
                  <div className="text-[11px] font-bold text-fm-link">{item.label}</div>
                  <p className="mt-1 text-[10px] text-fm-text-light leading-relaxed">{item.blurb}</p>
                </TrackedNextLink>
              ))}
            </div>
          </div>
        )}

        {hasQuery && results.length > 0 && (topCategoryPivots.length > 0 || topTagPivots.length > 0 || topAuthorPivots.length > 0) && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
            <h3 className="text-[11px] font-bold text-fm-green mb-2">Continue exploring</h3>
            <div className="space-y-2 text-[10px]">
              {topCategoryPivots.length > 0 && (
                <div>
                  <div className="text-fm-text-light mb-1">Categories</div>
                  <div className="flex flex-wrap gap-1.5">
                    {topCategoryPivots.map(([categoryName, count]) => (
                      <TrackedNextLink
                        key={categoryName}
                        event="related_click"
                        eventTarget={`search:continue:category:${categoryName}`}
                        href={`/browse?category=${encodeURIComponent(categoryName)}`}
                        className="text-[9px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded hover:bg-green-200"
                      >
                        {categoryName} ({count})
                      </TrackedNextLink>
                    ))}
                  </div>
                </div>
              )}
              {topTagPivots.length > 0 && (
                <div>
                  <div className="text-fm-text-light mb-1">Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {topTagPivots.map(([tagName, count]) => (
                      <TrackedNextLink
                        key={tagName}
                        event="related_click"
                        eventTarget={`search:continue:tag:${tagName}`}
                        href={`/tag/${encodeURIComponent(tagName)}`}
                        className="text-[9px] bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded hover:bg-[#bbddff]"
                      >
                        #{tagName} ({count})
                      </TrackedNextLink>
                    ))}
                  </div>
                </div>
              )}
              {topAuthorPivots.length > 0 && (
                <div>
                  <div className="text-fm-text-light mb-1">Maintainers</div>
                  <div className="flex flex-wrap gap-1.5">
                    {topAuthorPivots.map(([authorName, count]) => (
                      <TrackedNextLink
                        key={authorName}
                        event="related_click"
                        eventTarget={`search:continue:author:${authorName}`}
                        href={`/author/${encodeURIComponent(authorName)}`}
                        className="text-[9px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded hover:bg-gray-200"
                      >
                        {authorName} ({count})
                      </TrackedNextLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Result count */}
        {hasQuery && (
          <div className="text-[10px] text-fm-text-light mb-3">
            {results.length} {t.resultsFound}
            {category ? ` ${t.inCategory} ${category}` : ""}
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
                className={`py-2.5 px-2 ${i % 2 === 0 ? "bg-fm-surface/50" : ""} border-b border-fm-border/50`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <TrackedNextLink
                    event="click"
                    eventTarget={`project:${project.name}@search`}
                    href={`/projects/${encodeURIComponent(project.name)}`}
                    className="text-[13px] font-bold text-fm-link hover:text-fm-link-hover"
                  >
                    {project.name}
                  </TrackedNextLink>
                  {project.repo_url && (
                    <TrackedLink
                      event="outbound"
                      eventTarget={`repo:${(() => { try { return new URL(project.repo_url).hostname; } catch { return ""; } })()}@search`}
                      href={project.repo_url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-fm-text-light hover:text-fm-link" title="Source">
                      &#128193;
                    </TrackedLink>
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
                <RankExplanation breakdown={project.rank_breakdown} className="mt-1" />
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {project.tags.map((tag) => (
                    <TrackedNextLink
                      key={tag}
                      event="related_click"
                      eventTarget={`search:continue:tag:${tag}`}
                      href={`/tag/${encodeURIComponent(tag)}`}
                      className="text-[9px] bg-fm-accent/10 text-fm-link px-1.5 py-0.5 rounded hover:bg-fm-accent/20"
                    >
                      {tag}
                    </TrackedNextLink>
                  ))}
                  <span className="text-[9px] text-fm-text-light ml-auto">
                    {t.byAuthor}{" "}
                    <TrackedNextLink
                      event="related_click"
                      eventTarget={`search:continue:author:${cleanAuthor(project.author)}`}
                      href={`/author/${encodeURIComponent(cleanAuthor(project.author))}`}
                      className="text-fm-link hover:text-fm-link-hover"
                    >
                      {cleanAuthor(project.author)}
                    </TrackedNextLink>
                  </span>
                  {project.language && (
                    <TrackedNextLink
                      event="related_click"
                      eventTarget={`search:continue:language:${project.language}`}
                      href={`/search?q=${encodeURIComponent(q || "")}&language=${encodeURIComponent(project.language)}`}
                      className="text-[9px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono hover:bg-gray-200"
                    >
                      {project.language}
                    </TrackedNextLink>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hasQuery && results.length === 0 && (
          <div className="py-4 space-y-3">
            <p className="text-[11px] text-fm-text-light">
              {t.noPackages} &ldquo;{q || author}&rdquo;.
            </p>

            {(rescueTags.length > 0 || rescueProjects.length > 0) && (
              <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3">
                <h3 className="text-[11px] font-bold text-fm-green mb-2">{t.tryInstead}</h3>

                {typoSuggestions.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-fm-text-light mb-1">{t.didYouMean}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {typoSuggestions.map((s) => (
                        <TrackedNextLink
                          key={s}
                          event="related_click"
                          eventTarget={`search-typo:${(q || author || "").slice(0, 40)}->${s}`}
                          href={`/search?q=${encodeURIComponent(s)}`}
                          className="text-[9px] bg-fm-green/10 text-fm-green px-1.5 py-0.5 rounded hover:bg-fm-green/20"
                        >
                          {s}
                        </TrackedNextLink>
                      ))}
                    </div>
                  </div>
                )}

                {rescueTags.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-fm-text-light mb-1">{t.relatedTags}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {rescueTags.map((r) => (
                        <TrackedNextLink
                          key={r.tag}
                          event="related_click"
                          eventTarget={`search-rescue-tag:${(q || author || "").slice(0, 40)}->${r.tag}`}
                          href={`/tag/${encodeURIComponent(r.tag)}`}
                          className="text-[9px] bg-fm-accent/10 text-fm-link px-1.5 py-0.5 rounded hover:bg-fm-accent/20"
                        >
                          #{r.tag} ({r.count})
                        </TrackedNextLink>
                      ))}
                    </div>
                  </div>
                )}

                {rescueProjects.length > 0 && (
                  <div>
                    <p className="text-[10px] text-fm-text-light mb-1">{t.closestProjects}</p>
                    <div className="space-y-1">
                      {rescueProjects.map((p) => (
                        <div key={p.name} className="text-[10px]">
                          <TrackedNextLink
                            event="related_click"
                            eventTarget={`search-rescue-project:${(q || author || "").slice(0, 40)}->${p.name}`}
                            href={`/projects/${encodeURIComponent(p.name)}`}
                            className="font-bold text-fm-link hover:text-fm-link-hover"
                          >
                            {p.name}
                          </TrackedNextLink>
                          <span className="text-fm-text-light"> — {p.short_desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Search tips */}
        {!hasQuery && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-4 mt-2">
            <h3 className="text-[11px] font-bold text-fm-green mb-2">{t.searchTipsTitle}</h3>
            <div className="space-y-1 text-[10px] text-fm-text-light">
              <p>🔍 <strong>{tips.packageName}:</strong> <Link href="/search?q=langchain" className="text-fm-link">langchain</Link></p>
              <p>🏷️ <strong>{tips.tag}:</strong> <Link href="/tag/mcp" className="text-fm-link">mcp</Link></p>
              <p>👤 <strong>{tips.maintainer}:</strong> <Link href="/author/anthropics" className="text-fm-link">anthropics</Link></p>
              <p>💬 <strong>{tips.description}:</strong> <Link href="/search?q=vector+database" className="text-fm-link">vector database</Link></p>
              <p>🔤 <strong>{tips.language}:</strong> {tips.languageHelp}</p>
              <p>📂 <strong>{tips.category}:</strong> {tips.categoryHelpPrefix}{" "}<Link href="/browse" className="text-fm-link">{tips.browseAll}</Link></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
