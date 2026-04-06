"use client";

import { useEffect, useState } from "react";

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

interface ResearchData {
  papers: Paper[];
  trending_models: TrendingModel[];
}

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function ResearchFeed() {
  const [data, setData] = useState<ResearchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/research")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <SectionShell title="Latest Research">
          <div className="text-[10px] text-fm-text-light animate-pulse">Loading papers...</div>
        </SectionShell>
        <SectionShell title="Trending Models">
          <div className="text-[10px] text-fm-text-light animate-pulse">Loading models...</div>
        </SectionShell>
      </>
    );
  }

  if (!data) return null;

  return (
    <>
      {/* Papers */}
      <SectionShell title="Latest Research">
        <ul className="space-y-2">
          {data.papers.slice(0, 8).map((paper, i) => (
            <li key={i}>
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-fm-link hover:text-fm-link-hover text-[10px] leading-tight block"
              >
                {paper.title}
              </a>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] px-1 py-0 rounded font-bold ${
                  paper.source === "HF Daily"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-50 text-red-600"
                }`}>
                  {paper.source}
                </span>
                {paper.authors && (
                  <span className="text-[9px] text-fm-text-light truncate max-w-[120px]">{paper.authors}</span>
                )}
                <span className="text-[9px] text-fm-text-light ml-auto">{paper.date}</span>
              </div>
            </li>
          ))}
        </ul>
      </SectionShell>

      {/* Trending Models */}
      <SectionShell title="Trending Models">
        <ul className="space-y-1.5">
          {data.trending_models.map((model, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-[9px] text-fm-text-light mt-0.5 shrink-0">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <a
                  href={model.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fm-link hover:text-fm-link-hover text-[10px] leading-tight block truncate"
                  title={model.name}
                >
                  {model.name}
                </a>
                <div className="flex items-center gap-2 text-[9px] text-fm-text-light">
                  {model.task && <span>{model.task}</span>}
                  <span>{formatDownloads(model.downloads)} downloads</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </SectionShell>
    </>
  );
}

function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
      <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}
