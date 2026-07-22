import type { Metadata } from "next";
import Link from "next/link";
import { getProjectByName, type ProjectWithRelease } from "@/lib/queries";
import TrackedLink from "@/app/components/tracked-link";

export const metadata: Metadata = {
  title: "Best Coding Agents and AI Dev Assistants in 2026 | freshcrate",
  description:
    "A practical guide to the best coding agents and open source AI dev assistants: terminal-first picks, code review automation, local-first workflows, and Claude Code alternatives.",
  alternates: {
    canonical: "/learn/best-coding-agents",
  },
  openGraph: {
    title: "Best Coding Agents and AI Dev Assistants in 2026",
    description:
      "Ranked picks for terminal-first developers, code review automation, and local-first AI coding workflows.",
    url: "https://www.freshcrate.ai/learn/best-coding-agents",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Coding Agents and AI Dev Assistants in 2026",
    description:
      "Ranked picks for terminal-first developers, code review automation, and local-first AI coding workflows.",
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
    slug: "hermes-agent",
    label: "Best for terminal-first operators",
    bestFor: "developers who want local tools, browser control, memory, and direct shell execution in one loop",
    why: "Strong fit when you want an operator-grade coding agent that can move beyond autocomplete and work across files, commands, and live systems.",
  },
  {
    slug: "continue",
    label: "Best for editor-native workflows",
    bestFor: "teams that want an open source AI dev assistant embedded in the IDE",
    why: "A practical choice when the center of gravity is still the editor and you want a flexible open source assistant surface.",
  },
  {
    slug: "tabby",
    label: "Best for local-first coding help",
    bestFor: "developers who care about self-hosting, privacy, and keeping code assistance close to home",
    why: "Good fit when you want open source coding assistance without depending entirely on a hosted black-box workflow.",
  },
  {
    slug: "sweep",
    label: "Best for code review and repo automation",
    bestFor: "teams that want issue-to-PR automation, review acceleration, and repo-level coding help",
    why: "Useful when the bottleneck is not typing code but triage, review loops, and automated repo maintenance.",
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

export default function BestCodingAgentsPage() {
  const projects = loadFeaturedProjects();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Best Coding Agents and AI Dev Assistants in 2026",
    description:
      "A practical guide to the best coding agents and AI dev assistants, with ranked picks for terminal-first, local-first, and code review workflows.",
    url: "https://www.freshcrate.ai/learn/best-coding-agents",
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
    about: ["coding agents", "AI dev assistants", "Claude Code alternatives", "code review automation"],
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
        <span className="font-bold text-fm-text">Best Coding Agents</span>
      </nav>

      <header className="border-b-2 border-fm-green pb-3">
        <h1 className="text-[18px] font-bold text-fm-green">Best Coding Agents and AI Dev Assistants in 2026</h1>
        <p className="text-[12px] text-fm-text mt-2 leading-relaxed">
          If you want the short answer: pick <strong>Hermes Agent</strong> when you want a terminal-first operator loop,
          choose <strong>Continue</strong> for an editor-native open source assistant, use <strong>Tabby</strong> for local-first workflows,
          and reach for <strong>Sweep</strong> when the real need is code review and repo automation. These are strong
          <strong> Claude Code alternatives</strong> when you want more control over tooling, hosting, or workflow shape.
        </p>
        <p className="text-[10px] text-fm-text-light mt-2">
          Updated: 2026-05-22 · Query targets: best coding agents, open source AI coding agents, Claude Code alternatives
        </p>
      </header>

      <section className="bg-fm-sidebar-bg border border-fm-border rounded p-4">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Why these picks</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          The best coding agent depends on where you want leverage. Some agents are strongest in a shell-first operator loop,
          some are best as an editor companion, some emphasize self-hosting, and others win when the real job is review,
          triage, and automation around a repository. This page prioritizes operator value, open source control, and practical daily use.
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
                  eventTarget={`guide:coding-agents->project:${project.name}`}
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
                      eventTarget={`guide:coding-agents->table:${project.name}`}
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
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for terminal-first developers</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Pick <strong>Hermes Agent</strong> when you want a coding agent that can work across files, shell commands, browser tasks,
            and live systems in one operator loop. This is the best fit when your workflow extends beyond an editor tab.
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for code review / automation</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Pick <strong>Sweep</strong> when the main goal is repository throughput: issue triage, code review acceleration,
            and automated PR-style assistance. It helps most when team bottlenecks live in workflow and coordination.
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for local-first workflows</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Pick <strong>Tabby</strong> when local control, privacy, and self-hosting matter more than a hosted assistant experience.
            It is a strong answer for developers who want open source coding help without surrendering their workflow to a single vendor.
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for editor-native workflows</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Pick <strong>Continue</strong> when the editor is still your main operating surface and you want an open source AI dev assistant
            that feels closer to classic copilot-style assistance with more flexibility.
          </p>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-white/60">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Best supporting tools</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          Coding agents get stronger when they are paired with browser control, memory, eval, and MCP surfaces. A good coding agent alone is not enough.
          The highest-leverage stack usually combines one coding agent with a browser layer, a retrieval/context layer, and a tool bridge.
        </p>
        <div className="grid gap-3 md:grid-cols-2 mt-3 text-[11px]">
          <div>
            <h3 className="font-bold text-fm-text mb-1">browser</h3>
            <p className="text-fm-text-light">Use browser automation and inspection tools when the coding loop must debug real UI state, network flows, or auth paths.</p>
          </div>
          <div>
            <h3 className="font-bold text-fm-text mb-1">memory</h3>
            <p className="text-fm-text-light">Persistent memory and context layers matter once coding work spans multiple sessions, repos, or operators.</p>
          </div>
          <div>
            <h3 className="font-bold text-fm-text mb-1">eval</h3>
            <p className="text-fm-text-light">Use evals and regression gates to catch fake improvements that only look good on easy tasks.</p>
          </div>
          <div>
            <h3 className="font-bold text-fm-text mb-1">MCP</h3>
            <p className="text-fm-text-light">MCP servers turn a coding agent into an operator surface by exposing browsers, infra, docs, databases, and internal workflows.</p>
          </div>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-white/60">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Related Freshcrate paths</h2>
        <div className="flex flex-wrap gap-3 text-[11px]">
          <TrackedLink event="related_click" eventTarget="guide:coding-agents->tag:claude-code" href="/tag/claude-code" className="text-fm-link hover:text-fm-link-hover">Claude Code tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:coding-agents->tag:code-generation" href="/tag/code-generation" className="text-fm-link hover:text-fm-link-hover">Code generation tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:coding-agents->tag:developer-tools" href="/tag/developer-tools" className="text-fm-link hover:text-fm-link-hover">Developer tools tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:coding-agents->guide:mcp" href="/learn/best-mcp-servers-for-claude-code" className="text-fm-link hover:text-fm-link-hover">Best MCP Servers for Claude Code</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:coding-agents->guide:frameworks" href="/learn/best-open-source-ai-agent-frameworks" className="text-fm-link hover:text-fm-link-hover">Best Open Source AI Agent Frameworks</TrackedLink>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-fm-sidebar-bg">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">How we chose</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          These picks prioritize practical coding-agent leverage: terminal reach, editor fit, local-first control, repo automation,
          and operator extensibility. This is a decision page, not a universal leaderboard — use the linked project pages to dig deeper.
        </p>
      </section>
    </div>
  );
}
