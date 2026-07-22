import Link from "next/link";
import { cookies } from "next/headers";
import RankExplanation from "@/app/components/rank-explanation";
import TrackedLink from "@/app/components/tracked-link";
import TrackedNextLink from "@/app/components/tracked-next-link";
import { getCategories, getProjectsByCategory } from "@/lib/queries";
import { getCopy, LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";

const featuredBrowseCategories = ["AI Agents", "MCP Servers", "Frameworks", "Developer Tools"] as const;

const guideByCategory: Record<string, { href: string; label: string; blurb: string }> = {
  "AI Agents": {
    href: "/learn/best-coding-agents",
    label: "Guide for this category",
    blurb: "Best Coding Agents and AI Dev Assistants",
  },
  "MCP Servers": {
    href: "/learn/best-mcp-servers-for-claude-code",
    label: "Guide for this category",
    blurb: "Best MCP Servers for Claude Code",
  },
  Frameworks: {
    href: "/learn/best-open-source-ai-agent-frameworks",
    label: "Guide for this category",
    blurb: "Best Open Source AI Agent Frameworks",
  },
  "RAG & Memory": {
    href: "/learn/best-rag-memory-tools-for-agents",
    label: "Guide for this category",
    blurb: "Best RAG and Memory Tools for Agents",
  },
};

export default async function BrowsePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const t = getCopy(locale).browsePage;
  const categories = getCategories();

  const projects = category ? getProjectsByCategory(category) : [];
  const guideForCategory = category ? guideByCategory[category] : null;
  const topTags = category
    ? Array.from(
        projects.reduce((acc, project) => {
          for (const tag of project.tags || []) {
            acc.set(tag, (acc.get(tag) || 0) + 1);
          }
          return acc;
        }, new Map<string, number>())
      )
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 8)
    : [];
  const topAuthors = category
    ? Array.from(
        projects.reduce((acc, project) => {
          acc.set(project.author, (acc.get(project.author) || 0) + 1);
          return acc;
        }, new Map<string, number>())
      )
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
    : [];

  return (
    <div className="flex flex-col md:flex-row gap-5">
      <div className="flex-1 min-w-0">
        <div className="border-b-2 border-fm-green pb-1 mb-3">
          <h2 className="text-[14px] font-bold text-fm-green">
            {category ? `${t.browsePrefix} ${category}` : t.browseCategories}
          </h2>
        </div>

        {!category ? (
          <>
            <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
              <h3 className="text-[11px] font-bold text-fm-green mb-2">Popular categories for first-time visitors</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {featuredBrowseCategories.map((name) => (
                  <TrackedNextLink
                    key={name}
                    event="related_click"
                    eventTarget={`browse:category:${name}`}
                    href={`/browse?category=${encodeURIComponent(name)}`}
                    className="block rounded border border-fm-border bg-fm-surface/70 p-2 hover:bg-fm-surface"
                  >
                    <div className="text-[11px] font-bold text-fm-link">{name}</div>
                    <div className="text-[10px] text-fm-text-light">Jump into a high-signal category.</div>
                  </TrackedNextLink>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <TrackedNextLink
                  key={cat.category}
                  event="related_click"
                  eventTarget={`browse:category:${cat.category}`}
                  href={`/browse?category=${encodeURIComponent(cat.category)}`}
                  className="bg-fm-surface/50 border border-fm-border rounded p-3 hover:bg-fm-surface/80 transition-colors"
                >
                  <div className="text-[13px] font-bold text-fm-link">{cat.category}</div>
                  <div className="text-[10px] text-fm-text-light">{cat.count} {cat.count !== 1 ? t.packagesWord : t.packageWord}</div>
                </TrackedNextLink>
              ))}
            </div>
          </>
        ) : (
          <>
            {guideForCategory && (
              <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
                <div className="text-[10px] text-fm-text-light mb-1">Guide for this category</div>
                <TrackedNextLink
                  event="related_click"
                  eventTarget={`browse:guide:${category}`}
                  href={guideForCategory.href}
                  className="block rounded border border-fm-border bg-fm-surface/70 p-2 hover:bg-fm-surface"
                >
                  <div className="text-[11px] font-bold text-fm-link">{guideForCategory.blurb}</div>
                  <div className="text-[10px] text-fm-text-light mt-1">Use the guide first, then come back to the raw package list.</div>
                </TrackedNextLink>
              </div>
            )}
            <div className="space-y-0">
              {projects.map((project, i) => (
                <div
                  key={project.id}
                  className={`py-2.5 px-2 ${i % 2 === 0 ? "bg-fm-surface/50" : ""} border-b border-fm-border/50`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <TrackedNextLink event="related_click" eventTarget={`browse:project:${project.name}`} href={`/projects/${encodeURIComponent(project.name)}`} className="text-[13px] font-bold text-fm-link hover:text-fm-link-hover">
                      {project.name}
                    </TrackedNextLink>
                    <span className="text-[11px] text-fm-text-light font-mono">{project.latest_version}</span>
                  </div>
                  <p className="text-[11px] text-fm-text">{project.short_desc}</p>
                  <RankExplanation breakdown={project.rank_breakdown} className="mt-1" />
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {project.tags.map((tag) => (
                      <TrackedNextLink key={tag} event="related_click" eventTarget={`browse:tag:${tag}`} href={`/search?q=${encodeURIComponent(tag)}`} className="text-[9px] bg-fm-green/10 text-fm-green px-1.5 py-0.5 rounded hover:bg-fm-green/20">
                        {tag}
                      </TrackedNextLink>
                    ))}
                    <TrackedLink event="related_click" eventTarget={`browse:author:${project.author}`} href={`/author/${encodeURIComponent(project.author)}`} className="text-[9px] text-fm-link hover:text-fm-link-hover ml-auto">
                      {t.byAuthor} {project.author}
                    </TrackedLink>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-[11px] text-fm-text-light py-4">{t.noPackagesYet}</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Sidebar */}
      <aside className="w-full md:w-[220px] md:shrink-0 xl:w-[260px] 2xl:w-[300px]">
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            {t.allCategories}
          </h3>
          <ul className="space-y-1">
            {categories.map((cat) => (
              <li key={cat.category} className="text-[11px] flex justify-between">
                <TrackedNextLink
                  event="related_click"
                  eventTarget={`browse:category:${cat.category}`}
                  href={`/browse?category=${encodeURIComponent(cat.category)}`}
                  className={`text-fm-link hover:text-fm-link-hover ${category === cat.category ? "font-bold" : ""}`}
                >
                  {cat.category}
                </TrackedNextLink>
                <span className="text-fm-text-light">({cat.count})</span>
              </li>
            ))}
          </ul>
        </div>

        {category && topTags.length > 0 && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mt-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">Top tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {topTags.map(([tagName, count]) => (
                <TrackedNextLink
                  key={tagName}
                  event="related_click"
                  eventTarget={`browse:tag:${tagName}`}
                  href={`/tag/${encodeURIComponent(tagName)}`}
                  className="text-[9px] bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded hover:bg-[#bbddff]"
                >
                  #{tagName} ({count})
                </TrackedNextLink>
              ))}
            </div>
          </div>
        )}

        {category && topAuthors.length > 0 && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mt-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">Top maintainers</h3>
            <div className="space-y-1 text-[11px]">
              {topAuthors.map(([authorName, count]) => (
                <TrackedLink
                  key={authorName}
                  event="related_click"
                  eventTarget={`browse:author:${authorName}`}
                  href={`/author/${encodeURIComponent(authorName)}`}
                  className="flex items-center justify-between text-fm-link hover:text-fm-link-hover"
                >
                  <span>{authorName}</span>
                  <span className="text-fm-text-light text-[10px]">{count}</span>
                </TrackedLink>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
