import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cleanAuthor } from "@/lib/author-slug";
import { computeLifecycle } from "@/lib/lifecycle";
import { getProjectsByTag } from "@/lib/queries";
import { getCopy, LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import TrackedLink from "@/app/components/tracked-link";

const guideLinksByTag: Record<string, Array<{ href: string; label: string; blurb: string }>> = {
  tracing: [
    {
      href: "/learn/best-ai-agent-observability-tools",
      label: "Best AI Agent Observability Tools",
      blurb: "Use this when you need a direct selector for tracing, prompt diagnosis, and failure analysis.",
    },
  ],
  evaluation: [
    {
      href: "/learn/best-ai-agent-observability-tools",
      label: "Best AI Agent Observability Tools",
      blurb: "A practical guide for eval loops, production quality monitoring, and agent debugging.",
    },
  ],
  observability: [
    {
      href: "/learn/best-ai-agent-observability-tools",
      label: "Best AI Agent Observability Tools",
      blurb: "A practical selector for tracing, evals, monitoring, and operational feedback loops.",
    },
  ],
  "vector-database": [
    {
      href: "/learn/best-rag-memory-tools-for-agents",
      label: "Best RAG and Memory Tools for Agents",
      blurb: "A practical guide for vector retrieval, memory layers, and agent context infrastructure.",
    },
  ],
  rag: [
    {
      href: "/learn/best-rag-memory-tools-for-agents",
      label: "Best RAG and Memory Tools for Agents",
      blurb: "A practical selector for retrieval stacks, persistent memory, and context-serving infrastructure.",
    },
  ],
  "browser-automation": [
    {
      href: "/learn/best-browser-automation-tools-for-ai-agents",
      label: "Best Browser Automation Tools for AI Agents",
      blurb: "A practical selector for live browser debugging, deterministic QA, and browser-agent workflows.",
    },
  ],
  "code-generation": [
    {
      href: "/learn/best-coding-agents",
      label: "Best Coding Agents and AI Dev Assistants",
      blurb: "Use this when you want an answer-oriented shortlist instead of a raw code-generation package list.",
    },
  ],
  "developer-tools": [
    {
      href: "/learn/best-coding-agents",
      label: "Best Coding Agents and AI Dev Assistants",
      blurb: "A practical selector for terminal-first agents, local-first assistants, and repo automation tools.",
    },
  ],
  mcp: [
    {
      href: "/learn/best-mcp-servers-for-claude-code",
      label: "Best MCP Servers for Claude Code",
      blurb: "Ranked picks for browser control, docs/context access, and operator workflows.",
    },
  ],
  "mcp-server": [
    {
      href: "/learn/best-mcp-servers-for-claude-code",
      label: "Best MCP Servers for Claude Code",
      blurb: "A direct guide for choosing practical MCP servers by workflow.",
    },
  ],
  claude: [
    {
      href: "/learn/best-mcp-servers-for-claude-code",
      label: "Best MCP Servers for Claude Code",
      blurb: "The highest-signal operator guide for Claude-oriented MCP setups.",
    },
  ],
  automation: [
    {
      href: "/learn/best-browser-automation-tools-for-ai-agents",
      label: "Best Browser Automation Tools for AI Agents",
      blurb: "A strong guide for agent workflows that need browsing, QA, and repeatable web actions.",
    },
  ],
  "claude-code": [
    {
      href: "/learn/best-mcp-servers-for-claude-code",
      label: "Best MCP Servers for Claude Code",
      blurb: "Start here if you want the shortest path to a stronger Claude Code tool stack.",
    },
    {
      href: "/learn/best-coding-agents",
      label: "Best Coding Agents and AI Dev Assistants",
      blurb: "A stronger guide if you are comparing Claude Code alternatives and operator-oriented coding agents.",
    },
  ],
  agent: [
    {
      href: "/learn/best-open-source-ai-agent-frameworks",
      label: "Best Open Source AI Agent Frameworks",
      blurb: "A practical selector for graph-first, role-based, and general agent frameworks.",
    },
  ],
  "ai-agent": [
    {
      href: "/learn/best-open-source-ai-agent-frameworks",
      label: "Best Open Source AI Agent Frameworks",
      blurb: "Use this when you need a direct framework recommendation instead of a package list.",
    },
  ],
  "agentic-ai": [
    {
      href: "/learn/best-open-source-ai-agent-frameworks",
      label: "Best Open Source AI Agent Frameworks",
      blurb: "A concise guide for choosing production-ready agent orchestration stacks.",
    },
    {
      href: "/compare/langgraph-vs-crewai-vs-autogen",
      label: "LangGraph vs CrewAI vs AutoGen",
      blurb: "Direct comparison page for the most citable multi-agent framework question.",
    },
  ],
  "multi-agent": [
    {
      href: "/learn/best-open-source-ai-agent-frameworks",
      label: "Best Open Source AI Agent Frameworks",
      blurb: "Best picks for multi-agent systems, state graphs, and team-style workflows.",
    },
    {
      href: "/compare/langgraph-vs-crewai-vs-autogen",
      label: "LangGraph vs CrewAI vs AutoGen",
      blurb: "A side-by-side verdict for the most common multi-agent framework choice.",
    },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  return {
    title: `freshcrate — #${decodedTag}`,
    description: `Projects tagged #${decodedTag} on freshcrate.`,
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const t = getCopy(locale).tagPage;
  const decodedTag = decodeURIComponent(tag);
  const normalizedTag = decodedTag.trim().toLowerCase();
  const projects = getProjectsByTag(normalizedTag);

  if (projects.length === 0) {
    notFound();
  }

  const totalStars = projects.reduce((sum, p) => sum + (p.stars || 0), 0);
  const authorSet = new Set(projects.map((p) => p.author).filter(Boolean));
  const categorySet = new Set(projects.map((p) => p.category).filter(Boolean));
  const relatedTags = Object.entries(
    projects.reduce((acc, p) => {
      for (const t of p.tags || []) {
        if (t === normalizedTag) continue;
        acc[t] = (acc[t] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const contextualGuides = guideLinksByTag[normalizedTag] ?? [];

  const trendingInTag = [...projects]
    .sort((a, b) => {
      const starDelta = (b.stars || 0) - (a.stars || 0);
      if (starDelta !== 0) return starDelta;
      return new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime();
    })
    .slice(0, 5);

  return (
    <div className="flex flex-col md:flex-row gap-5">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-fm-text-light mb-3">
          <Link href="/" className="text-fm-link hover:text-fm-link-hover">{t.home}</Link>
          {" > "}
          <span className="font-bold text-fm-text">#{normalizedTag}</span>
        </div>

        <div className="border-b-2 border-fm-green pb-2 mb-3">
          <h2 className="text-[14px] font-bold text-fm-green">{t.tag} #{normalizedTag}</h2>
          <p className="text-[10px] text-fm-text-light mt-1">
            {projects.length} {projects.length !== 1 ? t.packagesWord : t.packageWord} • ⭐ {totalStars.toLocaleString()} {t.totalStars}
          </p>
        </div>

        {trendingInTag.length > 0 && (
          <div className="mb-3 bg-fm-sidebar-bg border border-fm-border rounded p-2.5">
            <h3 className="text-[11px] font-bold text-fm-green mb-1">{t.trendingIn} #{normalizedTag}</h3>
            <div className="flex flex-wrap gap-2">
              {trendingInTag.map((p) => (
                <TrackedLink
                  key={`inline-${p.id}`}
                  event="related_click"
                  eventTarget={`tag:${normalizedTag}->inline-trending:${p.name}`}
                  href={`/projects/${encodeURIComponent(p.name)}`}
                  className="text-[10px] bg-fm-accent/10 text-fm-link px-1.5 py-0.5 rounded hover:bg-fm-accent/20"
                >
                  {p.name} ⭐{(p.stars || 0).toLocaleString()}
                </TrackedLink>
              ))}
            </div>
          </div>
        )}

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
                  <TrackedLink
                    event="related_click"
                    eventTarget={`tag:${normalizedTag}->project:${project.name}`}
                    href={`/projects/${encodeURIComponent(project.name)}`}
                    className="text-[13px] font-bold text-fm-link hover:text-fm-link-hover"
                  >
                    {project.name}
                  </TrackedLink>
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
                  {project.tags.slice(0, 10).map((projectTag) => (
                    <TrackedLink
                      key={projectTag}
                      event="related_click"
                      eventTarget={`tag:${normalizedTag}->tag:${projectTag}`}
                      href={`/tag/${encodeURIComponent(projectTag)}`}
                      className={`text-[9px] px-1.5 py-0.5 rounded ${projectTag === normalizedTag ? "bg-fm-green/15 text-fm-green font-bold" : "bg-fm-accent/10 text-fm-link hover:bg-fm-accent/20"}`}
                    >
                      {projectTag}
                    </TrackedLink>
                  ))}
                  <span className="text-[9px] text-fm-text-light ml-auto">
                    {t.byAuthor} <Link href={`/author/${encodeURIComponent(cleanAuthor(project.author))}`} className="text-fm-link hover:text-fm-link-hover">{cleanAuthor(project.author)}</Link>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="w-full md:w-[220px] md:shrink-0 xl:w-[260px] 2xl:w-[300px]">
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            {t.tagSnapshot}
          </h3>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-fm-text-light">{t.packages}:</span>
              <span className="font-bold">{projects.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fm-text-light">{t.authors}:</span>
              <span className="font-bold">{authorSet.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fm-text-light">{t.categories}:</span>
              <span className="font-bold">{categorySet.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fm-text-light">{t.totalStars}:</span>
              <span className="font-bold">{totalStars.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            {t.jump}
          </h3>
          <div className="text-[11px] space-y-1">
            <Link href={`/search?q=${encodeURIComponent(normalizedTag)}`} className="block text-fm-link hover:text-fm-link-hover">
              {t.searchThisTag}
            </Link>
            <Link href="/browse" className="block text-fm-link hover:text-fm-link-hover">
              {t.browseCategories}
            </Link>
          </div>
        </div>

        {trendingInTag.length > 0 && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mt-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              {t.trendingIn} #{normalizedTag}
            </h3>
            <div className="space-y-1 text-[11px]">
              {trendingInTag.map((p) => (
                <TrackedLink
                  key={p.id}
                  event="related_click"
                  eventTarget={`tag:${normalizedTag}->trending:${p.name}`}
                  href={`/projects/${encodeURIComponent(p.name)}`}
                  className="flex items-center justify-between text-fm-link hover:text-fm-link-hover"
                >
                  <span className="truncate pr-2">{p.name}</span>
                  <span className="text-fm-text-light text-[10px]">⭐{(p.stars || 0).toLocaleString()}</span>
                </TrackedLink>
              ))}
            </div>
          </div>
        )}

        {relatedTags.length > 0 && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mt-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              {t.relatedTags}
            </h3>
            <div className="space-y-1 text-[11px]">
              {relatedTags.map(([t, count]) => (
                <TrackedLink
                  key={t}
                  event="related_click"
                  eventTarget={`tag:${normalizedTag}->related:${t}`}
                  href={`/tag/${encodeURIComponent(t)}`}
                  className="flex items-center justify-between text-fm-link hover:text-fm-link-hover"
                >
                  <span>#{t}</span>
                  <span className="text-fm-text-light text-[10px]">{count}</span>
                </TrackedLink>
              ))}
            </div>
          </div>
        )}

        {contextualGuides.length > 0 && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mt-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              Guides for this tag
            </h3>
            <div className="space-y-2 text-[11px]">
              {contextualGuides.map((guide) => (
                <TrackedLink
                  key={guide.href}
                  event="related_click"
                  eventTarget={`tag:${normalizedTag}->guide:${guide.href}`}
                  href={guide.href}
                  className="block rounded border border-fm-border bg-white/70 p-2 hover:bg-white"
                >
                  <div className="font-bold text-fm-link">{guide.label}</div>
                  <p className="mt-1 text-[10px] text-fm-text-light leading-relaxed">{guide.blurb}</p>
                </TrackedLink>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
