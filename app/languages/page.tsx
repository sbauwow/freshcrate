import Link from "next/link";
import { getDb } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "freshcrate — Languages",
  description:
    "Explore the programming language ecosystem across freshcrate packages. See which languages dominate, discover rising stars, and browse the category × language heatmap.",
};

const LANG_COLORS: Record<string, string> = {
  Python: "#3572A5",
  TypeScript: "#3178C6",
  Go: "#00ADD8",
  Rust: "#DEA584",
  JavaScript: "#F1E05A",
  Java: "#B07219",
  "C++": "#F34B7D",
  "C#": "#178600",
  Kotlin: "#A97BFF",
  Shell: "#89E051",
  Mixed: "#6B7280",
  "Docs / Meta": "#9A3412",
};

const OTHERS_COLOR = "#8B8B8B";

function langColor(lang: string): string {
  return LANG_COLORS[lang] || OTHERS_COLOR;
}

function isDarkText(lang: string): boolean {
  return lang === "JavaScript" || lang === "Shell";
}

function formatStars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

function SectionHeader({ id, title }: { id: string; title: string }) {
  return (
    <div id={id} className="border-b-2 border-fm-green mt-6 mb-2 pb-1 scroll-mt-4">
      <h2 className="text-[14px] font-bold text-fm-green">{title}</h2>
    </div>
  );
}

interface LangRow {
  language: string;
  count: number;
  total_stars: number;
  avg_stars: number;
}

interface TopPkg {
  name: string;
  stars: number;
}

interface CatLang {
  category: string;
  language: string;
  count: number;
}

interface LanguageSourceRow {
  language_source: string;
  count: number;
}

const LANGUAGE_SOURCE_LABELS: Record<string, string> = {
  github: "GitHub primary",
  inferred: "Inferred",
  manual: "Manual map",
  docs_meta: "Docs / Meta bucket",
  registry: "Registry default",
};

export default function LanguagesPage() {
  const db = getDb();

  // --- Language stats ---
  const langRows = db
    .prepare(
      `SELECT language, COUNT(*) as count,
              COALESCE(SUM(stars), 0) as total_stars,
              COALESCE(ROUND(AVG(stars)), 0) as avg_stars
       FROM projects
       WHERE language IS NOT NULL AND language != ''
       GROUP BY language
       ORDER BY count DESC`
    )
    .all() as LangRow[];

  const totalProjects = langRows.reduce((s, r) => s + r.count, 0);

  const sourceRows = db
    .prepare(
      `SELECT language_source, COUNT(*) as count
       FROM projects
       WHERE language_source IS NOT NULL AND language_source != ''
       GROUP BY language_source
       ORDER BY count DESC, language_source ASC`
    )
    .all() as LanguageSourceRow[];

  // --- Top 5 packages per language ---
  const topPkgsByLang: Record<string, TopPkg[]> = {};
  for (const row of langRows) {
    topPkgsByLang[row.language] = db
      .prepare(
        `SELECT name, COALESCE(stars, 0) as stars
         FROM projects
         WHERE language = ?
         ORDER BY stars DESC
         LIMIT 5`
      )
      .all(row.language) as TopPkg[];
  }

  // --- Category × Language heatmap ---
  const top8Langs = langRows.slice(0, 8).map((r) => r.language);

  const catLangRows = db
    .prepare(
      `SELECT category, language, COUNT(*) as count
       FROM projects
       WHERE language IS NOT NULL AND language != ''
         AND category IS NOT NULL AND category != ''
       GROUP BY category, language
       ORDER BY category, count DESC`
    )
    .all() as CatLang[];

  // Build matrix
  const categories = [
    ...new Set(catLangRows.map((r) => r.category)),
  ].sort();
  const heatmap: Record<string, Record<string, number>> = {};
  let maxHeat = 0;
  for (const cat of categories) {
    heatmap[cat] = {};
  }
  for (const row of catLangRows) {
    if (top8Langs.includes(row.language)) {
      heatmap[row.category] = heatmap[row.category] || {};
      heatmap[row.category][row.language] = row.count;
      if (row.count > maxHeat) maxHeat = row.count;
    }
  }

  // --- Trends: Rising Stars (high avg stars, few projects) ---
  const risingStars = langRows
    .filter((r) => r.count >= 1 && r.avg_stars > 0)
    .sort((a, b) => b.avg_stars - a.avg_stars)
    .slice(0, 5);

  // --- Ecosystem Dominance: Python vs TypeScript per category ---
  const domRows = db
    .prepare(
      `SELECT category, language, COUNT(*) as count
       FROM projects
       WHERE language IN ('Python', 'TypeScript')
         AND category IS NOT NULL AND category != ''
       GROUP BY category, language
       ORDER BY category`
    )
    .all() as CatLang[];

  const domCategories: Record<string, { Python: number; TypeScript: number }> = {};
  for (const row of domRows) {
    if (!domCategories[row.category]) {
      domCategories[row.category] = { Python: 0, TypeScript: 0 };
    }
    if (row.language === "Python" || row.language === "TypeScript") {
      domCategories[row.category][row.language as "Python" | "TypeScript"] = row.count;
    }
  }

  return (
    <div>
      {/* Page title */}
      <div className="border-b-2 border-fm-green pb-1 mb-2">
        <h1 className="text-[14px] font-bold text-fm-green">
          Language Ecosystem
        </h1>
        <p className="text-[10px] text-fm-text-light mt-0.5">
          A visual breakdown of programming languages across{" "}
          {totalProjects.toLocaleString()} packages.
        </p>
      </div>

      {/* Anchor nav */}
      <div className="bg-fm-sidebar-bg border border-fm-border px-3 py-1.5 mb-4 text-[11px]">
        <span className="font-bold text-fm-text">Jump to: </span>
        <Link href="#hero-bar" className="text-fm-link">overview</Link>
        {" | "}
        <Link href="#language-cards" className="text-fm-link">cards</Link>
        {" | "}
        <Link href="#heatmap" className="text-fm-link">heatmap</Link>
        {" | "}
        <Link href="#trends" className="text-fm-link">trends</Link>
      </div>

      {/* ========== HERO LANGUAGE BAR ========== */}
      <div id="hero-bar" className="scroll-mt-4">
        {/* Bar */}
        <div
          className="flex w-full overflow-hidden"
          style={{ height: 24, borderRadius: 6 }}
        >
          {langRows.map((row, i) => {
            const pct = (row.count / totalProjects) * 100;
            if (pct < 0.3) return null;
            const color = langColor(row.language);
            const textColor = isDarkText(row.language) ? "#1a1a1a" : "#fff";
            const isFirst = i === 0;
            const isLast =
              i === langRows.length - 1 ||
              langRows
                .slice(i + 1)
                .every((r) => (r.count / totalProjects) * 100 < 0.3);
            return (
              <div
                key={row.language}
                title={`${row.language}: ${row.count} (${pct.toFixed(1)}%)`}
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                  color: textColor,
                  borderTopLeftRadius: isFirst ? 6 : 0,
                  borderBottomLeftRadius: isFirst ? 6 : 0,
                  borderTopRightRadius: isLast ? 6 : 0,
                  borderBottomRightRadius: isLast ? 6 : 0,
                }}
                className="flex items-center justify-center text-[9px] font-bold overflow-hidden whitespace-nowrap"
              >
                {pct > 6 ? row.language : ""}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {langRows.map((row) => {
            const pct = (row.count / totalProjects) * 100;
            return (
              <div
                key={row.language}
                className="flex items-center gap-1 text-[10px] text-fm-text"
              >
                <span
                  className="inline-block rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: langColor(row.language),
                  }}
                />
                <span className="font-bold">{row.language}</span>
                <span className="text-fm-text-light">
                  {row.count} ({pct.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <SectionHeader id="source-audit" title="Language source audit" />
      <div className="bg-white border border-fm-border rounded p-3 mb-4">
        <p className="text-[10px] text-fm-text-light mb-2">
          Audit trail for where each language label came from.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {sourceRows.map((row) => (
            <div key={row.language_source} className="border border-fm-border rounded px-2 py-2 bg-fm-sidebar-bg/40">
              <div className="text-[10px] text-fm-text-light">{LANGUAGE_SOURCE_LABELS[row.language_source] || row.language_source}</div>
              <div className="text-[13px] font-bold text-fm-green">{row.count.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ========== LANGUAGE CARDS ========== */}
      <SectionHeader id="language-cards" title="Languages" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {langRows.map((row) => {
          const pct = (row.count / totalProjects) * 100;
          const top5 = topPkgsByLang[row.language] || [];
          return (
            <div
              key={row.language}
              className="bg-white border border-fm-border rounded p-3"
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-block rounded-full"
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: langColor(row.language),
                  }}
                />
                <span className="text-[13px] font-bold text-fm-text">
                  {row.language}
                </span>
              </div>

              {/* Stats */}
              <div className="text-[10px] text-fm-text-light mb-2 space-y-0.5">
                <div>
                  <span className="font-mono font-bold text-fm-text">
                    {row.count}
                  </span>{" "}
                  packages ({pct.toFixed(1)}%)
                </div>
                <div>
                  Total stars:{" "}
                  <span className="font-mono font-bold text-fm-text">
                    {formatStars(row.total_stars)}
                  </span>
                </div>
                <div>
                  Avg stars/pkg:{" "}
                  <span className="font-mono font-bold text-fm-text">
                    {formatStars(row.avg_stars)}
                  </span>
                </div>
              </div>

              {/* Top 5 */}
              {top5.length > 0 && (
                <div className="border-t border-fm-border pt-1.5">
                  <div className="text-[9px] font-bold text-fm-text-light uppercase mb-1">
                    Top packages
                  </div>
                  {top5.map((pkg) => (
                    <div
                      key={pkg.name}
                      className="flex items-center justify-between text-[10px]"
                    >
                      <Link
                        href={`/projects/${encodeURIComponent(pkg.name)}`}
                        className="text-fm-link truncate"
                      >
                        {pkg.name}
                      </Link>
                      <span className="text-fm-text-light font-mono ml-2 flex-shrink-0">
                        {formatStars(pkg.stars)}★
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========== CATEGORY × LANGUAGE HEATMAP ========== */}
      <SectionHeader id="heatmap" title="Category × Language Heatmap" />
      {categories.length === 0 || top8Langs.length === 0 ? (
        <p className="text-[11px] text-fm-text-light italic">
          Not enough data for a heatmap yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse text-[10px] w-full">
            <thead>
              <tr className="bg-fm-sidebar-bg">
                <th className="px-2 py-1 border border-fm-border text-left text-[10px]">
                  Category
                </th>
                {top8Langs.map((lang) => (
                  <th
                    key={lang}
                    className="px-2 py-1 border border-fm-border text-center text-[10px]"
                  >
                    <span
                      className="inline-block rounded-full mr-1 align-middle"
                      style={{
                        width: 6,
                        height: 6,
                        backgroundColor: langColor(lang),
                      }}
                    />
                    {lang}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, ci) => (
                <tr key={cat} className={ci % 2 === 0 ? "bg-white/50" : ""}>
                  <td className="px-2 py-1 border border-fm-border font-bold whitespace-nowrap">
                    {cat}
                  </td>
                  {top8Langs.map((lang) => {
                    const val = heatmap[cat]?.[lang] || 0;
                    const intensity =
                      maxHeat > 0
                        ? Math.round((val / maxHeat) * 255)
                        : 0;
                    const bg =
                      val === 0
                        ? "#f5f5f5"
                        : `rgb(${255 - intensity}, 255, ${255 - intensity})`;
                    return (
                      <td
                        key={lang}
                        className="px-2 py-1 border border-fm-border text-center font-mono"
                        style={{ backgroundColor: bg }}
                      >
                        {val > 0 ? val : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========== LANGUAGE TRENDS ========== */}
      <SectionHeader id="trends" title="Language Trends" />

      {/* Rising Stars */}
      <div className="mb-4">
        <h3 className="text-[12px] font-bold text-fm-text mb-1">
          🌟 Rising Stars
        </h3>
        <p className="text-[10px] text-fm-text-light mb-2">
          Languages with high average stars per project — niche but impactful.
        </p>
        {risingStars.length === 0 ? (
          <p className="text-[11px] text-fm-text-light italic">
            No data yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="border-collapse text-[10px] w-full max-w-[600px]">
              <thead>
                <tr className="bg-fm-sidebar-bg">
                  <th className="px-2 py-1 border border-fm-border text-left">
                    Language
                  </th>
                  <th className="px-2 py-1 border border-fm-border text-right">
                    Projects
                  </th>
                  <th className="px-2 py-1 border border-fm-border text-right">
                    Total Stars
                  </th>
                  <th className="px-2 py-1 border border-fm-border text-right">
                    Avg Stars/Pkg
                  </th>
                </tr>
              </thead>
              <tbody>
                {risingStars.map((row, i) => (
                  <tr
                    key={row.language}
                    className={i % 2 === 0 ? "bg-white/50" : ""}
                  >
                    <td className="px-2 py-1 border border-fm-border">
                      <span
                        className="inline-block rounded-full mr-1 align-middle"
                        style={{
                          width: 8,
                          height: 8,
                          backgroundColor: langColor(row.language),
                        }}
                      />
                      <span className="font-bold">{row.language}</span>
                    </td>
                    <td className="px-2 py-1 border border-fm-border text-right font-mono">
                      {row.count}
                    </td>
                    <td className="px-2 py-1 border border-fm-border text-right font-mono">
                      {formatStars(row.total_stars)}
                    </td>
                    <td className="px-2 py-1 border border-fm-border text-right font-mono font-bold">
                      {formatStars(row.avg_stars)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ecosystem Dominance */}
      <div className="mb-4">
        <h3 className="text-[12px] font-bold text-fm-text mb-1">
          🐍 vs 🔷 Ecosystem Dominance
        </h3>
        <p className="text-[10px] text-fm-text-light mb-2">
          Python vs TypeScript — which language wins each category?
        </p>
        {Object.keys(domCategories).length === 0 ? (
          <p className="text-[11px] text-fm-text-light italic">
            No Python or TypeScript packages yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="border-collapse text-[10px] w-full max-w-[600px]">
              <thead>
                <tr className="bg-fm-sidebar-bg">
                  <th className="px-2 py-1 border border-fm-border text-left">
                    Category
                  </th>
                  <th className="px-2 py-1 border border-fm-border text-center">
                    <span
                      className="inline-block rounded-full mr-1 align-middle"
                      style={{
                        width: 6,
                        height: 6,
                        backgroundColor: "#3572A5",
                      }}
                    />
                    Python
                  </th>
                  <th className="px-2 py-1 border border-fm-border text-center">
                    <span
                      className="inline-block rounded-full mr-1 align-middle"
                      style={{
                        width: 6,
                        height: 6,
                        backgroundColor: "#3178C6",
                      }}
                    />
                    TypeScript
                  </th>
                  <th className="px-2 py-1 border border-fm-border text-center">
                    Winner
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(domCategories)
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([cat, counts], i) => {
                    const winner =
                      counts.Python > counts.TypeScript
                        ? "🐍 Python"
                        : counts.TypeScript > counts.Python
                          ? "🔷 TypeScript"
                          : "🤝 Tie";
                    return (
                      <tr
                        key={cat}
                        className={i % 2 === 0 ? "bg-white/50" : ""}
                      >
                        <td className="px-2 py-1 border border-fm-border font-bold">
                          {cat}
                        </td>
                        <td className="px-2 py-1 border border-fm-border text-center font-mono">
                          {counts.Python || "—"}
                        </td>
                        <td className="px-2 py-1 border border-fm-border text-center font-mono">
                          {counts.TypeScript || "—"}
                        </td>
                        <td className="px-2 py-1 border border-fm-border text-center text-[9px] font-bold">
                          {winner}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* API hint */}
      <div className="mt-6 mb-4 text-[10px] text-fm-text-light border-t border-fm-border pt-2">
        🤖 Agents: Browse packages by language at{" "}
        <Link href="/browse" className="text-fm-link font-mono">
          /browse
        </Link>
      </div>
    </div>
  );
}
