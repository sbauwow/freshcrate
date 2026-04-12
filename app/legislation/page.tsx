import type { Metadata } from "next";
import {
  getGovernanceIssues,
  getLegislation,
  getLegislationFilterOptions,
  getLegislationSummary,
  type GovernanceStatus,
} from "@/lib/legislation";

export const metadata: Metadata = {
  title: "freshcrate legislation — Global AI governance tracker",
  description:
    "Track AI legislation, governance frameworks, and policy issues across regions. Built for agents and operators shipping globally.",
};

function prettyStatus(status: GovernanceStatus): string {
  switch (status) {
    case "in_force":
      return "In force";
    case "approved_not_effective":
      return "Approved, not effective";
    case "in_negotiation":
      return "In negotiation";
    case "proposed":
      return "Proposed";
    case "paused_or_blocked":
      return "Paused / blocked";
    default:
      return status;
  }
}

function statusPill(status: GovernanceStatus): string {
  if (status === "in_force") return "bg-green-100 text-green-800";
  if (status === "approved_not_effective") return "bg-blue-100 text-blue-800";
  if (status === "in_negotiation") return "bg-yellow-100 text-yellow-800";
  if (status === "proposed") return "bg-purple-100 text-purple-800";
  return "bg-gray-100 text-gray-800";
}

function severityPill(severity: "low" | "medium" | "high"): string {
  if (severity === "high") return "bg-red-100 text-red-800";
  if (severity === "medium") return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}

export default async function LegislationPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; status?: string; theme?: string }>;
}) {
  const params = await searchParams;
  const options = getLegislationFilterOptions();

  const region = typeof params.region === "string" && options.regions.includes(params.region) ? params.region : undefined;
  const status =
    typeof params.status === "string" &&
    options.statuses.includes(params.status as GovernanceStatus)
      ? (params.status as GovernanceStatus)
      : undefined;
  const theme = typeof params.theme === "string" && options.themes.includes(params.theme) ? params.theme : undefined;

  const laws = getLegislation({ region, status, theme });
  const issues = getGovernanceIssues(region);
  const summary = getLegislationSummary();

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b-2 border-fm-green pb-1">
        <h2 className="text-[14px] font-bold text-fm-green">AI Legislation & Governance</h2>
        <p className="text-[11px] text-fm-text-light mt-1">
          Snapshot tracker for AI laws, policy frameworks, and operational risk issues by region.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
        <div className="bg-fm-sidebar-bg border border-fm-border rounded px-2 py-2">
          <div className="text-fm-text-light">Tracked instruments</div>
          <div className="font-bold text-[13px]">{summary.total}</div>
        </div>
        <div className="bg-fm-sidebar-bg border border-fm-border rounded px-2 py-2">
          <div className="text-fm-text-light">In force</div>
          <div className="font-bold text-[13px]">{summary.inForce}</div>
        </div>
        <div className="bg-fm-sidebar-bg border border-fm-border rounded px-2 py-2">
          <div className="text-fm-text-light">Approved pending</div>
          <div className="font-bold text-[13px]">{summary.approvedPending}</div>
        </div>
        <div className="bg-fm-sidebar-bg border border-fm-border rounded px-2 py-2">
          <div className="text-fm-text-light">In negotiation / proposed</div>
          <div className="font-bold text-[13px]">{summary.negotiatedOrProposed}</div>
        </div>
      </div>

      <form method="GET" className="bg-fm-sidebar-bg border border-fm-border rounded px-2 py-2 text-[10px]">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-fm-text-light">Region</span>
            <select name="region" defaultValue={region ?? ""} className="border border-fm-border bg-white px-1 py-0.5 text-[10px]">
              <option value="">All regions</option>
              {options.regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-fm-text-light">Status</span>
            <select name="status" defaultValue={status ?? ""} className="border border-fm-border bg-white px-1 py-0.5 text-[10px]">
              <option value="">All statuses</option>
              {options.statuses.map((s) => (
                <option key={s} value={s}>{prettyStatus(s as GovernanceStatus)}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-fm-text-light">Theme</span>
            <select name="theme" defaultValue={theme ?? ""} className="border border-fm-border bg-white px-1 py-0.5 text-[10px]">
              <option value="">All themes</option>
              {options.themes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <button type="submit" className="border border-[#999] bg-[#dddddd] text-black px-2 py-0.5 font-bold hover:bg-[#cccccc]">
            Apply
          </button>
          <a href="/legislation" className="text-fm-link hover:text-fm-link-hover">Reset</a>
          <span className="ml-auto text-fm-text-light">Showing {laws.length} instruments</span>
        </div>
      </form>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Global legislation tracker
        </div>
        <div className="divide-y divide-fm-border/50">
          {laws.length === 0 && (
            <div className="p-3 text-[11px] text-fm-text-light italic">No entries match your filters.</div>
          )}
          {laws.map((item) => (
            <div key={item.id} className="p-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-bold text-[12px] text-fm-link">{item.jurisdiction}</span>
                <span className="text-fm-text-light">{item.instrument}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${statusPill(item.status)}`}>
                  {prettyStatus(item.status)}
                </span>
                <span className="text-[10px] text-fm-text-light">{item.region}</span>
                {item.effective_date && (
                  <span className="text-[10px] text-fm-text-light">effective {item.effective_date}</span>
                )}
              </div>

              <p className="text-fm-text mb-1">{item.summary}</p>

              <div className="flex flex-wrap gap-1 mb-1">
                {item.themes.map((themeTag) => (
                  <span key={themeTag} className="text-[9px] bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded">
                    {themeTag}
                  </span>
                ))}
              </div>

              <div className="text-[10px] text-fm-text-light mb-1">
                <span className="font-bold">Open issues:</span> {item.issues.join("; ")}
              </div>

              <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-fm-link hover:text-fm-link-hover">
                source ↗
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Governance issue watchlist
        </div>
        <div className="p-2 space-y-2">
          {issues.map((issue) => (
            <div key={issue.id} className="border border-fm-border rounded p-2 bg-fm-bg/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-[11px] text-fm-text">{issue.title}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${severityPill(issue.severity)}`}>
                  {issue.severity}
                </span>
                <span className="text-[10px] text-fm-text-light">{issue.scope}</span>
              </div>
              <p className="text-[10px] text-fm-text mb-1">{issue.why_it_matters}</p>
              <div className="text-[10px] text-fm-text-light mb-1">
                <span className="font-bold">Regions:</span> {issue.regions.join(", ")}
              </div>
              <ul className="list-disc ml-4 text-[10px] text-fm-text-light space-y-0.5">
                {issue.signals_to_watch.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
