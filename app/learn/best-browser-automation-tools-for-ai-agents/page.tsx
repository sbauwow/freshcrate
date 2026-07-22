import type { Metadata } from "next";
import Link from "next/link";
import { getProjectByName, type ProjectWithRelease } from "@/lib/queries";
import TrackedLink from "@/app/components/tracked-link";

export const metadata: Metadata = {
  title: "Best Browser Automation Tools for AI Agents in 2026 | freshcrate",
  description:
    "A practical guide to the best browser automation tools for AI agents: MCP browser control, deterministic QA flows, browser agent SDKs, and web automation agents.",
  alternates: {
    canonical: "/learn/best-browser-automation-tools-for-ai-agents",
  },
  openGraph: {
    title: "Best Browser Automation Tools for AI Agents in 2026",
    description:
      "Ranked picks for browser control, deterministic QA, and browser agent workflows.",
    url: "https://www.freshcrate.ai/learn/best-browser-automation-tools-for-ai-agents",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Browser Automation Tools for AI Agents in 2026",
    description:
      "Ranked picks for browser control, deterministic QA, and browser agent workflows.",
  },
};

type FeaturedPick = {
  slug: string;
  label: string;
  bestFor: string;
  why: string;
};

const featuredPicks: FeaturedPick[] = [
  {
    slug: "chrome-devtools-mcp",
    label: "Best for real browser debugging",
    bestFor: "agents that need live DOM, console, network, and rendering visibility",
    why: "Strongest fit when the problem is inside the browser and you need inspection rather than just automation.",
  },
  {
    slug: "playwright-mcp",
    label: "Best for deterministic automation",
    bestFor: "repeatable QA flows, browser scripting, and operational runbooks",
    why: "Best when you want reproducible browser actions an agent can run the same way every time.",
  },
  {
    slug: "stagehand",
    label: "Best browser agent SDK",
    bestFor: "teams building higher-level browser agents instead of only wiring raw automation commands",
    why: "Useful when you want an SDK surface for agentic browser behavior instead of only test-style execution.",
  },
  {
    slug: "opentabs",
    label: "Best for API-first browser escape hatches",
    bestFor: "operators who want to avoid brittle clicking when a direct API path exists",
    why: "Good reminder that the best browser automation stack often mixes browser control with API calls to reduce flake.",
  },
];

function loadFeaturedProjects(): Array<ProjectWithRelease & FeaturedPick> {
  return featuredPicks
    .map((pick) => {
      const project = getProjectByName(pick.slug);
      return project ? { ...project, ...pick } : null;
    })
    .filter(Boolean) as Array<ProjectWithRelease & FeaturedPick>;
}

function renderStars(stars: number | null | undefined): string {
  return `⭐${(stars || 0).toLocaleString()}`;
}

export default function BestBrowserAutomationToolsPage() {
  const projects = loadFeaturedProjects();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Best Browser Automation Tools for AI Agents in 2026",
    description:
      "A practical guide to browser automation tools for AI agents, with ranked picks for debugging, deterministic automation, and browser agent SDKs.",
    url: "https://www.freshcrate.ai/learn/best-browser-automation-tools-for-ai-agents",
    author: {
      "@type": "Organization",
      name: "freshcrate",
      url: "https://www.freshcrate.ai/",
    },
    publisher: {
      "@type": "Organization",
      name: "freshcrate",
      url: "https://www.freshcrate.ai/",
      logo: {
        "@type": "ImageObject",
        url: "https://www.freshcrate.ai/logo.png",
      },
    },
    about: ["browser automation", "web automation agents", "Playwright", "MCP", "browser agents"],
    dateModified: "2026-05-22",
  };

  return (
    <div className="max-w-4xl space-y-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-[10px] text-fm-text-light">
        <Link href="/" className="text-fm-link hover:text-fm-link-hover">Home</Link>
        {" > "}
        <Link href="/learn" className="text-fm-link hover:text-fm-link-hover">Learn</Link>
        {" > "}
        <span className="font-bold text-fm-text">Best Browser Automation Tools for AI Agents</span>
      </nav>

      <header className="border-b-2 border-fm-green pb-3">
        <h1 className="text-[18px] font-bold text-fm-green">Best Browser Automation Tools for AI Agents in 2026</h1>
        <p className="text-[12px] text-fm-text mt-2 leading-relaxed">
          If you want the short answer: use <strong>chrome-devtools-mcp</strong> for live browser debugging,
          pick <strong>playwright-mcp</strong> for deterministic QA and scripted flows, use <strong>stagehand</strong>
          when you are building richer browser agents, and keep <strong>browser-use</strong> in mind as a useful reference point
          for teams exploring broader <strong>web automation agents</strong>.
        </p>
        <p className="text-[10px] text-fm-text-light mt-2">
          Updated: 2026-05-22 · Query targets: browser automation for agents, best web automation agents, AI browsing tools
        </p>
      </header>

      <section className="bg-fm-sidebar-bg border border-fm-border rounded p-4">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Why these picks</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          Browser automation for agents usually breaks into three jobs: inspect the live browser, run deterministic flows,
          or build a higher-level agent behavior layer on top. The best tool depends on which job matters most and how much flake your workflow can tolerate.
        </p>
      </section>

      <section>
        <h2 className="text-[14px] font-bold text-fm-text border-b border-fm-border pb-1 mb-3">Best picks</h2>
        <div className="space-y-3">
          {projects.map((project, index) => (
            <article key={project.id} className="border border-fm-border rounded p-3 bg-white/60">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono text-fm-text-light">#{index + 1}</span>
                <TrackedLink
                  event="related_click"
                  eventTarget={`guide:browser-automation->project:${project.name}`}
                  href={`/projects/${encodeURIComponent(project.name)}`}
                  className="text-[13px] font-bold text-fm-link hover:text-fm-link-hover"
                >
                  {project.name}
                </TrackedLink>
                <span className="text-[10px] text-fm-text-light font-mono">{project.latest_version}</span>
                <span className="text-[9px] bg-fm-green/10 text-fm-green px-1.5 py-0.5 rounded">{project.label}</span>
                <span className="ml-auto text-[10px] text-fm-text-light">{renderStars(project.stars)}</span>
              </div>
              <p className="text-[11px] text-fm-text mt-1">{project.short_desc}</p>
              <p className="text-[10px] text-fm-text-light mt-1"><strong>Best for:</strong> {project.bestFor}</p>
              <p className="text-[10px] text-fm-text-light mt-1">{project.why}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[14px] font-bold text-fm-text border-b border-fm-border pb-1 mb-3">Quick comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-fm-border">
                <th className="text-left px-2 py-1">project</th>
                <th className="text-left px-2 py-1">best use</th>
                <th className="text-left px-2 py-1">category</th>
                <th className="text-left px-2 py-1">signal</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project, index) => (
                <tr key={project.id} className={index % 2 === 0 ? "bg-fm-sidebar-bg" : ""}>
                  <td className="px-2 py-1">
                    <TrackedLink
                      event="related_click"
                      eventTarget={`guide:browser-automation->table:${project.name}`}
                      href={`/projects/${encodeURIComponent(project.name)}`}
                      className="text-fm-link hover:text-fm-link-hover"
                    >
                      {project.name}
                    </TrackedLink>
                  </td>
                  <td className="px-2 py-1">{project.bestFor}</td>
                  <td className="px-2 py-1">{project.category}</td>
                  <td className="px-2 py-1">{renderStars(project.stars)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for live browser debugging</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Use <strong>chrome-devtools-mcp</strong> when an agent must inspect real DOM state, network waterfalls, console errors,
            layout shifts, or frontend breakage in the live browser.
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for deterministic QA flows</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Use <strong>playwright-mcp</strong> when reliability matters more than improvisation and you want repeatable browser actions,
            smoke tests, and scripted runbooks.
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for browser agent builders</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Use <strong>stagehand</strong> when the job is building a richer browser agent product or SDK surface instead of only wiring one-off automation.
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for reducing browser flake</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Use <strong>opentabs</strong> or API-first escape hatches when a full browser click path is brittle and the cleaner move is to mix automation with direct API calls.
          </p>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-white/60">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Best supporting surfaces</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          Browser automation becomes more useful when it is paired with context retrieval, MCP tool bridges, and eval loops.
          The strongest browser stack is usually not just a browser stack — it is browser plus memory, browser plus code execution, and browser plus operator feedback.
        </p>
      </section>

      <section className="border border-fm-border rounded p-4 bg-white/60">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Related Freshcrate paths</h2>
        <div className="flex flex-wrap gap-3 text-[11px]">
          <TrackedLink event="related_click" eventTarget="guide:browser-automation->tag:browser-automation" href="/tag/browser-automation" className="text-fm-link hover:text-fm-link-hover">Browser automation tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:browser-automation->tag:automation" href="/tag/automation" className="text-fm-link hover:text-fm-link-hover">Automation tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:browser-automation->guide:mcp" href="/learn/best-mcp-servers-for-claude-code" className="text-fm-link hover:text-fm-link-hover">Best MCP Servers for Claude Code</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:browser-automation->guide:coding" href="/learn/best-coding-agents" className="text-fm-link hover:text-fm-link-hover">Best Coding Agents</TrackedLink>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-fm-sidebar-bg">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">How we chose</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          These picks prioritize practical browser leverage for agent operators: live inspection, deterministic automation, browser-agent extensibility,
          and the ability to avoid brittle clicking when a cleaner path exists.
        </p>
      </section>
    </div>
  );
}
