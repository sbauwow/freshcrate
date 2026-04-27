import type { LegislationItem, GovernanceStatus } from "@/lib/legislation";
import { isAiRelevant, inferThemes } from "@/lib/legislation-keywords";

// UK Parliament Bills API — public, no key needed.
// https://bills-api.parliament.uk/index.html
const BILLS_API = "https://bills-api.parliament.uk/api/v1/Bills";
const PAGE_SIZE = 100;

interface UkBill {
  billId: number;
  shortTitle: string;
  longTitle?: string | null;
  summary?: string | null;
  isAct: boolean;
  isDefeated: boolean;
  currentStage?: { house?: string | null; description?: string | null } | null;
  lastUpdate?: string | null;
}

interface UkBillsResponse {
  items: UkBill[];
  totalResults: number;
}

function mapStatus(bill: UkBill): GovernanceStatus {
  if (bill.isAct) return "in_force";
  if (bill.isDefeated) return "paused_or_blocked";
  const stage = (bill.currentStage?.description || "").toLowerCase();
  if (stage.includes("royal assent")) return "in_force";
  if (stage.includes("third reading") || stage.includes("consideration of amendments")) {
    return "approved_not_effective";
  }
  if (stage.includes("committee") || stage.includes("report")) return "in_negotiation";
  return "proposed";
}

async function fetchPage(skip: number, signal: AbortSignal): Promise<UkBillsResponse> {
  const url = `${BILLS_API}?Take=${PAGE_SIZE}&Skip=${skip}&SortOrder=DateUpdatedDescending`;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`UK Bills API ${res.status}: ${url}`);
  return (await res.json()) as UkBillsResponse;
}

export interface IngestOptions {
  // Stop walking pages once we've seen this many consecutive irrelevant
  // bills — UK Parliament has thousands of bills and only a handful
  // mention AI, so a hard cap on traversal keeps cron runtime bounded.
  maxPages?: number;
  signal?: AbortSignal;
}

export async function ingestUkParliament(options: IngestOptions = {}): Promise<LegislationItem[]> {
  const maxPages = options.maxPages ?? 10;
  const signal = options.signal ?? AbortSignal.timeout(60_000);
  const items: LegislationItem[] = [];

  for (let page = 0; page < maxPages; page++) {
    const skip = page * PAGE_SIZE;
    const response = await fetchPage(skip, signal);
    if (response.items.length === 0) break;

    for (const bill of response.items) {
      const text = [bill.shortTitle, bill.longTitle, bill.summary].filter(Boolean).join(" ");
      if (!isAiRelevant(text)) continue;
      items.push({
        id: `uk-parliament-${bill.billId}`,
        jurisdiction: "United Kingdom",
        region: "Europe",
        instrument: bill.shortTitle,
        status: mapStatus(bill),
        effective_date: null,
        themes: inferThemes(text),
        summary: (bill.summary || bill.longTitle || bill.shortTitle).trim(),
        issues: [],
        source_url: `https://bills.parliament.uk/bills/${bill.billId}`,
        last_updated: (bill.lastUpdate || new Date().toISOString()).slice(0, 10),
      });
    }

    if (skip + response.items.length >= response.totalResults) break;
  }

  return items;
}
