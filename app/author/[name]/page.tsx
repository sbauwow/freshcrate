import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cleanAuthor } from "@/lib/author-slug";
import { computeLifecycle } from "@/lib/lifecycle";
import { getProjectsByAuthor } from "@/lib/queries";
import TrackedLink from "@/app/components/tracked-link";
import TrackedNextLink from "@/app/components/tracked-next-link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const author = cleanAuthor(decodeURIComponent(name));
  return {
    title: `freshcrate — ${author}`,
    description: `Projects published by ${author} on freshcrate.`,
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const author = cleanAuthor(decodeURIComponent(name));
  const projects = getProjectsByAuthor(author);

  if (projects.length === 0) {
    notFound();
  }

  const totalStars = projects.reduce((sum, p) => sum + (p.stars || 0), 0);
  const languageSet = new Set(projects.map((p) => p.language).filter(Boolean));
  const categorySet = new Set(projects.map((p) => p.category).filter(Boolean));
  const topTags = Array.from(
    projects.reduce((acc, project) => {
      for (const tag of project.tags || []) {
        acc.set(tag, (acc.get(tag) || 0) + 1);
      }
      return acc;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8);
  const topCategories = Array.from(
    projects.reduce((acc, project) => {
      acc.set(project.category, (acc.get(project.category) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5);
  const suggestedGuide =
    topCategories.find(([categoryName]) => categoryName === "MCP Servers")
      ? { href: "/learn/best-mcp-servers-for-claude-code", label: "Best MCP Servers for Claude Code" }
      : topCategories.find(([categoryName]) => categoryName === "Frameworks")
      ? { href: "/learn/best-open-source-ai-agent-frameworks", label: "Best Open Source AI Agent Frameworks" }
      : topCategories.find(([categoryName]) => categoryName === "AI Agents")
      ? { href: "/learn/best-coding-agents", label: "Best Coding Agents and AI Dev Assistants" }
      : null;

  return (
    <div className="flex flex-col md:flex-row gap-5">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-fm-text-light mb-3">
          <Link href="/" className="text-fm-link hover:text-fm-link-hover">Home</Link>
          {" > "}
          <span className="font-bold text-fm-text">{author}</span>
        </div>

        <div className="border-b-2 border-fm-green pb-2 mb-3">
          <h2 className="text-[14px] font-bold text-fm-green">Projects by {author}</h2>
          <p className="text-[10px] text-fm-text-light mt-1">
            {projects.length} package{projects.length !== 1 ? "s" : ""} • ⭐ {totalStars.toLocaleString()} total stars
          </p>
        </div>

        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green mb-2">Related paths</h3>
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <TrackedNextLink event="related_click" eventTarget={`author:${author}->search`} href={`/search?author=${encodeURIComponent(author)}`} className="bg-white/70 border border-fm-border px-1.5 py-0.5 rounded text-fm-link hover:bg-white">
              View in search
            </TrackedNextLink>
            {topCategories.slice(0, 3).map(([categoryName]) => (
              <TrackedNextLink
                key={categoryName}
                event="related_click"
                eventTarget={`author:${author}->category:${categoryName}`}
                href={`/browse?category=${encodeURIComponent(categoryName)}`}
                className="bg-green-100 px-1.5 py-0.5 rounded text-green-800 hover:bg-green-200"
              >
                {categoryName}
              </TrackedNextLink>
            ))}
            {suggestedGuide && (
              <TrackedNextLink
                event="related_click"
                eventTarget={`author:${author}->guide:${suggestedGuide.href}`}
                href={suggestedGuide.href}
                className="bg-[#bbddff]/50 px-1.5 py-0.5 rounded text-fm-link hover:bg-[#bbddff]"
              >
                {suggestedGuide.label}
              </TrackedNextLink>
            )}
          </div>
        </div>

        <div className="space-y-0">
          {projects.map((project, i) => {
            const lc = computeLifecycle({
              stars: project.stars ?? 0,
              forks: project.forks ?? 0,
              releaseCount: project.release_count ?? 1,
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
                  <Link
                    href={`/projects/${encodeURIComponent(project.name)}`}
                    className="text-[13px] font-bold text-fm-link hover:text-fm-link-hover"
                  >
                    {project.name}
                  </Link>
                  <span className="text-[11px] text-fm-text-light font-mono">{project.latest_version}</span>
                  <span className={`${lc.color} ${lc.textColor} px-1.5 py-0.5 rounded text-[9px] font-bold`} title={lc.reason}>
                    {lc.emoji} {lc.label}
                  </span>
                  {(project.stars ?? 0) > 0 && (
                    <span className="text-[9px] text-fm-text-light">⭐{project.stars.toLocaleString()}</span>
                  )}
                </div>

                <p className="text-[11px] text-fm-text">{project.short_desc}</p>

                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {project.tags.slice(0, 8).map((tag) => (
                    <TrackedNextLink
                      key={tag}
                      event="related_click"
                      eventTarget={`author:${author}->tag:${tag}`}
                      href={`/tag/${encodeURIComponent(tag)}`}
                      className="text-[9px] bg-fm-accent/10 text-fm-link px-1.5 py-0.5 rounded hover:bg-fm-accent/20"
                    >
                      {tag}
                    </TrackedNextLink>
                  ))}
                  <TrackedNextLink
                    event="related_click"
                    eventTarget={`author:${author}->category:${project.category}`}
                    href={`/browse?category=${encodeURIComponent(project.category)}`}
                    className="text-[9px] text-fm-link hover:text-fm-link-hover ml-auto"
                  >
                    {project.category}
                  </TrackedNextLink>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="w-full md:w-[220px] md:shrink-0 xl:w-[260px] 2xl:w-[300px]">
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Maintainer Snapshot
          </h3>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-fm-text-light">Packages:</span>
              <span className="font-bold">{projects.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fm-text-light">Total stars:</span>
              <span className="font-bold">{totalStars.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fm-text-light">Languages:</span>
              <span className="font-bold">{languageSet.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fm-text-light">Categories:</span>
              <span className="font-bold">{categorySet.size}</span>
            </div>
          </div>
        </div>

        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Jump
          </h3>
          <div className="text-[11px] space-y-1">
            <TrackedNextLink event="related_click" eventTarget={`author:${author}->search`} href={`/search?author=${encodeURIComponent(author)}`} className="block text-fm-link hover:text-fm-link-hover">
              View in search
            </TrackedNextLink>
            <TrackedNextLink event="related_click" eventTarget={`author:${author}->browse`} href="/browse" className="block text-fm-link hover:text-fm-link-hover">
              Browse categories
            </TrackedNextLink>
          </div>
        </div>

        {topTags.length > 0 && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mt-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">Top tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {topTags.map(([tagName, count]) => (
                <TrackedLink
                  key={tagName}
                  event="related_click"
                  eventTarget={`author:${author}->tag:${tagName}`}
                  href={`/tag/${encodeURIComponent(tagName)}`}
                  className="text-[9px] bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded hover:bg-[#bbddff]"
                >
                  #{tagName} ({count})
                </TrackedLink>
              ))}
            </div>
          </div>
        )}

        {topCategories.length > 0 && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mt-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">Top categories</h3>
            <div className="space-y-1 text-[11px]">
              {topCategories.map(([categoryName, count]) => (
                <TrackedLink
                  key={categoryName}
                  event="related_click"
                  eventTarget={`author:${author}->category:${categoryName}`}
                  href={`/browse?category=${encodeURIComponent(categoryName)}`}
                  className="flex items-center justify-between text-fm-link hover:text-fm-link-hover"
                >
                  <span>{categoryName}</span>
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
