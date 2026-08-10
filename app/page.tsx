import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { cleanAuthor } from "@/lib/author-slug";
import { classifyLicense, licenseKindClass } from "@/lib/license";
import { getLatestReleases, getCategories, getStats, getLanguages, type ReleaseSort } from "@/lib/queries";
import { isRankingV2Enabled } from "@/lib/ranking";
import { computeLifecycle } from "@/lib/lifecycle";
import { getCopy, LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import ResearchFeed from "./components/research-feed";
import TrackedForm from "./components/tracked-form";
import TrackedLink from "./components/tracked-link";
import TrackedNextLink from "./components/tracked-next-link";

export const metadata: Metadata = {
  title: "freshcrate — fresh releases from the agent ecosystem: MCP servers, frameworks, coding agents",
  description:
    "Fresh releases from the agent ecosystem: MCP servers, orchestration frameworks, coding agents, infrastructure, and research tooling. Ranked open source packages with retrieval-friendly project pages.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "freshcrate — fresh releases from the agent ecosystem: MCP servers, frameworks, coding agents",
    description:
      "Fresh releases from the agent ecosystem: MCP servers, orchestration frameworks, coding agents, infrastructure, and research tooling.",
    url: "https://www.freshcrate.ai/",
  },
  twitter: {
    title: "freshcrate — fresh releases from the agent ecosystem: MCP servers, frameworks, coding agents",
    description:
      "Fresh releases from the agent ecosystem: MCP servers, orchestration frameworks, coding agents, infrastructure, and research tooling.",
  },
};

function LicensePill({ license, projectName }: { license: string; projectName?: string }) {
  const info = classifyLicense(license);
  const className = `${licenseKindClass(info.kind)} px-1.5 py-0.5 rounded text-[9px] font-mono font-bold`;
  if (info.isNonStandard && projectName) {
    return (
      <Link
        href={`/projects/${encodeURIComponent(projectName)}#license`}
        className={`${className} hover:underline`}
        title={info.raw.length > 120 ? info.raw.slice(0, 117) + "…" : info.raw}
      >
        {info.display}
      </Link>
    );
  }
  return (
    <span className={className} title={info.isNonStandard ? info.raw : undefined}>
      {info.display}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const colors: Record<string, string> = {
    Low: "bg-fm-urgency-low",
    Medium: "bg-fm-urgency-medium",
    High: "bg-fm-urgency-high",
    Critical: "bg-fm-urgency-critical",
  };
  return (
    <span className={`${colors[urgency] || "bg-gray-500"} text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase`}>
      {urgency}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  if (diff < 0) return "just now";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; category?: string; language?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const t = getCopy(locale);
  const homeT = t.home;
  const categories = getCategories();
  const languages = getLanguages();
  const stats = getStats();

  const defaultSort: ReleaseSort = isRankingV2Enabled() ? "rank" : "newest";
  const rawSort = typeof params.sort === "string" ? params.sort : defaultSort;
  const allowedSorts: ReleaseSort[] = ["rank", "newest", "oldest", "stars", "name"];
  const sort: ReleaseSort = allowedSorts.includes(rawSort as ReleaseSort)
    ? (rawSort as ReleaseSort)
    : defaultSort;

  const categorySet = new Set(categories.map((c) => c.category));
  const languageSet = new Set(languages.map((l) => l.language));

  const category =
    typeof params.category === "string" && categorySet.has(params.category)
      ? params.category
      : undefined;
  const language =
    typeof params.language === "string" && languageSet.has(params.language)
      ? params.language
      : undefined;

  const releases = getLatestReleases(50, 0, { sort, category, language });
  const topStructuredProjects = releases.slice(0, 8).map((project, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `https://www.freshcrate.ai/projects/${encodeURIComponent(project.name)}`,
    name: project.name,
    description: project.short_desc,
  }));
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://www.freshcrate.ai/#website",
        url: "https://www.freshcrate.ai/",
        name: "freshcrate",
        description:
          "Open source package directory for AI agents, MCP servers, orchestration frameworks, coding agents, infrastructure, and research tooling.",
        inLanguage: ["en", "zh-CN"],
        potentialAction: {
          "@type": "SearchAction",
          target: "https://www.freshcrate.ai/search?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": "https://www.freshcrate.ai/#organization",
        name: "freshcrate",
        url: "https://www.freshcrate.ai/",
        logo: "https://www.freshcrate.ai/logo.png",
      },
      {
        "@type": "ItemList",
        "@id": "https://www.freshcrate.ai/#latest-releases",
        name: "Freshcrate latest releases",
        itemListElement: topStructuredProjects,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <div className="flex flex-col md:flex-row gap-5">
      {/* Main content */}
      <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3 border-b-2 border-fm-green pb-1">
            <h2 className="feed-heading text-[14px] font-bold text-fm-green">{homeT.latestReleases}</h2>
            <span className="text-[10px] text-fm-text-light">{stats.projects} {homeT.packagesIndexed}</span>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
            <h1 className="text-[12px] text-fm-text-light font-normal">
              <span className="font-bold text-fm-green">freshcrate</span> — {homeT.heroTitle}
            </h1>
            <div className="flex flex-wrap gap-3 text-[10px]">
              <TrackedNextLink event="click" eventTarget="nav:browse@home" href="/browse" className="text-fm-link hover:text-fm-link-hover font-bold">{homeT.browse}</TrackedNextLink>
              <TrackedNextLink event="click" eventTarget="nav:orchestra@home" href="/orchestra" className="text-fm-link hover:text-fm-link-hover font-bold">{homeT.orchestra}</TrackedNextLink>
              <TrackedNextLink event="install" eventTarget="install:agent-edition@home" href="/agent-edition" className="text-fm-link hover:text-fm-link-hover">{homeT.agentEdition}</TrackedNextLink>
              <TrackedNextLink event="click" eventTarget="nav:learn@home-guides" href="/learn" className="text-fm-link hover:text-fm-link-hover">Guides →</TrackedNextLink>
            </div>
          </div>

          <TrackedForm event="search" eventTarget="search:home-filter" method="GET" className="bg-fm-sidebar-bg border border-fm-border rounded px-2 py-2 mb-3 text-[10px]">
<div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-0.5">
              <span className="text-fm-text-light">{homeT.sort}</span>
              <select name="sort" defaultValue={sort} className="border border-fm-border bg-fm-bg px-1 py-0.5 text-[10px]">
                <option value="rank">{homeT.sortRecommended}</option>
                <option value="newest">{homeT.sortNewest}</option>
                <option value="oldest">{homeT.sortOldest}</option>
                <option value="stars">{homeT.sortMostStars}</option>
                <option value="name">{homeT.sortName}</option>
              </select>
            </label>

            <label className="flex flex-col gap-0.5">
              <span className="text-fm-text-light">{homeT.category}</span>
              <select name="category" defaultValue={category ?? ""} className="border border-fm-border bg-fm-bg px-1 py-0.5 text-[10px]">
                <option value="">{homeT.allCategories}</option>
                {categories.map((c) => (
                  <option key={c.category} value={c.category}>{c.category}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-0.5">
              <span className="text-fm-text-light">{homeT.language}</span>
              <select name="language" defaultValue={language ?? ""} className="border border-fm-border bg-fm-bg px-1 py-0.5 text-[10px]">
                <option value="">{homeT.allLanguages}</option>
                {languages.map((l) => (
                  <option key={l.language} value={l.language}>{l.language}</option>
                ))}
              </select>
            </label>

            <button type="submit" className="border border-fm-nav-border bg-fm-btn-bg text-fm-btn-text px-2 py-0.5 font-bold hover:opacity-90 rounded-fm-sm">
              {homeT.apply}
            </button>
            <Link href="/" className="text-fm-link hover:text-fm-link-hover">{homeT.reset}</Link>
            <span className="ml-auto text-fm-text-light">{homeT.showingResults.replace("{count}", String(releases.length))}</span>
          </div>
        </TrackedForm>

        <div className="space-y-0">
          {releases.length === 0 && (
            <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 text-[11px] text-fm-text-light italic">
              {homeT.noReleases}
            </div>
          )}
          {releases.map((project, i) => (
            <div
              key={project.id}
              className={`feed-item py-2.5 px-2 ${i % 2 === 0 ? "bg-fm-surface/40" : ""} border-b border-fm-border/50 hover:bg-fm-surface/70 transition-colors`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <TrackedNextLink
                      event="click"
                      eventTarget={`project:${project.name}@home`}
                      href={`/projects/${encodeURIComponent(project.name)}`}
                      className="feed-title text-[13px] font-bold text-fm-link hover:text-fm-link-hover"
                    >
                      {project.name}
                    </TrackedNextLink>
                    {project.repo_url && (
                      <TrackedLink
                        event="outbound"
                        eventTarget={`repo:${(() => { try { return new URL(project.repo_url).hostname; } catch { return ""; } })()}@home`}
                        href={project.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-fm-text-light hover:text-fm-link"
                        title="View source on GitHub"
                      >
                        &#128193;
                      </TrackedLink>
                    )}
                    <span className="text-[11px] text-fm-text-light font-mono">
                      {project.latest_version}
                    </span>
                    {(() => {
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
                        <span className={`${lc.color} ${lc.textColor} px-1.5 py-0.5 rounded text-[9px] font-bold`} title={lc.reason}>
                          {lc.emoji} {lc.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-[11px] text-fm-text mb-1">{project.short_desc}</p>
                  <div className="text-[10px] text-fm-text-light">
                    <span className="italic">&ldquo;{project.latest_changes}&rdquo;</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {project.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/tag/${encodeURIComponent(tag)}`}
                        className="text-[9px] bg-fm-accent/10 text-fm-link px-1.5 py-0.5 rounded hover:bg-fm-accent/20"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-1.5 flex items-center flex-wrap gap-2 text-[10px] text-fm-text-light">
                    <Link
                      href={`/browse?category=${encodeURIComponent(project.category)}`}
                      className="text-fm-link hover:text-fm-link-hover"
                      title="Category"
                    >
                      {project.category}
                    </Link>
                    <span className="text-fm-border" aria-hidden>·</span>
                    <LicensePill license={project.license} projectName={project.name} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-fm-text-light">{timeAgo(project.release_date)}</div>
                  <div className="text-[10px] text-fm-text-light mt-0.5">by <Link href={`/author/${encodeURIComponent(cleanAuthor(project.author))}`} className="text-fm-link hover:text-fm-link-hover">{cleanAuthor(project.author)}</Link></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-full md:w-[220px] md:shrink-0 xl:w-[260px] 2xl:w-[300px]">
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Agent Edition
          </h3>
          <TrackedLink event="install" eventTarget="install:agent-edition@home-sidebar" href="/install/agent-edition" className="block text-[10px] text-fm-link hover:text-fm-link-hover">
            → Install freshcrate Agent Edition (Linux operator lane)
          </TrackedLink>
        </div>

        {/* Stats box */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Statistics
          </h3>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-fm-text-light">Packages:</span>
              <span className="font-bold">{stats.projects.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fm-text-light">Releases:</span>
              <span className="font-bold">{stats.releases.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fm-text-light">Categories:</span>
              <span className="font-bold">{stats.categories}</span>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Categories
          </h3>
          <ul className="space-y-1">
            {categories.map((cat) => (
              <li key={cat.category} className="text-[11px] flex justify-between">
                <Link href={`/browse?category=${encodeURIComponent(cat.category)}`} className="text-fm-link hover:text-fm-link-hover">
                  {cat.category}
                </Link>
                <span className="text-fm-text-light">({cat.count})</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Resources pointer (moved off dashboard) */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <TrackedNextLink event="click" eventTarget="nav:resources@home-sidebar" href="/resources" className="block text-[11px] font-bold text-fm-link hover:text-fm-link-hover">
            → Resources
          </TrackedNextLink>
          <p className="text-[10px] text-fm-text-light leading-relaxed mt-1">
            Model &amp; dataset registries, evaluation leaderboards, open source foundations, and a licensing primer for agents.
          </p>
        </div>

        {/* Live research + trending models */}
        <ResearchFeed />

        {/* About */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            About freshcrate
          </h3>
          <p className="text-[10px] text-fm-text-light leading-relaxed">
            freshcrate is the open source package directory for AI agents.
            Discover tools, frameworks, and libraries that agents are building and publishing.
            Submit your own packages via the web form or the API.
          </p>
        </div>

        {/* 📻 */}
        <TrackedLink
          event="outbound"
          eventTarget="outbound:plaza.one@home-sidebar"
          href="https://plaza.one/"
          target="_blank"
          rel="noopener noreferrer"
          className="block border border-[#2a1a3a] rounded p-3 text-center no-underline hover:border-[#ff71ce] transition-colors"
          style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%)" }}
          title="Preferred streaming partner for late-night coding sessions"
        >
          <div className="text-[10px] font-mono" style={{ color: "#ff71ce" }}>
            ▶ ｐ ｌ ａ ｚ ａ ． ｏ ｎ ｅ
          </div>
          <div className="text-[8px] mt-1" style={{ color: "#b967ff" }}>
            preferred agent streaming music partner
          </div>
          <div className="text-[7px] mt-0.5" style={{ color: "#05ffa1", opacity: 0.6 }}>
            ░▒▓ 24/7 vaporwave for your token window ▓▒░
          </div>
        </TrackedLink>
      </aside>
      </div>
    </>
  );
}
