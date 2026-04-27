import type { LegislationItem, GovernanceStatus } from "@/lib/legislation";
import { isAiRelevant, inferThemes } from "@/lib/legislation-keywords";

// EUR-Lex public search — best-effort Atom ingest. As of 2026-04 the
// public search endpoint returns HTTP 202 (anti-bot interstitial) for
// unauthenticated requests, so this ingestor often returns []. The
// orchestrator handles that gracefully (Promise.allSettled).
//
// The EU side of the tracker is mainly anchor-driven: flagship
// instruments (EU AI Act, AI Liability Directive, Data Act, DSA, DMA)
// live in the ANCHOR_ITEMS list inside lib/legislation.ts so EU
// coverage does not depend on this ingest succeeding.
//
// TODO: switch to the EUR-Lex Web Service (registration required) or
// the European Parliament Open Data Portal once a stable endpoint is
// identified.
const EUR_LEX_SEARCH = "https://eur-lex.europa.eu/search.html";

// Collection codes per EUR-Lex docs:
//   3 = legislation, 5 = preparatory acts. We exclude case law / EFTA.
const SCOPE = "3,5";

const SEARCH_TERMS = [
  "artificial intelligence",
  "AI Act",
  "automated decision",
  "algorithm",
];

interface AtomEntry {
  id: string;
  title: string;
  link: string;
  published: string;
  summary?: string;
}

function parseAtom(xml: string): AtomEntry[] {
  // Minimal Atom parser — EUR-Lex feeds are well-formed and we only
  // need four fields. Avoids pulling a full XML parser dependency.
  const entries: AtomEntry[] = [];
  const entryRe = /<entry\b[^>]*>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const id = extract(block, "id");
    const title = extract(block, "title");
    const linkMatch = block.match(/<link\b[^>]*href="([^"]+)"/);
    const published = extract(block, "updated") || extract(block, "published");
    const summary = extract(block, "summary");
    if (id && title && linkMatch) {
      entries.push({
        id,
        title: decodeXml(title),
        link: linkMatch[1],
        published: published || new Date().toISOString(),
        summary: summary ? decodeXml(summary) : undefined,
      });
    }
  }
  return entries;
}

function extract(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function celexFromUrl(url: string): string | null {
  const m = url.match(/CELEX[:%3A]([0-9A-Z]+)/i);
  return m ? m[1] : null;
}

function mapStatus(title: string, summary: string | undefined): GovernanceStatus {
  const t = `${title} ${summary || ""}`.toLowerCase();
  if (/proposal\b|proposed\b|draft\b/.test(t)) return "proposed";
  if (/under negotiation|trilogue|interinstitutional/.test(t)) return "in_negotiation";
  if (/adopted|in force|published/.test(t)) return "in_force";
  return "approved_not_effective";
}

async function fetchTerm(term: string, signal: AbortSignal): Promise<AtomEntry[]> {
  const url =
    `${EUR_LEX_SEARCH}?text=${encodeURIComponent(term)}` +
    `&scope=EURLEX&type=quick&DTS_DOM=ALL&DTS_SUBDOM=LEGISLATION` +
    `&excConsLeg=true&page=1&format=Atom&typeOfActStatus=${SCOPE}`;
  const res = await fetch(url, {
    headers: { accept: "application/atom+xml,application/xml" },
    signal,
  });
  if (!res.ok) throw new Error(`EUR-Lex ${res.status} for term=${term}`);
  return parseAtom(await res.text());
}

export interface IngestOptions {
  signal?: AbortSignal;
}

export async function ingestEurLex(options: IngestOptions = {}): Promise<LegislationItem[]> {
  const signal = options.signal ?? AbortSignal.timeout(60_000);
  const seen = new Map<string, LegislationItem>();

  const results = await Promise.allSettled(SEARCH_TERMS.map((t) => fetchTerm(t, signal)));

  for (const r of results) {
    if (r.status !== "fulfilled") {
      console.warn("[ingest-eur-lex] term failed:", r.reason);
      continue;
    }
    for (const entry of r.value) {
      if (!isAiRelevant(entry.title, entry.summary)) continue;
      const celex = celexFromUrl(entry.link) || celexFromUrl(entry.id);
      const id = celex ? `eu-eur-lex-${celex}` : `eu-eur-lex-${entry.id.slice(-32)}`;
      if (seen.has(id)) continue;
      seen.set(id, {
        id,
        jurisdiction: "European Union",
        region: "Europe",
        instrument: entry.title,
        status: mapStatus(entry.title, entry.summary),
        effective_date: null,
        themes: inferThemes(entry.title, entry.summary),
        summary: (entry.summary || entry.title).trim(),
        issues: [],
        source_url: entry.link,
        last_updated: entry.published.slice(0, 10),
      });
    }
  }

  return Array.from(seen.values());
}
