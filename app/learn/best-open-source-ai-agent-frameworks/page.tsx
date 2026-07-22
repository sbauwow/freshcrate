import type { Metadata } from "next";
import Link from "next/link";
import { getProjectByName, type ProjectWithRelease } from "@/lib/queries";
import TrackedLink from "@/app/components/tracked-link";

export const metadata: Metadata = {
  title: "Best Open Source AI Agent Frameworks in 2026 | freshcrate",
  description:
    "A practical guide to the best open source AI agent frameworks: LangGraph, CrewAI, AgentScope, LangChain, and AutoGPT — with use-case guidance and Freshcrate links.",
  alternates: {
    canonical: "/learn/best-open-source-ai-agent-frameworks",
  },
  openGraph: {
    title: "Best Open Source AI Agent Frameworks in 2026",
    description:
      "Ranked AI agent framework picks with direct Freshcrate package links, best-for guidance, and a quick comparison table.",
    url: "https://www.freshcrate.ai/learn/best-open-source-ai-agent-frameworks",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Open Source AI Agent Frameworks in 2026",
    description:
      "Ranked AI agent framework picks with direct Freshcrate package links, best-for guidance, and a quick comparison table.",
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
    slug: "langgraph",
    label: "Best for serious stateful agent workflows",
    bestFor: "teams that want graph-shaped control, checkpoints, and deeper orchestration structure",
    why: "A strong default when you care about explicit flow control, state, and production-style agent design rather than quick demos.",
  },
  {
    slug: "crewAI",
    label: "Best for multi-agent role composition",
    bestFor: "builders who want role-based agents and collaborative task patterns quickly",
    why: "CrewAI is easy to explain, easy to demo, and a good fit for users exploring multi-agent decomposition first.",
  },
  {
    slug: "agentscope",
    label: "Best for visibility and controllable agent behavior",
    bestFor: "teams that want agent behavior they can inspect, evaluate, and reason about",
    why: "Useful when observability and trust matter as much as raw agent output quality.",
  },
  {
    slug: "langchain",
    label: "Best for ecosystem breadth",
    bestFor: "developers who want the biggest integration surface and broad ecosystem gravity",
    why: "Still one of the most common entry points when the priority is lots of connectors and familiar building blocks.",
  },
  {
    slug: "AutoGPT",
    label: "Best for agent-platform breadth and mindshare",
    bestFor: "operators who want a broad agent platform reference point and a well-known autonomous-agent brand",
    why: "AutoGPT remains a useful comparison anchor because so many users still benchmark agent tooling against it.",
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

export default function BestOpenSourceAiAgentFrameworksPage() {
  const projects = loadFeaturedProjects();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Best Open Source AI Agent Frameworks in 2026",
    description:
      "A practical guide to the best open source AI agent frameworks, with ranked picks and use-case guidance.",
    url: "https://www.freshcrate.ai/learn/best-open-source-ai-agent-frameworks",
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
    about: ["AI agents", "agent frameworks", "LangGraph", "CrewAI", "LangChain"],
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
        <span className="font-bold text-fm-text">Best Open Source AI Agent Frameworks</span>
      </nav>

      <header className="border-b-2 border-fm-green pb-3">
        <h1 className="text-[18px] font-bold text-fm-green">Best Open Source AI Agent Frameworks in 2026</h1>
        <p className="text-[12px] text-fm-text mt-2 leading-relaxed">
          If you want the short answer: start with <strong>LangGraph</strong> for stateful production workflows,
          choose <strong>CrewAI</strong> for role-based multi-agent collaboration, and consider <strong>AgentScope</strong>
          when inspectability and controllable behavior matter more than hype.
        </p>
        <p className="text-[10px] text-fm-text-light mt-2">
          Updated: 2026-05-15 · Query targets: best AI agent frameworks, open source agent frameworks, agent framework comparison
        </p>
      </header>

      <section className="bg-fm-sidebar-bg border border-fm-border rounded p-4">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">What this page answers</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          Most teams do not need “the best framework” in the abstract. They need the best framework for a specific operating model:
          graph control, multi-agent task decomposition, broad integrations, or a familiar platform to benchmark against.
          This page is designed to answer that selection question directly.
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
                  eventTarget={`guide:agent-frameworks->project:${project.name}`}
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
                <th className="text-left px-2 py-1">framework</th>
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
                      eventTarget={`guide:agent-frameworks->table:${project.name}`}
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
          <h2 className="text-[13px] font-bold text-fm-text mb-2">When to choose LangGraph or CrewAI</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Choose <strong>LangGraph</strong> when workflow state, branching, and checkpoint-like control matter. Choose <strong>CrewAI</strong>
            when the easiest way to explain the system is “multiple agents with roles collaborating on a task.”
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">When to choose ecosystem breadth</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Choose <strong>LangChain</strong> if you want broad integration gravity and familiar building blocks. Use <strong>AgentScope</strong>
            when control and observability are more important than ecosystem breadth, and treat <strong>AutoGPT</strong> as a useful platform benchmark rather than a one-size-fits-all answer.
          </p>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-white/60">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Related Freshcrate paths</h2>
        <div className="flex flex-wrap gap-3 text-[11px]">
          <TrackedLink event="related_click" eventTarget="guide:agent-frameworks->compare:langgraph-crewai-autogen" href="/compare/langgraph-vs-crewai-vs-autogen" className="text-fm-link hover:text-fm-link-hover">LangGraph vs CrewAI vs AutoGen</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:agent-frameworks->tag:agent" href="/tag/agent" className="text-fm-link hover:text-fm-link-hover">Agent tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:agent-frameworks->tag:llm" href="/tag/llm" className="text-fm-link hover:text-fm-link-hover">LLM tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:agent-frameworks->tag:multi-agent" href="/tag/multi-agent" className="text-fm-link hover:text-fm-link-hover">Multi-agent tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:agent-frameworks->compare" href="/compare" className="text-fm-link hover:text-fm-link-hover">Compare packages</TrackedLink>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-fm-sidebar-bg">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">How we chose</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          These picks prioritize framework selection clarity: stateful orchestration, multi-agent collaboration, observability, ecosystem breadth,
          and practical operator fit. This is a decision page, not a universal ranking — follow the linked package pages to go deeper.
        </p>
      </section>
    </div>
  );
}
