import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/lib/db";

export const metadata: Metadata = {
  title: "freshcrate — Admin Dashboard",
  description: "Operational dashboard for moderation, analytics, and API key health.",
  robots: { index: false, follow: false },
};

type PendingPkg = {
  name: string;
  category: string;
  author: string;
  stars: number;
  created_at: string;
  verified: number;
};

type DailyRow = { day: string; submissions: number; requests: number };
type PathRow = { path: string; hits: number };
type ApiKeyRow = {
  id: number;
  name: string;
  key_prefix: string;
  requests_today: number;
  rate_limit: number;
  created_at: string;
  revoked_at: string | null;
};

function ago(ts: string): string {
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function AdminDashboardPage() {
  const db = getDb();

  const pendingPackages = (() => {
    try {
      return db
        .prepare(
          `SELECT name, category, author, COALESCE(stars, 0) as stars, created_at, COALESCE(verified, 0) as verified
           FROM projects
           WHERE COALESCE(verified, 0) = 0
           ORDER BY COALESCE(stars, 0) DESC, created_at DESC
           LIMIT 30`
        )
        .all() as PendingPkg[];
    } catch {
      return [] as PendingPkg[];
    }
  })();

  const daily = (() => {
    try {
      return db
        .prepare(
          `SELECT
             substr(created_at, 1, 10) as day,
             SUM(CASE WHEN method = 'POST' AND path = '/api/projects' THEN 1 ELSE 0 END) as submissions,
             COUNT(*) as requests
           FROM request_log
           WHERE created_at >= datetime('now', '-14 days')
           GROUP BY substr(created_at, 1, 10)
           ORDER BY day DESC`
        )
        .all() as DailyRow[];
    } catch {
      return [] as DailyRow[];
    }
  })();

  const topPaths = (() => {
    try {
      return db
        .prepare(
          `SELECT path, COUNT(*) as hits
           FROM request_log
           WHERE created_at >= datetime('now', '-7 days')
           GROUP BY path
           ORDER BY hits DESC
           LIMIT 20`
        )
        .all() as PathRow[];
    } catch {
      return [] as PathRow[];
    }
  })();

  const apiKeys = (() => {
    try {
      return db
        .prepare(
          `SELECT id, name, key_prefix, requests_today, rate_limit, created_at, revoked_at
           FROM api_keys
           ORDER BY created_at DESC
           LIMIT 30`
        )
        .all() as ApiKeyRow[];
    } catch {
      return [] as ApiKeyRow[];
    }
  })();

  const activeKeys = apiKeys.filter((k) => !k.revoked_at).length;
  const revokedKeys = apiKeys.filter((k) => !!k.revoked_at).length;

  return (
    <div className="space-y-5">
      <div className="border-b-2 border-fm-green pb-1">
        <h1 className="text-[14px] font-bold text-fm-green">Admin Dashboard</h1>
        <p className="text-[10px] text-fm-text-light mt-0.5">
          Moderation queue, API traffic, and key health. <Link className="text-fm-link" href="/stats">Deep stats →</Link>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3">
          <div className="text-fm-text-light">Unverified packages</div>
          <div className="text-[20px] font-bold mt-1">{pendingPackages.length}</div>
        </div>
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3">
          <div className="text-fm-text-light">Active API keys</div>
          <div className="text-[20px] font-bold mt-1">{activeKeys}</div>
        </div>
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3">
          <div className="text-fm-text-light">Revoked API keys</div>
          <div className="text-[20px] font-bold mt-1">{revokedKeys}</div>
        </div>
      </div>

      <section>
        <h2 className="text-[12px] font-bold border-b border-fm-border pb-1 mb-2">Moderation Queue (unverified)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-fm-sidebar-bg">
                <th className="text-left border border-fm-border px-2 py-1">Package</th>
                <th className="text-left border border-fm-border px-2 py-1">Category</th>
                <th className="text-left border border-fm-border px-2 py-1">Author</th>
                <th className="text-right border border-fm-border px-2 py-1">Stars</th>
                <th className="text-left border border-fm-border px-2 py-1">Created</th>
              </tr>
            </thead>
            <tbody>
              {pendingPackages.map((p, i) => (
                <tr key={p.name} className={i % 2 === 0 ? "bg-white/50" : ""}>
                  <td className="border border-fm-border px-2 py-1"><Link className="text-fm-link" href={`/projects/${encodeURIComponent(p.name)}`}>{p.name}</Link></td>
                  <td className="border border-fm-border px-2 py-1">{p.category}</td>
                  <td className="border border-fm-border px-2 py-1">{p.author}</td>
                  <td className="border border-fm-border px-2 py-1 text-right font-mono">{(p.stars || 0).toLocaleString()}</td>
                  <td className="border border-fm-border px-2 py-1 text-fm-text-light">{ago(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <h2 className="text-[12px] font-bold border-b border-fm-border pb-1 mb-2">Submission + Request Volume (14d)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-fm-sidebar-bg">
                  <th className="text-left border border-fm-border px-2 py-1">Day</th>
                  <th className="text-right border border-fm-border px-2 py-1">Submissions</th>
                  <th className="text-right border border-fm-border px-2 py-1">Requests</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d, i) => (
                  <tr key={d.day} className={i % 2 === 0 ? "bg-white/50" : ""}>
                    <td className="border border-fm-border px-2 py-1 font-mono">{d.day}</td>
                    <td className="border border-fm-border px-2 py-1 text-right">{d.submissions}</td>
                    <td className="border border-fm-border px-2 py-1 text-right">{d.requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-[12px] font-bold border-b border-fm-border pb-1 mb-2">Top API Paths (7d)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-fm-sidebar-bg">
                  <th className="text-left border border-fm-border px-2 py-1">Path</th>
                  <th className="text-right border border-fm-border px-2 py-1">Hits</th>
                </tr>
              </thead>
              <tbody>
                {topPaths.map((p, i) => (
                  <tr key={p.path} className={i % 2 === 0 ? "bg-white/50" : ""}>
                    <td className="border border-fm-border px-2 py-1 font-mono">{p.path}</td>
                    <td className="border border-fm-border px-2 py-1 text-right">{p.hits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[12px] font-bold border-b border-fm-border pb-1 mb-2">API Keys (management snapshot)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-fm-sidebar-bg">
                <th className="text-left border border-fm-border px-2 py-1">ID</th>
                <th className="text-left border border-fm-border px-2 py-1">Name</th>
                <th className="text-left border border-fm-border px-2 py-1">Prefix</th>
                <th className="text-right border border-fm-border px-2 py-1">Usage</th>
                <th className="text-left border border-fm-border px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((k, i) => (
                <tr key={k.id} className={i % 2 === 0 ? "bg-white/50" : ""}>
                  <td className="border border-fm-border px-2 py-1 font-mono">{k.id}</td>
                  <td className="border border-fm-border px-2 py-1">{k.name}</td>
                  <td className="border border-fm-border px-2 py-1 font-mono">{k.key_prefix}</td>
                  <td className="border border-fm-border px-2 py-1 text-right">{k.requests_today}/{k.rate_limit}</td>
                  <td className="border border-fm-border px-2 py-1">{k.revoked_at ? "REVOKED" : "ACTIVE"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
