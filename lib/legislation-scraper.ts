import type Database from "better-sqlite3";

// ── Types ──

interface FeedSource {
  id: number;
  name: string;
  feed_url: string;
  feed_type: string;
  region: string | null;
  keywords: string; // JSON array
  last_fetched_at: string | null;
  last_item_date: string | null;
  enabled: number;
}

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
  source_name: string;
  region: string | null;
}

export interface ScrapeResult {
  sources_checked: number;
  new_items: number;
  updated_items: number;
  errors: string[];
  items: { id: string; instrument: string; source: string; action: "inserted" | "updated" | "skipped" }[];
}

// ── RSS/Atom parser (lightweight, no external deps) ──

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim().replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1") : "";
}

function extractAllBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, "gi");
  return xml.match(re) || [];
}

function parseRssFeed(xml: string): Omit<FeedItem, "source_name" | "region">[] {
  // Try Atom first
  const atomEntries = extractAllBlocks(xml, "entry");
  if (atomEntries.length > 0) {
    return atomEntries.map((entry) => {
      const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/i);
      return {
        title: extractTag(entry, "title"),
        link: linkMatch?.[1] || extractTag(entry, "id"),
        description: extractTag(entry, "summary") || extractTag(entry, "content"),
        pubDate: extractTag(entry, "published") || extractTag(entry, "updated") || null,
      };
    });
  }

  // RSS 2.0
  const items = extractAllBlocks(xml, "item");
  return items.map((item) => ({
    title: extractTag(item, "title"),
    link: extractTag(item, "link"),
    description: extractTag(item, "description"),
    pubDate: extractTag(item, "pubDate") || extractTag(item, "dc:date") || null,
  }));
}

// ── Keyword matching ──

function matchesKeywords(text: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

// ── ID generation ──

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// ── Status inference from text ──

function inferStatus(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("enacted") || lower.includes("signed into law") || lower.includes("in force")) return "in_force";
  if (lower.includes("passed") || lower.includes("approved") || lower.includes("adopted")) return "approved_not_effective";
  if (lower.includes("committee") || lower.includes("debate") || lower.includes("negotiat") || lower.includes("amended")) return "in_negotiation";
  if (lower.includes("blocked") || lower.includes("withdrawn") || lower.includes("paused")) return "paused_or_blocked";
  return "proposed";
}

// ── Theme inference from text ──

const THEME_PATTERNS: [RegExp, string][] = [
  [/risk.?tier|risk.?class|high.?risk/i, "risk-tiering"],
  [/foundation.?model|general.?purpose|GPAI/i, "foundation-models"],
  [/transparen/i, "transparency"],
  [/conformity|audit|assessment/i, "conformity-assessment"],
  [/consumer.?protect/i, "consumer-protection"],
  [/impact.?assess/i, "impact-assessments"],
  [/liabilit/i, "liability"],
  [/govern/i, "governance"],
  [/content.?control|deepfake|synthetic/i, "content-controls"],
  [/data.?govern|privacy|personal.?data/i, "data-governance"],
  [/safety|safe/i, "safety"],
  [/procure/i, "procurement"],
  [/open.?source|open.?weight/i, "open-source"],
  [/election|political/i, "election-integrity"],
];

function inferThemes(text: string): string[] {
  const themes: string[] = [];
  for (const [re, theme] of THEME_PATTERNS) {
    if (re.test(text)) themes.push(theme);
  }
  return themes.length > 0 ? themes : ["ai-policy"];
}

// ── Region inference ──

function inferRegion(text: string, fallback: string | null): string {
  const lower = text.toLowerCase();
  if (/\b(eu|european union|europe|brussels)\b/i.test(lower)) return "Europe";
  if (/\b(united states|congress|senate|house of rep|u\.s\.|us federal)\b/i.test(lower)) return "North America";
  if (/\b(canada|canadian)\b/i.test(lower)) return "North America";
  if (/\b(china|chinese|beijing)\b/i.test(lower)) return "Asia-Pacific";
  if (/\b(uk|united kingdom|britain|parliament)\b/i.test(lower)) return "Europe";
  if (/\b(australia|australian)\b/i.test(lower)) return "Asia-Pacific";
  if (/\b(brazil|latin america)\b/i.test(lower)) return "Latin America";
  if (/\b(india|indian)\b/i.test(lower)) return "Asia-Pacific";
  if (/\b(singapore|japan|korea)\b/i.test(lower)) return "Asia-Pacific";
  if (/\b(uae|emirates|africa|nigeria|kenya)\b/i.test(lower)) return "Middle East & Africa";
  return fallback || "Global";
}

function inferJurisdiction(text: string, region: string): string {
  // Try to extract a country/state name
  const patterns: [RegExp, string][] = [
    [/\b(European Union|EU)\b/i, "European Union"],
    [/\bUnited States\b/i, "United States (Federal)"],
    [/\bCanada\b/i, "Canada"],
    [/\bUnited Kingdom|UK\b/i, "United Kingdom"],
    [/\bChina\b/i, "China"],
    [/\bAustralia\b/i, "Australia"],
    [/\bBrazil\b/i, "Brazil"],
    [/\bIndia\b/i, "India"],
    [/\bSingapore\b/i, "Singapore"],
  ];
  for (const [re, name] of patterns) {
    if (re.test(text)) return name;
  }
  return region;
}

// ── Main scraper ──

export async function refreshLegislationFromFeeds(
  db: Database.Database,
  opts: { limit?: number } = {}
): Promise<ScrapeResult> {
  const limit = opts.limit ?? 50;
  const sources = db.prepare(
    "SELECT * FROM legislation_sources WHERE enabled = 1"
  ).all() as FeedSource[];

  const result: ScrapeResult = {
    sources_checked: 0,
    new_items: 0,
    updated_items: 0,
    errors: [],
    items: [],
  };

  const upsert = db.prepare(`
    INSERT INTO legislation (id, jurisdiction, region, instrument, status, effective_date, themes, summary, issues, source_url, last_updated, auto_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      summary = CASE WHEN length(excluded.summary) > length(legislation.summary) THEN excluded.summary ELSE legislation.summary END,
      last_updated = excluded.last_updated,
      auto_source = excluded.auto_source,
      updated_at = datetime('now')
  `);

  const updateSource = db.prepare(
    "UPDATE legislation_sources SET last_fetched_at = datetime('now'), last_item_date = ? WHERE id = ?"
  );

  for (const source of sources) {
    result.sources_checked++;
    let keywords: string[];
    try {
      keywords = JSON.parse(source.keywords);
    } catch {
      keywords = [];
    }

    let xml: string;
    try {
      const res = await fetch(source.feed_url, {
        headers: { "User-Agent": "freshcrate-legislation-bot/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        result.errors.push(`${source.name}: HTTP ${res.status}`);
        continue;
      }
      xml = await res.text();
    } catch (err) {
      result.errors.push(`${source.name}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    const rawItems = parseRssFeed(xml);
    let latestDate = source.last_item_date;
    let processed = 0;

    for (const item of rawItems) {
      if (processed >= limit) break;

      // Skip old items we've already seen
      if (source.last_item_date && item.pubDate && item.pubDate <= source.last_item_date) {
        continue;
      }

      const combined = `${item.title} ${item.description}`;

      // Filter by keywords
      if (!matchesKeywords(combined, keywords)) continue;

      const region = inferRegion(combined, source.region);
      const jurisdiction = inferJurisdiction(combined, region);
      const status = inferStatus(combined);
      const themes = inferThemes(combined);
      const id = slugify(item.title || `${source.name}-${Date.now()}`);

      // Strip HTML tags from description
      const summary = item.description
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);

      const now = new Date().toISOString().slice(0, 10);

      try {
        const existing = db.prepare("SELECT id FROM legislation WHERE id = ?").get(id) as { id: string } | undefined;

        upsert.run(
          id,
          jurisdiction,
          region,
          item.title.slice(0, 200),
          status,
          null, // effective_date unknown from RSS
          JSON.stringify(themes),
          summary || item.title,
          JSON.stringify([]),
          item.link,
          now,
          source.name,
        );

        result.items.push({
          id,
          instrument: item.title.slice(0, 100),
          source: source.name,
          action: existing ? "updated" : "inserted",
        });

        if (existing) result.updated_items++;
        else result.new_items++;
      } catch (err) {
        result.errors.push(`${source.name}/${id}: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (item.pubDate && (!latestDate || item.pubDate > latestDate)) {
        latestDate = item.pubDate;
      }
      processed++;
    }

    updateSource.run(latestDate, source.id);
  }

  return result;
}
