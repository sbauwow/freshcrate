import type { Metadata } from "next";
import Link from "next/link";
import { getProjectByName, type ProjectWithRelease } from "@/lib/queries";
import TrackedLink from "@/app/components/tracked-link";

export const metadata: Metadata = {
  title: "Best RAG and Memory Tools for Agents in 2026 | freshcrate",
  description:
    "A practical guide to the best RAG and memory tools for agents: vector retrieval, persistent memory, serving layers, and context infrastructure for agent memory tools.",
  alternates: {
    canonical: "/learn/best-rag-memory-tools-for-agents",
  },
  openGraph: {
    title: "Best RAG and Memory Tools for Agents in 2026",
    description:
      "Ranked picks for vector retrieval, memory layers, and context infrastructure for AI agents.",
    url: "https://www.freshcrate.ai/learn/best-rag-memory-tools-for-agents",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best RAG and Memory Tools for Agents in 2026",
    description:
      "Ranked picks for vector retrieval, memory layers, and context infrastructure for AI agents.",
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
    slug: "ragflow",
    label: "Best overall RAG engine",
    bestFor: "teams that want a strong open source retrieval stack with agent-friendly context workflows",
    why: "A strong fit when retrieval quality and context orchestration matter more than just plugging in one vector database.",
  },
  {
    slug: "mem0",
    label: "Best for persistent agent memory",
    bestFor: "agents that need remembered preferences, history, and user-specific context across sessions",
    why: "Good when memory itself is the product bottleneck instead of raw retrieval throughput.",
  },
  {
    slug: "vllm",
    label: "Best serving layer for retrieval-heavy systems",
    bestFor: "teams serving large inference workloads where context length, latency, and throughput interact tightly",
    why: "Important when the real constraint is not only retrieval but serving retrieved context efficiently at scale.",
  },
  {
    slug: "vector-graph-rag",
    label: "Best for graph-shaped retrieval exploration",
    bestFor: "builders exploring GraphRAG-style workflows and relationship-aware retrieval",
    why: "Useful when simple chunk retrieval is not enough and graph-style structure becomes part of the answer path.",
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

export default function BestRagMemoryToolsPage() {
  const projects = loadFeaturedProjects();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Best RAG and Memory Tools for Agents in 2026",
    description:
      "A practical guide to RAG and memory tools for agents, with ranked picks for retrieval stacks, persistent memory, and serving infrastructure.",
    url: "https://www.freshcrate.ai/learn/best-rag-memory-tools-for-agents",
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
    about: ["RAG", "agent memory tools", "vector database", "retrieval", "GraphRAG"],
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
        <span className="font-bold text-fm-text">Best RAG and Memory Tools for Agents</span>
      </nav>

      <header className="border-b-2 border-fm-green pb-3">
        <h1 className="text-[18px] font-bold text-fm-green">Best RAG and Memory Tools for Agents in 2026</h1>
        <p className="text-[12px] text-fm-text mt-2 leading-relaxed">
          If you want the short answer: use <strong>RAGFlow</strong> when you need a strong overall retrieval stack,
          pick <strong>mem0</strong> when persistent memory is the core need, use <strong>vLLM</strong> when serving and long-context efficiency matter,
          and explore <strong>GraphRAG</strong>-style approaches when plain chunk retrieval stops being enough for your agent memory tools.
        </p>
        <p className="text-[10px] text-fm-text-light mt-2">
          Updated: 2026-05-22 · Query targets: agent memory tools, RAG tools for agents, vector DB for agents
        </p>
      </header>

      <section className="bg-fm-sidebar-bg border border-fm-border rounded p-4">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Why these picks</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          Good agent memory is not one thing. Sometimes the bottleneck is retrieval quality, sometimes it is long-term user memory,
          sometimes it is serving retrieved context efficiently, and sometimes it is relationship-aware reasoning that pushes you toward GraphRAG.
          In practice that often means exploring graphrag-style workflows instead of only chunk-and-rerank baselines.
          These picks are organized around those real operator bottlenecks.
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
                  eventTarget={`guide:rag-memory->project:${project.name}`}
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
                      eventTarget={`guide:rag-memory->table:${project.name}`}
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
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for retrieval quality</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Use <strong>RAGFlow</strong> when you need a serious open source retrieval stack and better context assembly, not just one more embedding store.
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for persistent memory</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Use <strong>mem0</strong> when your agent needs to remember users, preferences, facts, and prior interactions across sessions.
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for serving retrieved context</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Use <strong>vLLM</strong> when the hard part is serving large prompts and retrieval-heavy workloads with acceptable latency and throughput.
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Best for graph-shaped retrieval</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            Explore <strong>GraphRAG</strong>-style approaches when entity relationships and structured evidence matter more than flat chunk recall.
          </p>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-white/60">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Best supporting surfaces</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          The strongest retrieval stack is usually not just retrieval. It needs evals, prompt discipline, serving efficiency, and a clean way to expose memory into agent workflows.
          Good RAG gets better when it is paired with observability, browser-based evidence collection, and explicit source provenance.
        </p>
      </section>

      <section className="border border-fm-border rounded p-4 bg-white/60">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Related Freshcrate paths</h2>
        <div className="flex flex-wrap gap-3 text-[11px]">
          <TrackedLink event="related_click" eventTarget="guide:rag-memory->tag:rag" href="/tag/rag" className="text-fm-link hover:text-fm-link-hover">RAG tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:rag-memory->tag:vector-database" href="/tag/vector-database" className="text-fm-link hover:text-fm-link-hover">Vector database tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:rag-memory->browse:rag-memory" href="/browse?category=RAG%20%26%20Memory" className="text-fm-link hover:text-fm-link-hover">Browse RAG &amp; Memory</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:rag-memory->guide:coding" href="/learn/best-coding-agents" className="text-fm-link hover:text-fm-link-hover">Best Coding Agents</TrackedLink>
          <TrackedLink event="related_click" eventTarget="guide:rag-memory->guide:browser" href="/learn/best-browser-automation-tools-for-ai-agents" className="text-fm-link hover:text-fm-link-hover">Best Browser Automation Tools</TrackedLink>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-fm-sidebar-bg">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">How we chose</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          These picks prioritize practical context leverage for agents: retrieval quality, persistent memory, serving efficiency, and structure-aware reasoning.
          This is a decision page, not a universal leaderboard — use the linked project pages to dig deeper.
        </p>
      </section>
    </div>
  );
}
