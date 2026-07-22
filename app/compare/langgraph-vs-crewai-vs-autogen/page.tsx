import type { Metadata } from "next";
import Link from "next/link";
import TrackedLink from "@/app/components/tracked-link";
import { getProjectByName, type ProjectWithRelease } from "@/lib/queries";

export const metadata: Metadata = {
  title: "LangGraph vs CrewAI vs AutoGen in 2026 | freshcrate",
  description:
    "A practical comparison of LangGraph, CrewAI, and AutoGen: which multi-agent framework to choose for stateful workflows, role-based teams, and Microsoft-style orchestration.",
  alternates: {
    canonical: "/compare/langgraph-vs-crewai-vs-autogen",
  },
  openGraph: {
    title: "LangGraph vs CrewAI vs AutoGen in 2026",
    description:
      "Direct verdict, feature table, operational complexity notes, and Freshcrate package links for LangGraph, CrewAI, and AutoGen.",
    url: "https://www.freshcrate.ai/compare/langgraph-vs-crewai-vs-autogen",
  },
  twitter: {
    card: "summary_large_image",
    title: "LangGraph vs CrewAI vs AutoGen in 2026",
    description:
      "Direct verdict, feature table, operational complexity notes, and Freshcrate package links for LangGraph, CrewAI, and AutoGen.",
  },
};

type FrameworkCard = {
  slug: string;
  name: string;
  verdict: string;
  bestFor: string;
  strengths: string[];
  weaknesses: string[];
  complexity: string;
  observability: string;
  ecosystem: string;
};

const frameworkCards: FrameworkCard[] = [
  {
    slug: "langgraph",
    name: "LangGraph",
    verdict: "Best overall for serious stateful agent systems.",
    bestFor: "teams that need graph control, checkpoints, and explicit workflow state",
    strengths: [
      "Strong fit for production-style orchestration",
      "Clear branching and state transitions",
      "Natural upgrade path from LangChain-heavy stacks",
    ],
    weaknesses: [
      "More structure than a quick prototype needs",
      "Can feel heavy if you only need a simple agent loop",
    ],
    complexity: "Highest design overhead up front, but the clearest long-term control surface.",
    observability: "Good fit when you want to reason about state, failures, and retries deliberately.",
    ecosystem: "Benefits from the broader LangChain ecosystem and mindshare.",
  },
  {
    slug: "crewAI",
    name: "CrewAI",
    verdict: "Best for fast role-based multi-agent composition.",
    bestFor: "builders who want agent roles, tasks, and collaborative workflows fast",
    strengths: [
      "Easy mental model for multi-agent collaboration",
      "Good demo and workflow decomposition story",
      "Fast path from concept to working prototype",
    ],
    weaknesses: [
      "Less explicit state machinery than graph-first systems",
      "Can become harder to reason about as workflows get more complex",
    ],
    complexity: "Lower onboarding friction than LangGraph; easier to explain to a new team.",
    observability: "Good enough for many teams, but less naturally structured around explicit state graphs.",
    ecosystem: "Strong momentum for multi-agent use cases and practical tutorials.",
  },
  {
    slug: "autogen",
    name: "AutoGen",
    verdict: "Best when you want Microsoft-backed orchestration patterns and agent conversation primitives.",
    bestFor: "teams that want a research-to-production bridge around agent conversations and orchestration",
    strengths: [
      "Well-known reference point for agent collaboration patterns",
      "Strong brand and ecosystem recognition",
      "Useful for benchmarking newer frameworks against a familiar baseline",
    ],
    weaknesses: [
      "Less opinionated as a direct state-machine answer than LangGraph",
      "Can require more judgment to shape into a clear production operating model",
    ],
    complexity: "Moderate complexity with a powerful but broader-feeling orchestration surface.",
    observability: "Better as a flexible orchestration toolkit than a tightly scoped state graph.",
    ecosystem: "High citation value because many agent conversations still reference AutoGen directly.",
  },
];

function loadFrameworks(): Array<ProjectWithRelease & FrameworkCard> {
  return frameworkCards
    .map((card) => {
      const project = getProjectByName(card.slug);
      return project ? { ...project, ...card } : null;
    })
    .filter(Boolean) as Array<ProjectWithRelease & FrameworkCard>;
}

function renderStars(stars: number | null | undefined): string {
  return `⭐${(stars || 0).toLocaleString()}`;
}

export default function LangGraphVsCrewAiVsAutoGenPage() {
  const frameworks = loadFrameworks();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "LangGraph vs CrewAI vs AutoGen in 2026",
    description:
      "A practical comparison of LangGraph, CrewAI, and AutoGen for multi-agent systems, stateful workflows, and production orchestration.",
    url: "https://www.freshcrate.ai/compare/langgraph-vs-crewai-vs-autogen",
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
    about: ["LangGraph", "CrewAI", "AutoGen", "multi-agent frameworks", "agent orchestration"],
    dateModified: "2026-05-15",
  };

  return (
    <div className="max-w-4xl space-y-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-[10px] text-fm-text-light">
        <Link href="/" className="text-fm-link hover:text-fm-link-hover">Home</Link>
        {" > "}
        <Link href="/compare" className="text-fm-link hover:text-fm-link-hover">Compare</Link>
        {" > "}
        <span className="font-bold text-fm-text">LangGraph vs CrewAI vs AutoGen</span>
      </nav>

      <header className="border-b-2 border-fm-green pb-3">
        <h1 className="text-[18px] font-bold text-fm-green">LangGraph vs CrewAI vs AutoGen</h1>
        <p className="text-[12px] text-fm-text mt-2 leading-relaxed">
          If you want the short answer: pick <strong>LangGraph</strong> for the strongest production-state model,
          choose <strong>CrewAI</strong> when role-based multi-agent collaboration is the core mental model,
          and use <strong>AutoGen</strong> when you want Microsoft-backed orchestration patterns and a familiar comparison baseline.
        </p>
        <p className="text-[10px] text-fm-text-light mt-2">
          Updated: 2026-05-15 · Query targets: langgraph vs crewai, autogen vs langgraph, best multi-agent framework
        </p>
      </header>

      <section className="bg-fm-sidebar-bg border border-fm-border rounded p-4">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">One-paragraph verdict</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          These three frameworks solve different versions of the same problem. <strong>LangGraph</strong> is the best fit when
          your team cares about explicit state, branching, and durable orchestration. <strong>CrewAI</strong> is usually the fastest
          way to ship role-based multi-agent workflows that people can understand immediately. <strong>AutoGen</strong> remains a strong
          choice when you want flexible agent conversation patterns and a widely recognized orchestration reference point.
        </p>
      </section>

      <section>
        <h2 className="text-[14px] font-bold text-fm-text border-b border-fm-border pb-1 mb-3">Best choice by use case</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {frameworks.map((framework) => (
            <article key={framework.id} className="border border-fm-border rounded p-3 bg-white/70">
              <div className="flex items-center gap-2 flex-wrap">
                <TrackedLink
                  event="related_click"
                  eventTarget={`compare:langgraph-crewai-autogen->project:${framework.name}`}
                  href={`/projects/${encodeURIComponent(framework.name)}`}
                  className="text-[13px] font-bold text-fm-link hover:text-fm-link-hover"
                >
                  {framework.name}
                </TrackedLink>
                <span className="text-[10px] text-fm-text-light font-mono">{framework.latest_version}</span>
                <span className="ml-auto text-[10px] text-fm-text-light">{renderStars(framework.stars)}</span>
              </div>
              <p className="text-[11px] text-fm-text mt-2"><strong>{framework.verdict}</strong></p>
              <p className="text-[10px] text-fm-text-light mt-2"><strong>Best for:</strong> {framework.bestFor}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[14px] font-bold text-fm-text border-b border-fm-border pb-1 mb-3">Feature comparison table</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-fm-border">
                <th className="text-left px-2 py-1">framework</th>
                <th className="text-left px-2 py-1">best for</th>
                <th className="text-left px-2 py-1">operational complexity</th>
                <th className="text-left px-2 py-1">observability</th>
                <th className="text-left px-2 py-1">ecosystem note</th>
              </tr>
            </thead>
            <tbody>
              {frameworks.map((framework, index) => (
                <tr key={framework.id} className={index % 2 === 0 ? "bg-fm-sidebar-bg" : ""}>
                  <td className="px-2 py-1 font-bold">{framework.name}</td>
                  <td className="px-2 py-1">{framework.bestFor}</td>
                  <td className="px-2 py-1">{framework.complexity}</td>
                  <td className="px-2 py-1">{framework.observability}</td>
                  <td className="px-2 py-1">{framework.ecosystem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {frameworks.map((framework) => (
          <article key={`${framework.id}-strengths`} className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
            <h2 className="text-[13px] font-bold text-fm-text mb-2">{framework.name} strengths / weaknesses</h2>
            <div className="text-[11px] text-fm-text space-y-2">
              <div>
                <div className="font-bold text-fm-green mb-1">Strengths</div>
                <ul className="list-disc pl-4 space-y-1">
                  {framework.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-bold text-fm-red mb-1">Weaknesses</div>
                <ul className="list-disc pl-4 space-y-1">
                  {framework.weaknesses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="border border-fm-border rounded p-3 bg-white/60">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Operational complexity</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            <strong>LangGraph</strong> usually asks for the most discipline up front, but pays that back with clearer long-run workflow control.
            <strong> CrewAI</strong> is often the easiest to get moving for teams translating jobs into agent roles and tasks.
            <strong> AutoGen</strong> sits in the middle: powerful, flexible, and widely discussed, but it still requires stronger design judgment than a simple role-based demo.
          </p>
        </div>
        <div className="border border-fm-border rounded p-3 bg-white/60">
          <h2 className="text-[13px] font-bold text-fm-text mb-2">Observability and ecosystem notes</h2>
          <p className="text-[11px] text-fm-text leading-relaxed">
            If you care most about understanding state and failure modes, <strong>LangGraph</strong> has the clearest alignment.
            If you care most about collaborative agent patterns and fast operator comprehension, <strong>CrewAI</strong> is easier to reason about socially.
            If you need a widely recognized orchestration reference that many teams already know, <strong>AutoGen</strong> carries strong ecosystem citation value.
          </p>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-fm-sidebar-bg">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Who should pick each one</h2>
        <div className="space-y-2 text-[11px] text-fm-text">
          <p><strong>Pick LangGraph</strong> if your agents need durable state, explicit branching, retries, and production-style workflow shape.</p>
          <p><strong>Pick CrewAI</strong> if your team thinks in specialists, roles, and collaborative task decomposition.</p>
          <p><strong>Pick AutoGen</strong> if you want a flexible orchestration toolkit with strong name recognition and conversation-centric patterns.</p>
        </div>
      </section>

      <section className="border border-fm-border rounded p-4 bg-white/60">
        <h2 className="text-[14px] font-bold text-fm-text mb-2">Related Freshcrate paths</h2>
        <div className="flex flex-wrap gap-3 text-[11px]">
          <TrackedLink event="related_click" eventTarget="compare:langgraph-crewai-autogen->framework-guide" href="/learn/best-open-source-ai-agent-frameworks" className="text-fm-link hover:text-fm-link-hover">Best open source AI agent frameworks</TrackedLink>
          <TrackedLink event="related_click" eventTarget="compare:langgraph-crewai-autogen->compare-home" href="/compare" className="text-fm-link hover:text-fm-link-hover">Compare packages</TrackedLink>
          <TrackedLink event="related_click" eventTarget="compare:langgraph-crewai-autogen->tag:multi-agent" href="/tag/multi-agent" className="text-fm-link hover:text-fm-link-hover">Multi-agent tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="compare:langgraph-crewai-autogen->tag:agent" href="/tag/agent" className="text-fm-link hover:text-fm-link-hover">Agent tag</TrackedLink>
          <TrackedLink event="related_click" eventTarget="compare:langgraph-crewai-autogen->tag:agentic-ai" href="/tag/agentic-ai" className="text-fm-link hover:text-fm-link-hover">Agentic AI tag</TrackedLink>
        </div>
      </section>
    </div>
  );
}
