import type { LegislationItem, GovernanceStatus } from "@/lib/legislation";
import { isAiRelevant, inferThemes } from "@/lib/legislation-keywords";

// Congress.gov API v3 — requires free key from api.congress.gov/sign-up.
// Set CONGRESS_API_KEY in env. Without it the ingestor no-ops so the
// rest of the pipeline still runs.
const CONGRESS_API = "https://api.congress.gov/v3";
const PAGE_SIZE = 250;
const CURRENT_CONGRESS = 119;

interface CongressBill {
  congress: number;
  type: string;
  number: number;
  title: string;
  latestAction?: { actionDate?: string; text?: string } | null;
  updateDate?: string;
}

interface CongressBillsResponse {
  bills?: CongressBill[];
  pagination?: { count: number; next?: string };
}

function mapStatus(action: string | undefined): GovernanceStatus {
  const a = (action || "").toLowerCase();
  if (a.includes("became public law") || a.includes("signed by president")) return "in_force";
  if (a.includes("passed senate") && a.includes("passed house")) return "approved_not_effective";
  if (a.includes("presented to president")) return "approved_not_effective";
  if (a.includes("passed") || a.includes("agreed to")) return "in_negotiation";
  if (a.includes("committee")) return "in_negotiation";
  if (a.includes("vetoed") || a.includes("failed")) return "paused_or_blocked";
  return "proposed";
}

async function fetchPage(offset: number, apiKey: string, signal: AbortSignal): Promise<CongressBillsResponse> {
  const url = `${CONGRESS_API}/bill/${CURRENT_CONGRESS}?api_key=${apiKey}&limit=${PAGE_SIZE}&offset=${offset}&sort=updateDate+desc&format=json`;
  const res = await fetch(url, { headers: { accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`Congress API ${res.status}`);
  return (await res.json()) as CongressBillsResponse;
}

export interface IngestOptions {
  maxPages?: number;
  signal?: AbortSignal;
}

export async function ingestUsCongress(options: IngestOptions = {}): Promise<LegislationItem[]> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    console.warn("[ingest-us-congress] CONGRESS_API_KEY not set, skipping ingest");
    return [];
  }

  const maxPages = options.maxPages ?? 8;
  const signal = options.signal ?? AbortSignal.timeout(60_000);
  const items: LegislationItem[] = [];

  for (let page = 0; page < maxPages; page++) {
    const offset = page * PAGE_SIZE;
    const response = await fetchPage(offset, apiKey, signal);
    const bills = response.bills ?? [];
    if (bills.length === 0) break;

    for (const bill of bills) {
      const actionText = bill.latestAction?.text;
      if (!isAiRelevant(bill.title, actionText)) continue;
      const themes = inferThemes(bill.title, actionText);
      items.push({
        id: `us-congress-${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`,
        jurisdiction: "United States (Federal)",
        region: "North America",
        instrument: `${bill.type} ${bill.number}: ${bill.title}`,
        status: mapStatus(actionText),
        effective_date: null,
        themes,
        summary: bill.title,
        issues: actionText ? [actionText] : [],
        source_url: `https://www.congress.gov/bill/${bill.congress}th-congress/${bill.type === "HR" ? "house-bill" : bill.type === "S" ? "senate-bill" : "bill"}/${bill.number}`,
        last_updated: (bill.updateDate || bill.latestAction?.actionDate || new Date().toISOString()).slice(0, 10),
      });
    }

    if (!response.pagination?.next) break;
  }

  return items;
}
