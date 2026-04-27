import type Database from "better-sqlite3";
import type { LegislationItem } from "@/lib/legislation";
import { ingestUkParliament } from "@/lib/ingest-uk-parliament";
import { ingestUsCongress } from "@/lib/ingest-us-congress";
import { ingestUsFederalRegister } from "@/lib/ingest-us-federal-register";
import { ingestEurLex } from "@/lib/ingest-eur-lex";

export interface RefreshLegislationOptions {
  dryRun?: boolean;
  signal?: AbortSignal;
  sources?: Array<"uk-parliament" | "us-congress" | "us-federal-register" | "eu-eur-lex">;
}

export interface SourceResult {
  source: string;
  ingested: number;
  written: number;
  error?: string;
}

export interface RefreshLegislationResult {
  durationMs: number;
  total: number;
  totalWritten: number;
  sources: SourceResult[];
}

const ALL_SOURCES = ["uk-parliament", "us-congress", "us-federal-register", "eu-eur-lex"] as const;

const UPSERT_SQL = `
  INSERT INTO legislation_items (
    id, source, jurisdiction, region, instrument, status,
    effective_date, themes, summary, issues, source_url, last_updated
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    jurisdiction = excluded.jurisdiction,
    region = excluded.region,
    instrument = excluded.instrument,
    status = excluded.status,
    effective_date = excluded.effective_date,
    themes = excluded.themes,
    summary = excluded.summary,
    issues = excluded.issues,
    source_url = excluded.source_url,
    last_updated = excluded.last_updated,
    ingested_at = datetime('now')
`;

function writeItems(db: Database.Database, source: string, items: LegislationItem[]): number {
  const stmt = db.prepare(UPSERT_SQL);
  const tx = db.transaction((rows: LegislationItem[]) => {
    for (const item of rows) {
      stmt.run(
        item.id,
        source,
        item.jurisdiction,
        item.region,
        item.instrument,
        item.status,
        item.effective_date,
        JSON.stringify(item.themes),
        item.summary,
        JSON.stringify(item.issues),
        item.source_url,
        item.last_updated
      );
    }
  });
  tx(items);
  return items.length;
}

async function runIngest(source: string, signal: AbortSignal | undefined): Promise<LegislationItem[]> {
  switch (source) {
    case "uk-parliament":
      return ingestUkParliament({ signal });
    case "us-congress":
      return ingestUsCongress({ signal });
    case "us-federal-register":
      return ingestUsFederalRegister({ signal });
    case "eu-eur-lex":
      return ingestEurLex({ signal });
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

export async function refreshLegislation(
  db: Database.Database,
  options: RefreshLegislationOptions = {}
): Promise<RefreshLegislationResult> {
  const start = Date.now();
  const sources = options.sources ?? Array.from(ALL_SOURCES);

  const settled = await Promise.allSettled(
    sources.map(async (source) => {
      const items = await runIngest(source, options.signal);
      return { source, items };
    })
  );

  const sourceResults: SourceResult[] = [];
  let total = 0;
  let totalWritten = 0;

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    const source = sources[i];
    if (result.status === "rejected") {
      sourceResults.push({
        source,
        ingested: 0,
        written: 0,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
      continue;
    }
    const items = result.value.items;
    total += items.length;
    const written = options.dryRun ? 0 : writeItems(db, source, items);
    totalWritten += written;
    sourceResults.push({ source, ingested: items.length, written });
  }

  return {
    durationMs: Date.now() - start,
    total,
    totalWritten,
    sources: sourceResults,
  };
}
