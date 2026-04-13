import { NextResponse } from "next/server";

interface Paper {
  title: string;
  url: string;
  source: string;
  date: string;
  authors?: string;
  abstract?: string;
  is_new?: boolean;
  pwc_url?: string;
}

interface TrendingModel {
  name: string;
  url: string;
  downloads: number;
  task: string;
  trendingScore?: number;
}

interface TrendingDataset {
  name: string;
  url: string;
  downloads: number;
}

interface TrendingSpace {
  name: string;
  url: string;
  sdk: string;
  likes: number;
  trendingScore: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const EXTERNAL_FETCH_TIMEOUT_MS = 7000;

type FetchOptions = RequestInit & { next?: { revalidate?: number } };

async function fetchWithTimeout(url: string, init?: FetchOptions): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTERNAL_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function isNew(dateStr: string): boolean {
  return !!dateStr && Date.now() - new Date(dateStr).getTime() < SEVEN_DAYS_MS;
}

function getPwcUrl(arxivUrl: string): string | undefined {
  const match = arxivUrl.match(/arxiv\.org\/abs\/([\d.]+)/);
  return match ? `https://paperswithcode.com/paper/${match[1]}` : undefined;
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
    const abstract = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, " ").trim() || "";

    if (title && link) {
      const date = published.slice(0, 10);
      entries.push({
        title: title.slice(0, 120),
        url: link,
        source,
        date,
        authors: authorName ? `${authorName} et al.` : undefined,
        abstract: abstract ? abstract.slice(0, 500) : undefined,
        is_new: isNew(date),
        pwc_url: getPwcUrl(link),
      });
    }
  }
  return entries;
}

const UPSTREAM_TIMEOUT_MS = 4000;

async function fetchArxivQuery(query: string, maxResults: number, source = "arXiv"): Promise<Paper[]> {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetchWithTimeout(
      `https://export.arxiv.org/api/query?search_query=${encoded}&sortBy=submittedDate&sortOrder=descending&max_results=${maxResults}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }
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
    const res = await fetchWithTimeout(`https://huggingface.co/api/daily_papers?limit=${limit}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return data.map((item: { title?: string; paper?: { id?: string; title?: string; authors?: { name?: string }[] }; publishedAt?: string }) => {
      const date = (item.publishedAt || "").slice(0, 10);
      const arxivId = item.paper?.id || "";
      return {
        title: (item.title || item.paper?.title || "").slice(0, 120),
        url: `https://huggingface.co/papers/${arxivId}`,
        source: "HF Daily",
        date,
        authors: item.paper?.authors?.[0]?.name ? `${item.paper.authors[0].name} et al.` : undefined,
        is_new: isNew(date),
        pwc_url: arxivId ? `https://paperswithcode.com/paper/${arxivId}` : undefined,
      };
    }).filter((p: Paper) => p.title);
  } catch {
    return [];
  }
}

async function fetchHuggingFaceTrending(limit = 10): Promise<TrendingModel[]> {
  try {
    const res = await fetchWithTimeout(
      `https://huggingface.co/api/models?sort=trendingScore&direction=-1&limit=${limit}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }
    );
    if (!res.ok) return [];

    const data = await res.json();
    return data.map((m: { modelId?: string; id?: string; downloads?: number; pipeline_tag?: string; trendingScore?: number }) => ({
      name: m.modelId || m.id || "",
      url: `https://huggingface.co/${m.modelId || m.id}`,
      downloads: m.downloads || 0,
      task: m.pipeline_tag || "",
      trendingScore: m.trendingScore || 0,
    }));
  } catch {
    return [];
  }
}

async function fetchHuggingFaceDatasets(limit = 8): Promise<TrendingDataset[]> {
  try {
    const res = await fetchWithTimeout(
      `https://huggingface.co/api/datasets?sort=trendingScore&direction=-1&limit=${limit}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }
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

async function fetchHuggingFaceSpaces(limit = 10): Promise<TrendingSpace[]> {
  try {
    const res = await fetchWithTimeout(
      `https://huggingface.co/api/spaces?sort=trendingScore&direction=-1&limit=${limit}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }
    );
    if (!res.ok) return [];

    const data = await res.json();
    return data.map((s: { id?: string; sdk?: string; likes?: number; trendingScore?: number }) => ({
      name: s.id || "",
      url: `https://huggingface.co/spaces/${s.id}`,
      sdk: s.sdk || "",
      likes: s.likes || 0,
      trendingScore: s.trendingScore || 0,
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  const [
    agentResearch,
    llmModels,
    machineLearning,
    rag,
    codeGen,
    safety,
    benchmarks,
    toolUse,
    hfPapers,
    trendingModels,
    trendingDatasets,
    trendingSpaces,
  ] = await Promise.all([
    fetchArxivQuery("all:agent AND cat:cs.AI", 8),
    fetchArxivQuery("cat:cs.CL", 8),
    fetchArxivQuery("cat:cs.LG", 6),
    fetchArxivQuery('all:"retrieval augmented"', 5),
    fetchArxivQuery('(all:"code generation" OR all:"code synthesis") AND (cat:cs.SE OR cat:cs.AI)', 5),
    fetchArxivQuery("(all:alignment OR all:safety) AND cat:cs.AI", 5),
    fetchArxivQuery("(all:benchmark OR all:evaluation) AND (cat:cs.AI OR cat:cs.CL)", 5),
    fetchArxivQuery('all:"tool use" OR all:"function calling"', 5),
    fetchHuggingFacePapers(10),
    fetchHuggingFaceTrending(10),
    fetchHuggingFaceDatasets(8),
    fetchHuggingFaceSpaces(10),
  ]);

  return NextResponse.json({
    papers: [...hfPapers, ...agentResearch],
    categorized_papers: {
      agent_research: agentResearch,
      llm_models: llmModels,
      machine_learning: machineLearning,
      rag,
      code_gen: codeGen,
      safety,
      benchmarks,
      tool_use: toolUse,
    },
    hf_papers: hfPapers,
    trending_models: trendingModels,
    trending_datasets: trendingDatasets,
    trending_spaces: trendingSpaces,
    fetched_at: new Date().toISOString(),
  });
}
