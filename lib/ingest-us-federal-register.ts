import type { LegislationItem, GovernanceStatus } from "@/lib/legislation";
import { isAiRelevant, inferThemes } from "@/lib/legislation-keywords";

// Federal Register API — public, no key needed.
// https://www.federalregister.gov/developers/documentation/api/v1
const API = "https://www.federalregister.gov/api/v1/documents.json";

// Multiple search terms because the API's `conditions[term]` is a single
// full-text query string and we can't OR them in one call. Results
// dedupe by document_number on insert.
const SEARCH_TERMS = [
  "artificial intelligence",
  "machine learning",
  "algorithmic",
  "automated decision",
  "foundation model",
  "generative ai",
];

interface FedRegDoc {
  document_number: string;
  title: string;
  type: string;
  abstract?: string | null;
  publication_date: string;
  html_url: string;
  agencies?: Array<{ name?: string }>;
}

interface FedRegResponse {
  results?: FedRegDoc[];
}

function mapStatus(type: string): GovernanceStatus {
  // Federal Register document types:
  //   "Rule"               — already in force
  //   "Proposed Rule"      — out for comment, not yet binding
  //   "Notice"             — informational / RFIs
  //   "Presidential Document" — EOs, proclamations (treat as in force)
  switch (type) {
    case "Rule":
    case "Presidential Document":
      return "in_force";
    case "Proposed Rule":
      return "in_negotiation";
    default:
      return "proposed";
  }
}

async function fetchTerm(term: string, signal: AbortSignal): Promise<FedRegDoc[]> {
  // Last 365d only — the tracker is for current state, not history.
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const url =
    `${API}?per_page=100&order=newest` +
    `&conditions[term]=${encodeURIComponent(term)}` +
    `&conditions[publication_date][gte]=${since}`;
  const res = await fetch(url, { headers: { accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`Federal Register API ${res.status} for term=${term}`);
  const json = (await res.json()) as FedRegResponse;
  return json.results ?? [];
}

export interface IngestOptions {
  signal?: AbortSignal;
}

export async function ingestUsFederalRegister(options: IngestOptions = {}): Promise<LegislationItem[]> {
  const signal = options.signal ?? AbortSignal.timeout(60_000);
  const seen = new Map<string, LegislationItem>();

  const results = await Promise.all(SEARCH_TERMS.map((t) => fetchTerm(t, signal)));

  for (const docs of results) {
    for (const doc of docs) {
      // Trust the keyword filter to drop anything that snuck in via
      // tangential matches (e.g. the agency name contained "intelligence").
      if (!isAiRelevant(doc.title, doc.abstract)) continue;
      const id = `us-fedreg-${doc.document_number}`;
      if (seen.has(id)) continue;
      const agency = doc.agencies?.[0]?.name;
      seen.set(id, {
        id,
        jurisdiction: agency ? `United States (${agency})` : "United States (Federal)",
        region: "North America",
        instrument: `${doc.type}: ${doc.title}`,
        status: mapStatus(doc.type),
        effective_date: doc.publication_date,
        themes: inferThemes(doc.title, doc.abstract),
        summary: (doc.abstract || doc.title).trim(),
        issues: [],
        source_url: doc.html_url,
        last_updated: doc.publication_date,
      });
    }
  }

  return Array.from(seen.values());
}
