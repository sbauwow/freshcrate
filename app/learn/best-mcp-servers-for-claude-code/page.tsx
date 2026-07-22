import type { Metadata } from "next";
import Link from "next/link";
import { getProjectByName, type ProjectWithRelease } from "@/lib/queries";
import TrackedLink from "@/app/components/tracked-link";

export const metadata: Metadata = {
  title: "Best MCP Servers for Claude Code in 2026 | freshcrate",
  description:
    "A practical guide to the best MCP servers for Claude Code: browser control, local tool execution, context bridges, and operator workflows.",
  alternates: {
    canonical: "/learn/best-mcp-servers-for-claude-code",
  },
  openGraph: {
    title: "Best MCP Servers for Claude Code in 2026",
    description:
      "Ranked MCP server picks for Claude Code, with best-for recommendations and direct Freshcrate package links.",
    url: "https://www.freshcrate.ai/learn/best-mcp-servers-for-claude-code",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best MCP Servers for Claude Code in 2026",
    description:
      "Ranked MCP server picks for Claude Code, with best-for recommendations and direct Freshcrate package links.",
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
    slug: "everything-claude-code",
    label: "Best overall Claude Code starter stack",
    bestFor: "operators who want a broad, Claude-oriented MCP setup fast",
    why: "Strong fit for users who want a purpose-built Claude Code surface instead of stitching together many tiny tools first.",
  },
  {
    slug: "chrome-devtools-mcp",
    label: "Best for real browser debugging",
    bestFor: "frontend debugging, DOM inspection, and runtime troubleshooting",
    why: "If Claude Code needs to inspect the real browser, network requests, layout, or console state, this is the most direct path.",
  },
  {
    slug: "playwright-mcp",
    label: "Best for deterministic browser automation",
    bestFor: "repeatable end-to-end browsing, QA flows, and scripted task execution",
    why: "Great when the goal is not just inspection but repeatable browser actions and workflows Claude can run reliably.",
  },
  {
    slug: "fastmcp",
    label: "Best for building your own MCP server quickly",
    bestFor: "developers who want to expose internal tools or custom workflows to Claude Code",
    why: "Useful when the highest-value server is your own. FastMCP lowers the cost of building and shipping that interface.",
  },
  {
    slug: "mcp-toolbox",
    label: "Best for tool orchestration and utility breadth",
    bestFor: "teams that want a wider operational toolbox rather than one narrow integration",
    why: "A practical pick when Claude Code needs access to many operational helpers instead of a single product-specific bridge.",
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

export default function BestMcpServersForClaudeCodePage() {
  const projects = loadFeaturedProjects();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Best MCP Servers for Claude Code in 2026",
    description:
      "A practical guide to the best MCP servers for Claude Code, with ranked picks and use-case guidance.",
    url: "https://www.freshcrate.ai/learn/best-mcp-servers-for-claude-code",
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
    about: ["MCP", "Claude Code", "developer tools", "browser automation"],
    dateModified: "2026-05-15",
  };

  return (
    <div className="max-w-4xl space-y-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-[10px] text-fm-text-light">
        <Link href="/" className="text-fm-link hover:text-fm-link-hover">Home</Link>
        {" > "}
        <Link href="/learn" className="text-fm-link hover:text-fm-link-hover">Learn</Link>
        {" > "}
        <span className="font-bold text-fm-text">Best MCP Servers for Claude Code</span>
      </nav>

      <header className="border-b-2 border-fm-green pb-3">
        <h1 className="text-[18px] font-bold text-fm-green">Best MCP Servers for Claude Code in 2026</h1>
        <p className="text-[12px] text-fm-text mt-2 leading-relaxed">
          If you only want the short answer: start with <strong>everything-claude-code</strong> for a broad Claude-oriented setup,
          use <strong>chrome-devtools-mcp</strong> when you need real browser debugging, and add <strong>playwright-mcp</strong>
          when you want repeatable automation instead of one-off inspection.
        </p>
        <p className="text-[10px] text-fm-text-light mt-2">
          Updated: 2026-05-15 · Query targets: best MCP servers, Claude Code MCP tools, open source MCP servers
        </p>
      </header>

      <section className="bg-fm-sidebar-bg border border-fm-border rounded p-4">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Why these picks</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          Claude Code users usually need one of three things: better context, real-world tool access, or browser control.
          The best MCP server depends on which bottleneck matters most. These picks favor practical operator value,
          active ecosystems, and direct usefulness inside coding and debugging loops.
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
                  eventTarget={`guide:mcp-claude-code->project:${project.name}`}
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
              <p className="text-[10px] text-fm-text-light mt-1">
                <strong>Best for:</strong> {project.bestFor}
              </p>
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
                      eventTarget={`guide:mcp-claude-code->table:${project.name}`}
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
          <h2 className="text-[13px] font-bold text-fm-text mb-2">When to choose browser-first MCP</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Choose <strong>chrome-devtools-mcp</strong> or <strong>playwright-mcp</strong> when Claude Code needs to inspect live pages,
            reproduce UI bugs, audit network requests, or run repeatable browser flows. If the work is UI-heavy, browser control usually beats pure file-context helpers.
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">When to choose context/tooling MCP</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Choose <strong>everything-claude-code</strong>, <strong>fastmcp</strong>, or <strong>mcp-toolbox</strong> when the main goal is exposing internal tools,
            workflows, or richer local context to Claude Code. These are better fits when you want deeper custom operator leverage, not just browser execution.
          </p>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-white/60">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">MCP servers that actually improve developer productivity</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          The highest-value MCP servers are usually not generic. They plug Claude Code into the exact surface you are working on:
          <strong> docs/context</strong>, <strong>browser/UI</strong>, <strong>database/cache</strong>, <strong>infra/runtime</strong>,
          <strong> observability/security</strong>, or <strong>research</strong>.
        </p>
        <div className="grid gap-3 md:grid-cols-2 mt-3 text-[11px]">
          <div>
            <h3 className="font-bold text-fm-text mb-1">docs/context</h3>
            <p className="text-fm-text-light">Context7 for up-to-date framework and library docs inside the coding loop.</p>
          </div>
          <div>
            <h3 className="font-bold text-fm-text mb-1">browser/UI</h3>
            <p className="text-fm-text-light">Playwright for frontend flow testing, accessibility review, and browser automation.</p>
          </div>
          <div>
            <h3 className="font-bold text-fm-text mb-1">database/cache</h3>
            <p className="text-fm-text-light">Postgres for schema/index/query review and Redis for cache, TTL, hot-key, and rate-limit analysis.</p>
          </div>
          <div>
            <h3 className="font-bold text-fm-text mb-1">infra/runtime</h3>
            <p className="text-fm-text-light">Docker and Kubernetes for container, deployment, probe, autoscaling, and runtime inspection. Terraform for infra design review.</p>
          </div>
          <div>
            <h3 className="font-bold text-fm-text mb-1">observability/security</h3>
            <p className="text-fm-text-light">Grafana and Sentry for latency, alerts, and production errors. Semgrep and Trivy for application and image vulnerability review.</p>
          </div>
          <div>
            <h3 className="font-bold text-fm-text mb-1">research</h3>
            <p className="text-fm-text-light">Firecrawl for docs extraction and architecture research, plus ArXiv for practical papers on distributed systems and backpressure topics.</p>
          </div>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-white/60">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Related Freshcrate paths</h2>
        <div className="flex flex-wrap gap-3 text-[11px]">
          <TrackedLink event="related_click" eventTarget="guide:mcp-claude-code->tag:mcp" href="/tag/mcp" className="text-fm-link hover:text-fm-link-hover">MCP tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:mcp-claude-code->tag:claude-code" href="/tag/claude-code" className="text-fm-link hover:text-fm-link-hover">Claude Code tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:mcp-claude-code->browse:mcp-servers" href="/browse?category=MCP%20Servers" className="text-fm-link hover:text-fm-link-hover">Browse MCP Servers</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:mcp-claude-code->compare" href="/compare" className="text-fm-link hover:text-fm-link-hover">Compare packages</TrackedLink>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-fm-sidebar-bg">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">How we chose</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          These picks favor practical usefulness for Claude Code workflows: browser debugging, repeatable browser automation,
          custom MCP server creation, and broad operational tool access. This is a decision page, not a full directory; use the package links above to keep exploring.
        </p>
      </section>
    </div>
  );
}
