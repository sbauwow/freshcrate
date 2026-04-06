import { NextResponse } from "next/server";

interface Paper {
  title: string;
  url: string;
  source: string;
  date: string;
  authors?: string;
}

async function fetchArxiv(): Promise<Paper[]> {
  try {
    // arXiv Atom API — latest cs.AI + cs.CL papers
    const res = await fetch(
      "https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=8",
      { next: { revalidate: 3600 } } // cache 1hr
    );
    if (!res.ok) return [];

    const xml = await res.text();

    // Parse entries from Atom XML
    const entries: Paper[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, " ").trim() || "";
      const link = entry.match(/<id>(.*?)<\/id>/)?.[1] || "";
      const published = entry.match(/<published>(.*?)<\/published>/)?.[1] || "";
      const authorMatch = entry.match(/<author>\s*<name>(.*?)<\/name>/);
      const author = authorMatch?.[1] || "";

      if (title && link) {
        entries.push({
          title: title.slice(0, 120),
          url: link,
          source: "arXiv",
          date: published.slice(0, 10),
          authors: author ? `${author} et al.` : undefined,
        });
      }
    }
    return entries;
  } catch {
    return [];
  }
}

async function fetchHuggingFacePapers(): Promise<Paper[]> {
  try {
    // HuggingFace Daily Papers API
    const res = await fetch("https://huggingface.co/api/daily_papers?limit=6", {
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

async function fetchHuggingFaceTrending(): Promise<{ name: string; url: string; downloads: number; task: string }[]> {
  try {
    // Trending models
    const res = await fetch(
      "https://huggingface.co/api/models?sort=trending&direction=-1&limit=5",
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

export async function GET() {
  const [arxiv, hfPapers, hfTrending] = await Promise.all([
    fetchArxiv(),
    fetchHuggingFacePapers(),
    fetchHuggingFaceTrending(),
  ]);

  return NextResponse.json({
    papers: [...hfPapers, ...arxiv],
    trending_models: hfTrending,
    fetched_at: new Date().toISOString(),
  });
}
