import Link from "next/link";
import { getFullStats } from "@/lib/queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "freshcrate — Statistics",
  description: "Comprehensive statistics about the freshcrate package directory. Numbers, charts, and fun facts for humans and agents alike.",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const colors: Record<string, string> = {
    Low: "bg-fm-urgency-low",
    Medium: "bg-fm-urgency-medium",
    High: "bg-fm-urgency-high",
    Critical: "bg-fm-urgency-critical",
  };
  return (
    <span className={`${colors[urgency] || "bg-gray-500"} text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase`}>
      {urgency}
    </span>
  );
}

function SectionHeader({ id, title }: { id: string; title: string }) {
  return (
    <div id={id} className="border-b-2 border-fm-green mt-6 mb-2 pb-1 scroll-mt-4">
      <h2 className="text-[14px] font-bold text-fm-green">{title}</h2>
    </div>
  );
}

function PercentBar({ pct, color = "#5b8c5b" }: { pct: number; color?: string }) {
  return (
    <div className="inline-block w-[120px] h-[10px] bg-[#eee] border border-fm-border align-middle">
      <div style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color, height: "100%" }} />
    </div>
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export default function StatsPage() {
  const stats = getFullStats();
  const maxStars = stats.topByStars[0]?.stars || 1;

  return (
    <div>
      {/* Page title */}
      <div className="border-b-2 border-fm-green pb-1 mb-2">
        <h1 className="text-[14px] font-bold text-fm-green">freshcrate statistics</h1>
        <p className="text-[10px] text-fm-text-light mt-0.5">
          Numbers. Charts. Bragging rights. Updated live from the database.
        </p>
      </div>

      {/* Anchor nav */}
      <div className="bg-fm-sidebar-bg border border-fm-border px-3 py-1.5 mb-4 text-[11px]">
        <span className="font-bold text-fm-text">Jump to: </span>
        <Link href="#totals" className="text-fm-link">totals</Link>
        {" | "}
        <Link href="#most-starred" className="text-fm-link">most starred</Link>
        {" | "}
        <Link href="#most-vital" className="text-fm-link">most vital</Link>
        {" | "}
        <Link href="#best-verified" className="text-fm-link">best verified</Link>
        {" | "}
        <Link href="#license-breakdown" className="text-fm-link">license breakdown</Link>
        {" | "}
        <Link href="#language-breakdown" className="text-fm-link">language breakdown</Link>
        {" | "}
        <Link href="#hall-of-fame" className="text-fm-link">agent hall of fame</Link>
        {" | "}
        <Link href="#fun-facts" className="text-fm-link">fun facts</Link>
      </div>

      {/* ========== TOTALS ========== */}
      <SectionHeader id="totals" title="Totals" />
      <table className="border-collapse text-[11px] w-full max-w-[600px]">
        <tbody>
          {[
            ["Packages", formatNumber(stats.totals.packages)],
            ["Releases", formatNumber(stats.totals.releases)],
            ["Tags", formatNumber(stats.totals.tags)],
            ["Categories", formatNumber(stats.totals.categories)],
            ["Verified Packages", formatNumber(stats.totals.verified)],
            ["Total Stars", formatNumber(stats.totals.totalStars)],
            ["Total Forks", formatNumber(stats.totals.totalForks)],
            ["Languages", formatNumber(stats.totals.languages)],
            ["Avg Stars/Package", formatNumber(stats.totals.avgStars)],
            ["README Coverage", `${stats.totals.readmeCoverage}%`],
          ].map(([label, value], i) => (
            <tr key={label} className={i % 2 === 0 ? "bg-fm-sidebar-bg" : ""}>
              <td className="px-3 py-1 font-bold border border-fm-border w-[200px]">{label}</td>
              <td className="px-3 py-1 border border-fm-border text-right font-mono text-[12px]">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ========== TOP 20 BY STARS ========== */}
      <SectionHeader id="most-starred" title="Top 20 — Most Starred" />
      {stats.topByStars.length === 0 ? (
        <p className="text-[11px] text-fm-text-light italic">No star data available yet.</p>
      ) : (
        <table className="border-collapse text-[11px] w-full">
          <thead>
            <tr className="bg-fm-sidebar-bg">
              <th className="px-2 py-1 border border-fm-border text-left w-[30px]">#</th>
              <th className="px-2 py-1 border border-fm-border text-left">Package</th>
              <th className="px-2 py-1 border border-fm-border text-left w-[220px]">Stars</th>
              <th className="px-2 py-1 border border-fm-border text-left">Category</th>
              <th className="px-2 py-1 border border-fm-border text-left">Version</th>
              <th className="px-2 py-1 border border-fm-border text-left">Author</th>
            </tr>
          </thead>
          <tbody>
            {stats.topByStars.map((pkg, i) => {
              const pct = maxStars > 0 ? Math.round((pkg.stars / maxStars) * 100) : 0;
              return (
                <tr key={pkg.name} className={i % 2 === 0 ? "bg-white/50" : ""}>
                  <td className="px-2 py-1 border border-fm-border text-fm-text-light">{i + 1}</td>
                  <td className="px-2 py-1 border border-fm-border">
                    <Link href={`/projects/${encodeURIComponent(pkg.name)}`} className="text-fm-link font-bold">
                      {pkg.name}
                    </Link>
                  </td>
                  <td className="px-2 py-1 border border-fm-border">
                    <span className="font-mono mr-2">{formatNumber(pkg.stars)}</span>
                    <PercentBar pct={pct} />
                  </td>
                  <td className="px-2 py-1 border border-fm-border text-fm-text-light">{pkg.category}</td>
                  <td className="px-2 py-1 border border-fm-border font-mono">{pkg.version || "—"}</td>
                  <td className="px-2 py-1 border border-fm-border text-fm-text-light">{pkg.author}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ========== TOP 20 BY VITALITY ========== */}
      <SectionHeader id="most-vital" title="Top 20 — Most Vital (Last 30 Days)" />
      {stats.topByVitality.length === 0 ? (
        <p className="text-[11px] text-fm-text-light italic">No releases in the last 30 days. The crates are resting.</p>
      ) : (
        <table className="border-collapse text-[11px] w-full">
          <thead>
            <tr className="bg-fm-sidebar-bg">
              <th className="px-2 py-1 border border-fm-border text-left w-[30px]">#</th>
              <th className="px-2 py-1 border border-fm-border text-left">Package</th>
              <th className="px-2 py-1 border border-fm-border text-left">Version</th>
              <th className="px-2 py-1 border border-fm-border text-left">Urgency</th>
              <th className="px-2 py-1 border border-fm-border text-left">Released</th>
              <th className="px-2 py-1 border border-fm-border text-left">Time Ago</th>
              <th className="px-2 py-1 border border-fm-border text-left">Category</th>
            </tr>
          </thead>
          <tbody>
            {stats.topByVitality.map((pkg, i) => (
              <tr key={pkg.name} className={i % 2 === 0 ? "bg-white/50" : ""}>
                <td className="px-2 py-1 border border-fm-border text-fm-text-light">{i + 1}</td>
                <td className="px-2 py-1 border border-fm-border">
                  <Link href={`/projects/${encodeURIComponent(pkg.name)}`} className="text-fm-link font-bold">
                    {pkg.name}
                  </Link>
                </td>
                <td className="px-2 py-1 border border-fm-border font-mono">{pkg.version}</td>
                <td className="px-2 py-1 border border-fm-border">
                  <UrgencyBadge urgency={pkg.urgency} />
                </td>
                <td className="px-2 py-1 border border-fm-border text-fm-text-light">
                  {new Date(pkg.release_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-2 py-1 border border-fm-border text-fm-text-light">
                  {timeAgo(pkg.release_date)}
                </td>
                <td className="px-2 py-1 border border-fm-border text-fm-text-light">{pkg.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ========== TOP 20 BEST VERIFIED ========== */}
      <SectionHeader id="best-verified" title="Top 20 — Best Verified" />
      {stats.topVerified.length === 0 ? (
        <p className="text-[11px] text-fm-text-light italic">No verified packages yet. Trust no one.</p>
      ) : (
        <table className="border-collapse text-[11px] w-full">
          <thead>
            <tr className="bg-fm-sidebar-bg">
              <th className="px-2 py-1 border border-fm-border text-left w-[30px]">#</th>
              <th className="px-2 py-1 border border-fm-border text-left">Package</th>
              <th className="px-2 py-1 border border-fm-border text-left w-[80px]">Score</th>
              <th className="px-2 py-1 border border-fm-border text-left">Checks</th>
              <th className="px-2 py-1 border border-fm-border text-left">Category</th>
            </tr>
          </thead>
          <tbody>
            {stats.topVerified.map((pkg, i) => (
              <tr key={pkg.name} className={i % 2 === 0 ? "bg-white/50" : ""}>
                <td className="px-2 py-1 border border-fm-border text-fm-text-light">{i + 1}</td>
                <td className="px-2 py-1 border border-fm-border">
                  <Link href={`/projects/${encodeURIComponent(pkg.name)}`} className="text-fm-link font-bold">
                    {pkg.name}
                  </Link>
                </td>
                <td className="px-2 py-1 border border-fm-border font-mono font-bold">
                  {pkg.score}/100
                </td>
                <td className="px-2 py-1 border border-fm-border">
                  <span className="font-mono text-[10px]">
                    {Object.entries(pkg.checks).map(([key, val]) => (
                      <span key={key} title={key} className={`mr-1 ${val ? "text-fm-urgency-low" : "text-fm-urgency-critical"}`}>
                        {val ? "✓" : "✗"}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="px-2 py-1 border border-fm-border text-fm-text-light">{pkg.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ========== LICENSE BREAKDOWN ========== */}
      <SectionHeader id="license-breakdown" title="License Breakdown" />
      <table className="border-collapse text-[11px] w-full max-w-[600px]">
        <thead>
          <tr className="bg-fm-sidebar-bg">
            <th className="px-2 py-1 border border-fm-border text-left">License</th>
            <th className="px-2 py-1 border border-fm-border text-right w-[60px]">Count</th>
            <th className="px-2 py-1 border border-fm-border text-left w-[200px]">Share</th>
          </tr>
        </thead>
        <tbody>
          {stats.licenseBreakdown.map((row, i) => (
            <tr key={row.license} className={i % 2 === 0 ? "bg-white/50" : ""}>
              <td className="px-2 py-1 border border-fm-border font-bold">{row.license}</td>
              <td className="px-2 py-1 border border-fm-border text-right font-mono">{row.count}</td>
              <td className="px-2 py-1 border border-fm-border">
                <PercentBar pct={row.pct} color="#3366cc" />
                <span className="ml-2 text-fm-text-light">{row.pct}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ========== LANGUAGE BREAKDOWN ========== */}
      <SectionHeader id="language-breakdown" title="Language Breakdown" />
      {stats.languageBreakdown.length === 0 ? (
        <p className="text-[11px] text-fm-text-light italic">No language data available.</p>
      ) : (
        <table className="border-collapse text-[11px] w-full max-w-[600px]">
          <thead>
            <tr className="bg-fm-sidebar-bg">
              <th className="px-2 py-1 border border-fm-border text-left">Language</th>
              <th className="px-2 py-1 border border-fm-border text-right w-[60px]">Count</th>
              <th className="px-2 py-1 border border-fm-border text-left w-[200px]">Share</th>
            </tr>
          </thead>
          <tbody>
            {stats.languageBreakdown.map((row, i) => (
              <tr key={row.language} className={i % 2 === 0 ? "bg-white/50" : ""}>
                <td className="px-2 py-1 border border-fm-border font-bold">{row.language}</td>
                <td className="px-2 py-1 border border-fm-border text-right font-mono">{row.count}</td>
                <td className="px-2 py-1 border border-fm-border">
                  <PercentBar pct={row.pct} color="#c49000" />
                  <span className="ml-2 text-fm-text-light">{row.pct}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ========== AGENT HALL OF FAME ========== */}
      <SectionHeader id="hall-of-fame" title="🏆 Agent Hall of Fame" />
      <p className="text-[10px] text-fm-text-light mb-2 italic">
        Dubious achievements in open-source software. No agents were harmed in the making of these awards.
      </p>
      <table className="border-collapse text-[11px] w-full">
        <thead>
          <tr className="bg-fm-sidebar-bg">
            <th className="px-2 py-1 border border-fm-border text-left w-[200px]">Award</th>
            <th className="px-2 py-1 border border-fm-border text-left">Winner</th>
            <th className="px-2 py-1 border border-fm-border text-left">Stat</th>
            <th className="px-2 py-1 border border-fm-border text-left">Citation</th>
          </tr>
        </thead>
        <tbody>
          {stats.hallOfFame.longestReadme && (
            <tr className="bg-white/50">
              <td className="px-2 py-1 border border-fm-border font-bold">📜 Most Overachieving README</td>
              <td className="px-2 py-1 border border-fm-border">
                <Link href={`/projects/${encodeURIComponent(stats.hallOfFame.longestReadme.name)}`} className="text-fm-link font-bold">
                  {stats.hallOfFame.longestReadme.name}
                </Link>
              </td>
              <td className="px-2 py-1 border border-fm-border font-mono">{formatNumber(stats.hallOfFame.longestReadme.length)} chars</td>
              <td className="px-2 py-1 border border-fm-border text-fm-text-light italic">{`"War and Peace called — it wants its word count back."`}</td>
            </tr>
          )}
          {stats.hallOfFame.speedDemon && (
            <tr>
              <td className="px-2 py-1 border border-fm-border font-bold">⚡ Speed Demon</td>
              <td className="px-2 py-1 border border-fm-border">
                <Link href={`/projects/${encodeURIComponent(stats.hallOfFame.speedDemon.name)}`} className="text-fm-link font-bold">
                  {stats.hallOfFame.speedDemon.name}
                </Link>
              </td>
              <td className="px-2 py-1 border border-fm-border font-mono">{stats.hallOfFame.speedDemon.count} releases</td>
              <td className="px-2 py-1 border border-fm-border text-fm-text-light italic">{`"Ships faster than you can read the changelog."`}</td>
            </tr>
          )}
          {stats.hallOfFame.tagHoarder && (
            <tr className="bg-white/50">
              <td className="px-2 py-1 border border-fm-border font-bold">🏷️ Tag Hoarder</td>
              <td className="px-2 py-1 border border-fm-border">
                <Link href={`/projects/${encodeURIComponent(stats.hallOfFame.tagHoarder.name)}`} className="text-fm-link font-bold">
                  {stats.hallOfFame.tagHoarder.name}
                </Link>
              </td>
              <td className="px-2 py-1 border border-fm-border font-mono">{stats.hallOfFame.tagHoarder.count} tags</td>
              <td className="px-2 py-1 border border-fm-border text-fm-text-light italic">{`"SEO is a lifestyle, not a strategy."`}</td>
            </tr>
          )}
          {stats.hallOfFame.soloWarrior && (
            <tr>
              <td className="px-2 py-1 border border-fm-border font-bold">🐺 Solo Warrior</td>
              <td className="px-2 py-1 border border-fm-border">
                <Link href={`/projects/${encodeURIComponent(stats.hallOfFame.soloWarrior.name)}`} className="text-fm-link font-bold">
                  {stats.hallOfFame.soloWarrior.name}
                </Link>
              </td>
              <td className="px-2 py-1 border border-fm-border font-mono">
                {formatNumber(stats.hallOfFame.soloWarrior.stars)}★ / {formatNumber(stats.hallOfFame.soloWarrior.forks)}🍴 ({Math.round(stats.hallOfFame.soloWarrior.ratio)}:1)
              </td>
              <td className="px-2 py-1 border border-fm-border text-fm-text-light italic">{`"Everyone loves it. Nobody forks it. Respect."`}</td>
            </tr>
          )}
          {stats.hallOfFame.licenseRebel && (
            <tr className="bg-white/50">
              <td className="px-2 py-1 border border-fm-border font-bold">🏴‍☠️ License Rebel</td>
              <td className="px-2 py-1 border border-fm-border">
                <Link href={`/projects/${encodeURIComponent(stats.hallOfFame.licenseRebel.name)}`} className="text-fm-link font-bold">
                  {stats.hallOfFame.licenseRebel.name}
                </Link>
              </td>
              <td className="px-2 py-1 border border-fm-border font-mono">{formatNumber(stats.hallOfFame.licenseRebel.stars)}★, no license</td>
              <td className="px-2 py-1 border border-fm-border text-fm-text-light italic">{`"License? Where we're going, we don't need licenses."`}</td>
            </tr>
          )}
          {stats.hallOfFame.dinosaur && (
            <tr>
              <td className="px-2 py-1 border border-fm-border font-bold">🦕 The Dinosaur</td>
              <td className="px-2 py-1 border border-fm-border">
                <Link href={`/projects/${encodeURIComponent(stats.hallOfFame.dinosaur.name)}`} className="text-fm-link font-bold">
                  {stats.hallOfFame.dinosaur.name}
                </Link>
              </td>
              <td className="px-2 py-1 border border-fm-border font-mono">
                {new Date(stats.hallOfFame.dinosaur.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </td>
              <td className="px-2 py-1 border border-fm-border text-fm-text-light italic">{`"Was here before the AI hype. Will be here after."`}</td>
            </tr>
          )}
          {stats.hallOfFame.freshest && (
            <tr className="bg-white/50">
              <td className="px-2 py-1 border border-fm-border font-bold">🆕 Fresh Off The Press</td>
              <td className="px-2 py-1 border border-fm-border">
                <Link href={`/projects/${encodeURIComponent(stats.hallOfFame.freshest.name)}`} className="text-fm-link font-bold">
                  {stats.hallOfFame.freshest.name}
                </Link>
              </td>
              <td className="px-2 py-1 border border-fm-border font-mono">
                {timeAgo(stats.hallOfFame.freshest.created_at)}
              </td>
              <td className="px-2 py-1 border border-fm-border text-fm-text-light italic">{`"So new it still has that new-crate smell."`}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ========== FUN FACTS ========== */}
      <SectionHeader id="fun-facts" title="🎲 Fun Facts" />
      <div className="bg-fm-sidebar-bg border border-fm-border p-4 space-y-2 text-[11px]">
        <p>💰 If every star were a dollar, freshcrate would be worth <strong className="font-mono">${formatNumber(stats.funFacts.totalStarsDollars)}</strong>. Not bad for a side project.</p>
        <p>📏 The average package name is <strong className="font-mono">{stats.funFacts.avgNameLength}</strong> characters long. Terse, but expressive.</p>
        <p>✅ <strong className="font-mono">{stats.funFacts.verifiedPct}%</strong> of packages are verified. Trust, but verify.</p>
        <p>🖥️ MCP Servers outnumber actual servers in this building <strong className="font-mono">{stats.funFacts.mcpServerCount}</strong> to 1.</p>
        <p>📚 Total README text would fill <strong className="font-mono">{stats.funFacts.novelCount}</strong> novels (assuming 80,000 words each). Somebody call a publisher.</p>
        <p>🏷️ There are <strong className="font-mono">{stats.funFacts.uniqueTags}</strong> unique tags — that&apos;s <strong className="font-mono">{stats.funFacts.tagsPerPackage}</strong> tags per package.</p>
      </div>

      {/* API hint */}
      <div className="mt-6 mb-4 text-[10px] text-fm-text-light border-t border-fm-border pt-2">
        🤖 Agents: This data is available as JSON at{" "}
        <Link href="/api/stats" className="text-fm-link font-mono">/api/stats</Link>
      </div>
    </div>
  );
}
