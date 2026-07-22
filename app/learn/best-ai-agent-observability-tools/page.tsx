import type { Metadata } from "next";
import Link from "next/link";
import { getProjectByName, type ProjectWithRelease } from "@/lib/queries";
import TrackedLink from "@/app/components/tracked-link";

export const metadata: Metadata = {
  title: "Best AI Agent Observability Tools in 2026 | freshcrate",
  description:
    "A practical guide to the best AI agent observability tools: tracing, evals, monitoring, and feedback loops for agent observability.",
  alternates: {
    canonical: "/learn/best-ai-agent-observability-tools",
  },
  openGraph: {
    title: "Best AI Agent Observability Tools in 2026",
    description:
      "Ranked picks for tracing, evals, and production monitoring for AI agents.",
    url: "https://www.freshcrate.ai/learn/best-ai-agent-observability-tools",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best AI Agent Observability Tools in 2026",
    description:
      "Ranked picks for tracing, evals, and production monitoring for AI agents.",
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
    slug: "langfuse",
    label: "Best overall observability stack",
    bestFor: "teams that want tracing, prompt/version visibility, evals, and operational debugging in one place",
    why: "A strong fit when you need a broad open source platform instead of one narrow tracing view.",
  },
  {
    slug: "mlflow",
    label: "Best for eval-heavy production loops",
    bestFor: "teams that need experiment tracking, evaluation, and agent-quality monitoring across production systems",
    why: "Useful when agent work must connect to a broader ML and evaluation operating model.",
  },
  {
    slug: "phoenix",
    label: "Best for tracing and diagnosis",
    bestFor: "builders who need fast visibility into spans, prompts, retrieval paths, and failure cases",
    why: "Great when the immediate bottleneck is understanding what the agent actually did and where it went wrong.",
  },
  {
    slug: "agentops",
    label: "Best for coding-agent feedback loops",
    bestFor: "operators who want validation, memory, and session-level operational feedback around agent runs",
    why: "Good fit when the real need is operational control and compounding feedback rather than generic logging alone.",
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

export default function BestAiAgentObservabilityToolsPage() {
  const projects = loadFeaturedProjects();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Best AI Agent Observability Tools in 2026",
    description:
      "A practical guide to observability tools for AI agents, with ranked picks for tracing, evaluation, and production feedback loops.",
    url: "https://www.freshcrate.ai/learn/best-ai-agent-observability-tools",
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
    about: ["agent observability", "LLM tracing", "evaluation", "monitoring", "Braintrust"],
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
        <span className="font-bold text-fm-text">Best AI Agent Observability Tools</span>
      </nav>

      <header className="border-b-2 border-fm-green pb-3">
        <h1 className="text-[18px] font-bold text-fm-green">Best AI Agent Observability Tools in 2026</h1>
        <p className="text-[12px] text-fm-text mt-2 leading-relaxed">
          If you want the short answer: use <strong>Langfuse</strong> for the best broad open source observability stack,
          pick <strong>MLflow</strong> when evaluation and production quality loops matter most, use <strong>Phoenix</strong>
          for tracing and diagnosis, and look at <strong>AgentOps</strong> when you want tighter operational feedback around agent runs.
          If your team is comparing hosted eval-first options, <strong>Braintrust</strong> is part of the decision set too, and braintrust-style eval workflows are worth comparing directly.
        </p>
        <p className="text-[10px] text-fm-text-light mt-2">
          Updated: 2026-05-22 · Query targets: agent observability, LLM tracing tools, AI agent monitoring
        </p>
      </header>

      <section className="bg-fm-sidebar-bg border border-fm-border rounded p-4">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Why these picks</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          Observability for agents is not just logs. Good stacks help you inspect traces, compare prompts, evaluate outputs,
          watch retrieval paths, and close the loop with feedback. The right tool depends on whether your main pain is diagnosis,
          eval rigor, or operational control.
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
                  eventTarget={`guide:observability->project:${project.name}`}
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
                      eventTarget={`guide:observability->table:${project.name}`}
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
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for traces and prompt diagnosis</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Use <strong>Phoenix</strong> or <strong>Langfuse</strong> when you need to see what the agent actually did, how spans connect,
            and where prompts, retrieval, or tool calls started to drift.
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for eval and quality loops</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Use <strong>MLflow</strong> when evaluation, experiment tracking, and production quality gates need to live in the same operating model.
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for ops-oriented feedback</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Use <strong>AgentOps</strong> when the bottleneck is operational feedback and compounding control around agent runs, not just raw observability data.
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for hosted eval-first comparison</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            <strong>Braintrust</strong> remains a notable comparison point when teams evaluate hosted, eval-forward observability stacks against open source options.
          </p>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-white/60">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Best supporting surfaces</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          The strongest agent observability stack connects traces to evals, feedback, retrieval context, and deployment events.
          Good observability becomes much more valuable when it can explain user-visible failures and not just collect spans.
        </p>
      </section>

      <section className="border border-fm-border rounded p-4 bg-white/60">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Related Freshcrate paths</h2>
        <div className="flex flex-wrap gap-3 text-[11px]">
          <TrackedLink event="related_click" eventTarget="guide:observability->tag:observability" href="/tag/observability" className="text-fm-link hover:text-fm-link-hover">Observability tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:observability->tag:evaluation" href="/tag/evaluation" className="text-fm-link hover:text-fm-link-hover">Evaluation tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:observability->tag:tracing" href="/tag/tracing" className="text-fm-link hover:text-fm-link-hover">Tracing tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:observability->guide:rag" href="/learn/best-rag-memory-tools-for-agents" className="text-fm-link hover:text-fm-link-hover">Best RAG and Memory Tools</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:observability->guide:coding" href="/learn/best-coding-agents" className="text-fm-link hover:text-fm-link-hover">Best Coding Agents</TrackedLink>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-fm-sidebar-bg">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">How we chose</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          These picks prioritize practical agent debugging and quality control: tracing depth, eval support, operational feedback,
          and usefulness inside real production loops.
        </p>
      </section>
    </div>
  );
}
