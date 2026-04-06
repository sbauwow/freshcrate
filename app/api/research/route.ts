import { NextResponse } from "next/server";

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
        title: title.slice(0, 120),
        url: link,
        source,
        date: published.slice(0, 10),
        authors: authorName ? `${authorName} et al.` : undefined,
      });
    }
  }
  return entries;
}

async function fetchArxivQuery(query: string, maxResults: number, source = "arXiv"): Promise<Paper[]> {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://export.arxiv.org/api/query?search_query=${encoded}&sortBy=submittedDate&sortOrder=descending&max_results=${maxResults}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const xml = await res.text();
    return parseArxivXml(xml, source);
  } catch {
    return [];
  }
}

async function fetchHuggingFacePapers(limit = 10): Promise<Paper[]> {
  try {
    const res = await fetch(`https://huggingface.co/api/daily_papers?limit=${limit}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const data = await res.json();
    return data.map((item: { title?: string; paper?: { id?: string; title?: string; authors?: { name?: string }[] }; publishedAt?: string }) => ({
      title: (item.title || item.paper?.title || "").slice(0, 120),
      url: `https://huggingface.co/papers/${item.paper?.id || ""}`,
      source: "HF Daily",
      date: (item.publishedAt || "").slice(0, 10),
      authors: item.paper?.authors?.[0]?.name ? `${item.paper.authors[0].name} et al.` : undefined,
    })).filter((p: Paper) => p.title);
  } catch {
    return [];
  }
}

async function fetchHuggingFaceTrending(limit = 10): Promise<TrendingModel[]> {
  try {
    const res = await fetch(
      `https://huggingface.co/api/models?sort=trending&direction=-1&limit=${limit}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    return data.map((m: { modelId?: string; id?: string; downloads?: number; pipeline_tag?: string }) => ({
      name: m.modelId || m.id || "",
      url: `https://huggingface.co/${m.modelId || m.id}`,
      downloads: m.downloads || 0,
      task: m.pipeline_tag || "",
    }));
  } catch {
    return [];
  }
}

async function fetchHuggingFaceDatasets(limit = 8): Promise<TrendingDataset[]> {
  try {
    const res = await fetch(
      `https://huggingface.co/api/datasets?sort=trending&direction=-1&limit=${limit}`,
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

export async function GET() {
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
    fetchArxivQuery("all:agent AND cat:cs.AI", 8),
    fetchArxivQuery("cat:cs.CL", 8),
    fetchArxivQuery("all:\"retrieval augmented\"", 5),
    fetchArxivQuery("(all:\"code generation\" OR all:\"code synthesis\") AND (cat:cs.SE OR cat:cs.AI)", 5),
    fetchArxivQuery("(all:alignment OR all:safety) AND cat:cs.AI", 5),
    fetchArxivQuery("(all:benchmark OR all:evaluation) AND (cat:cs.AI OR cat:cs.CL)", 5),
    fetchArxivQuery("all:\"tool use\" OR all:\"function calling\"", 5),
    fetchHuggingFacePapers(10),
    fetchHuggingFaceTrending(10),
    fetchHuggingFaceDatasets(8),
  ]);

  return NextResponse.json({
    // Legacy combined field for sidebar compatibility
    papers: [...hfPapers, ...agentResearch],
    // New categorized fields
    categorized_papers: {
      agent_research: agentResearch,
      llm_models: llmModels,
      rag,
      code_gen: codeGen,
      safety,
      benchmarks,
      tool_use: toolUse,
    },
    hf_papers: hfPapers,
    trending_models: trendingModels,
    trending_datasets: trendingDatasets,
    fetched_at: new Date().toISOString(),
  });
}
