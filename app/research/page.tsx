import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "freshcrate research — Latest AI Agent Papers & Models",
  description: "Live AI agent research from arXiv and HuggingFace. Papers, models, datasets, benchmarks.",
};

// — Types —

interface Paper {
  title: string;
  url: string;
  source: string;
  date: string;
  authors?: string;
}

interface TrendingModel {
  name: string;
  url: string;
  downloads: number;
  task: string;
}

interface TrendingDataset {
  name: string;
  url: string;
  downloads: number;
}

interface ResearchData {
  categorized_papers: {
    agent_research: Paper[];
    llm_models: Paper[];
    rag: Paper[];
    code_gen: Paper[];
    safety: Paper[];
    benchmarks: Paper[];
    tool_use: Paper[];
  };
  hf_papers: Paper[];
  trending_models: TrendingModel[];
  trending_datasets: TrendingDataset[];
  fetched_at: string;
}

// — Helpers —

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// — arXiv XML parser (regex, no deps) —

function parseArxivXml(xml: string, source = "arXiv"): Paper[] {
  const entries: Paper[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, " ").trim() || "";
    const link = entry.match(/<id>(.*?)<\/id>/)?.[1] || "";
    const published = entry.match(/<published>(.*?)<\/published>/)?.[1] || "";
    const authorName = entry.match(/<author>\s*<name>(.*?)<\/name>/)?.[1]?.trim() || "";

    if (title && link) {
      entries.push({
        title: title.slice(0, 150),
        url: link,
        source,
        date: published.slice(0, 10),
        authors: authorName ? `${authorName} et al.` : undefined,
      });
    }
  }
  return entries;
}

// — Server-side fetchers with revalidate caching —

async function fetchArxiv(query: string, max: number): Promise<Paper[]> {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://export.arxiv.org/api/query?search_query=${encoded}&sortBy=submittedDate&sortOrder=descending&max_results=${max}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    return parseArxivXml(await res.text());
  } catch {
    return [];
  }
}

async function fetchHFPapers(): Promise<Paper[]> {
  try {
    const res = await fetch("https://huggingface.co/api/daily_papers?limit=10", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data
      .map(
        (item: {
          title?: string;
          paper?: { id?: string; title?: string; authors?: { name?: string }[] };
          publishedAt?: string;
        }) => ({
          title: (item.title || item.paper?.title || "").slice(0, 150),
          url: `https://huggingface.co/papers/${item.paper?.id || ""}`,
          source: "HF Daily",
          date: (item.publishedAt || "").slice(0, 10),
          authors: item.paper?.authors?.[0]?.name
            ? `${item.paper.authors[0].name} et al.`
            : undefined,
        })
      )
      .filter((p: Paper) => p.title);
  } catch {
    return [];
  }
}

async function fetchHFModels(): Promise<TrendingModel[]> {
  try {
    const res = await fetch(
      "https://huggingface.co/api/models?sort=trending&direction=-1&limit=10",
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(
      (m: { modelId?: string; id?: string; downloads?: number; pipeline_tag?: string }) => ({
        name: m.modelId || m.id || "",
        url: `https://huggingface.co/${m.modelId || m.id}`,
        downloads: m.downloads || 0,
        task: m.pipeline_tag || "",
      })
    );
  } catch {
    return [];
  }
}

async function fetchHFDatasets(): Promise<TrendingDataset[]> {
  try {
    const res = await fetch(
      "https://huggingface.co/api/datasets?sort=trending&direction=-1&limit=8",
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((d: { id?: string; downloads?: number }) => ({
      name: d.id || "",
      url: `https://huggingface.co/datasets/${d.id}`,
      downloads: d.downloads || 0,
    }));
  } catch {
    return [];
  }
}

// — Section components —

function PaperList({ papers, fallback }: { papers: Paper[]; fallback: string }) {
  if (!papers.length)
    return <div className="text-[10px] text-fm-text-light italic">{fallback}</div>;
  return (
    <ul className="space-y-2">
      {papers.map((p, i) => (
        <li key={i}>
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fm-link hover:underline text-[11px] leading-tight block"
          >
            {p.title}
          </a>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span
              className={`text-[9px] px-1 py-0 rounded font-bold ${
                p.source === "HF Daily"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {p.source}
            </span>
            {p.authors && (
              <span className="text-[9px] text-fm-text-light truncate max-w-[180px]">
                {p.authors}
              </span>
            )}
            <span className="text-[9px] text-fm-text-light ml-auto">{p.date}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ModelList({ models }: { models: TrendingModel[] }) {
  if (!models.length)
    return <div className="text-[10px] text-fm-text-light italic">Could not load models.</div>;
  return (
    <ul className="space-y-1.5">
      {models.map((m, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <span className="text-[9px] text-fm-text-light mt-0.5 shrink-0 w-[14px] text-right">
            {i + 1}.
          </span>
          <div className="min-w-0 flex-1">
            <a
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fm-link hover:underline text-[11px] leading-tight block truncate"
              title={m.name}
            >
              {m.name}
            </a>
            <div className="flex items-center gap-2 text-[9px] text-fm-text-light">
              {m.task && (
                <span className="bg-blue-50 text-blue-600 px-1 rounded font-bold">{m.task}</span>
              )}
              <span>{formatDownloads(m.downloads)} downloads</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DatasetList({ datasets }: { datasets: TrendingDataset[] }) {
  if (!datasets.length)
    return <div className="text-[10px] text-fm-text-light italic">Could not load datasets.</div>;
  return (
    <ul className="space-y-1.5">
      {datasets.map((d, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <span className="text-[9px] text-fm-text-light mt-0.5 shrink-0 w-[14px] text-right">
            {i + 1}.
          </span>
          <div className="min-w-0 flex-1">
            <a
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fm-link hover:underline text-[11px] leading-tight block truncate"
              title={d.name}
            >
              {d.name}
            </a>
            <div className="text-[9px] text-fm-text-light">
              <span className="bg-purple-50 text-purple-600 px-1 rounded font-bold">dataset</span>{" "}
              {formatDownloads(d.downloads)} downloads
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SectionBox({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="mb-4">
      <h3 className="text-[12px] font-bold text-[#6f6f6f] border-b-2 border-[#6f6f6f] pb-1 mb-2 uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}

// — Jump links config —

const JUMP_LINKS = [
  { id: "agent-research", label: "agent research" },
  { id: "llm-models", label: "llm & models" },
  { id: "rag", label: "retrieval & rag" },
  { id: "code-gen", label: "code gen" },
  { id: "safety", label: "safety" },
  { id: "hf-papers", label: "hf papers" },
  { id: "trending-models", label: "trending models" },
  { id: "datasets", label: "datasets" },
  { id: "benchmarks", label: "benchmarks" },
  { id: "tool-use", label: "tool use" },
];

// — Page —

export default async function ResearchPage() {
  // Fetch all data server-side in parallel
  const [
    agentResearch,
    llmModels,
    rag,
    codeGen,
    safety,
    benchmarks,
    toolUse,
    hfPapers,
    trendingModels,
    trendingDatasets,
  ] = await Promise.all([
    fetchArxiv("all:agent AND cat:cs.AI", 8),
    fetchArxiv("cat:cs.CL", 8),
    fetchArxiv('all:"retrieval augmented"', 5),
    fetchArxiv('(all:"code generation" OR all:"code synthesis") AND (cat:cs.SE OR cat:cs.AI)', 5),
    fetchArxiv("(all:alignment OR all:safety) AND cat:cs.AI", 5),
    fetchArxiv("(all:benchmark OR all:evaluation) AND (cat:cs.AI OR cat:cs.CL)", 5),
    fetchArxiv('all:"tool use" OR all:"function calling"', 5),
    fetchHFPapers(),
    fetchHFModels(),
    fetchHFDatasets(),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-[14px] font-bold text-fm-text">
          freshcrate research — Latest AI Agent Papers &amp; Models
        </h1>
        <p className="text-[10px] text-fm-text-light mt-0.5">
          Live from arXiv and HuggingFace. Cached 1 hour. For agents who read papers.
        </p>
      </div>

      {/* Jump links */}
      <div className="bg-[#f0f0f0] border border-fm-border px-3 py-1.5 mb-4 text-[10px]">
        <span className="font-bold text-fm-text mr-1">Jump to:</span>
        {JUMP_LINKS.map((link, i) => (
          <span key={link.id}>
            {i > 0 && <span className="text-[#999] mx-1">|</span>}
            <a href={`#${link.id}`} className="text-fm-link hover:underline">
              {link.label}
            </a>
          </span>
        ))}
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
        {/* COLUMN 1 */}
        <div>
          <SectionBox id="agent-research" title="Agent Research">
            <PaperList papers={agentResearch} fallback="Could not load agent research papers." />
          </SectionBox>

          <SectionBox id="llm-models" title="LLM & Foundation Models">
            <PaperList papers={llmModels} fallback="Could not load LLM papers." />
          </SectionBox>

          <SectionBox id="rag" title="Retrieval & RAG">
            <PaperList papers={rag} fallback="Could not load RAG papers." />
          </SectionBox>

          <SectionBox id="code-gen" title="Code Generation">
            <PaperList papers={codeGen} fallback="Could not load code generation papers." />
          </SectionBox>

          <SectionBox id="safety" title="Safety & Alignment">
            <PaperList papers={safety} fallback="Could not load safety papers." />
          </SectionBox>
        </div>

        {/* COLUMN 2 */}
        <div>
          <SectionBox id="hf-papers" title="HuggingFace Daily Papers">
            <PaperList papers={hfPapers} fallback="Could not load HuggingFace papers." />
          </SectionBox>

          <SectionBox id="trending-models" title="Trending Models">
            <ModelList models={trendingModels} />
          </SectionBox>

          <SectionBox id="datasets" title="Trending Datasets">
            <DatasetList datasets={trendingDatasets} />
          </SectionBox>

          <SectionBox id="benchmarks" title="Benchmarks & Evals">
            <PaperList papers={benchmarks} fallback="Could not load benchmark papers." />
          </SectionBox>

          <SectionBox id="tool-use" title="Tool Use & MCP">
            <PaperList papers={toolUse} fallback="Could not load tool use papers." />
          </SectionBox>
        </div>
      </div>

      {/* Footer note */}
      <div className="text-[9px] text-fm-text-light mt-4 border-t border-fm-border pt-2">
        Data fetched server-side from{" "}
        <a href="https://arxiv.org" className="text-fm-link hover:underline">
          arXiv
        </a>{" "}
        and{" "}
        <a href="https://huggingface.co" className="text-fm-link hover:underline">
          HuggingFace
        </a>
        . Cached for 1 hour.{" "}
        <Link href="/api/research" className="text-fm-link hover:underline">
          Raw JSON API →
        </Link>
      </div>
    </div>
  );
}
