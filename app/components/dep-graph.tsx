"use client";

import { useEffect, useState } from "react";

interface Dependency {
  dep_name: string;
  dep_version: string;
  dep_type: string;
  ecosystem: string;
  license: string | null;
  license_category: string | null;
}

interface LicenseConflict {
  dep_name: string;
  dep_license: string;
  reason: string;
  severity: "error" | "warning";
}

interface LicenseAudit {
  project_license: string;
  project_license_category: string;
  total_deps: number;
  resolved: number;
  unresolved: number;
  permissive: number;
  copyleft: number;
  weak_copyleft: number;
  unknown: number;
  conflicts: LicenseConflict[];
  warnings: string[];
  score: number;
  scanned_at: string;
}

interface DepsData {
  deps: Dependency[];
  audit: LicenseAudit | null;
}

const LICENSE_COLORS: Record<string, string> = {
  permissive: "bg-green-100 text-green-800",
  copyleft: "bg-yellow-100 text-yellow-800",
  weak_copyleft: "bg-blue-100 text-blue-800",
  unknown: "bg-gray-100 text-gray-600",
};

const TYPE_LABELS: Record<string, string> = {
  runtime: "prod",
  dev: "dev",
  peer: "peer",
  optional: "opt",
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-green-100 text-green-800 border-green-300" :
    score >= 50 ? "bg-yellow-100 text-yellow-800 border-yellow-300" :
    "bg-red-100 text-red-800 border-red-300";

  return (
    <span className={`${color} border text-[11px] font-bold px-2 py-0.5 rounded`}>
      {score}/100
    </span>
  );
}

export default function DepGraph({ projectName }: { projectName: string }) {
  const [data, setData] = useState<DepsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch(`/api/projects/${encodeURIComponent(projectName)}/deps`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectName]);

  async function handleScan() {
    setScanning(true);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/deps`, {
        method: "POST",
      });
      if (res.ok) {
        const result = await res.json();
        setData({ deps: result.deps, audit: result.audit });
      }
    } catch {}
    setScanning(false);
  }

  if (loading) {
    return (
      <div className="border border-fm-border rounded p-4">
        <div className="text-[11px] text-fm-text-light animate-pulse">Loading dependencies...</div>
      </div>
    );
  }

  const deps = data?.deps || [];
  const audit = data?.audit;
  const hasDeps = deps.length > 0;

  const filteredDeps = filter === "all"
    ? deps
    : filter === "conflicts"
    ? deps.filter((d) => audit?.conflicts.some((c) => c.dep_name === d.dep_name))
    : deps.filter((d) => d.dep_type === filter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-fm-green">
          Dependencies {hasDeps && <span className="text-fm-text-light font-normal">({deps.length})</span>}
        </h3>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="text-[10px] bg-fm-green text-white px-3 py-1 rounded hover:bg-fm-green-light cursor-pointer disabled:opacity-50"
        >
          {scanning ? "Scanning..." : hasDeps ? "Rescan" : "Scan Dependencies"}
        </button>
      </div>

      {/* License Audit Summary */}
      {audit && (
        <div className="border border-fm-border rounded p-3 bg-fm-sidebar-bg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-fm-text">License Audit</span>
            <ScoreBadge score={audit.score} />
          </div>

          {/* Counts bar */}
          <div className="flex gap-3 text-[10px] mb-2">
            <span className="text-green-700">{audit.permissive} permissive</span>
            <span className="text-yellow-700">{audit.copyleft} copyleft</span>
            <span className="text-blue-700">{audit.weak_copyleft} weak copyleft</span>
            <span className="text-gray-500">{audit.unknown} unknown</span>
          </div>

          {/* Visual bar */}
          {audit.total_deps > 0 && (
            <div className="flex h-2 rounded overflow-hidden mb-2">
              {audit.permissive > 0 && (
                <div className="bg-green-400" style={{ width: `${(audit.permissive / audit.total_deps) * 100}%` }} />
              )}
              {audit.weak_copyleft > 0 && (
                <div className="bg-blue-400" style={{ width: `${(audit.weak_copyleft / audit.total_deps) * 100}%` }} />
              )}
              {audit.copyleft > 0 && (
                <div className="bg-yellow-400" style={{ width: `${(audit.copyleft / audit.total_deps) * 100}%` }} />
              )}
              {audit.unknown > 0 && (
                <div className="bg-gray-300" style={{ width: `${(audit.unknown / audit.total_deps) * 100}%` }} />
              )}
            </div>
          )}

          {/* Conflicts */}
          {audit.conflicts.length > 0 && (
            <div className="mt-2 space-y-1">
              {audit.conflicts.map((c, i) => (
                <div
                  key={i}
                  className={`text-[10px] px-2 py-1 rounded ${
                    c.severity === "error"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                  }`}
                >
                  <span className="font-bold">{c.dep_name}</span> ({c.dep_license}): {c.reason}
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {audit.warnings.length > 0 && (
            <details className="mt-2">
              <summary className="text-[10px] text-fm-text-light cursor-pointer">
                {audit.warnings.length} warning{audit.warnings.length > 1 ? "s" : ""}
              </summary>
              <ul className="mt-1 space-y-0.5">
                {audit.warnings.map((w, i) => (
                  <li key={i} className="text-[10px] text-yellow-700">{w}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="text-[9px] text-fm-text-light mt-2">
            Scanned {new Date(audit.scanned_at).toLocaleDateString()}
            {" "}&middot; {audit.resolved}/{audit.total_deps} licenses resolved
          </div>
        </div>
      )}

      {/* Dep list */}
      {hasDeps && (
        <>
          {/* Filters */}
          <div className="flex gap-1 text-[10px]">
            {["all", "runtime", "dev", "conflicts"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  filter === f
                    ? "bg-fm-green text-white"
                    : "bg-gray-100 text-fm-text-light hover:bg-gray-200"
                }`}
              >
                {f === "all" ? `all (${deps.length})` :
                 f === "conflicts" ? `conflicts (${audit?.conflicts.length || 0})` :
                 `${f} (${deps.filter((d) => d.dep_type === f).length})`}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="border border-fm-border rounded overflow-hidden">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-fm-sidebar-bg text-fm-text-light">
                  <th className="text-left px-2 py-1 font-bold">Package</th>
                  <th className="text-left px-2 py-1 font-bold">Version</th>
                  <th className="text-left px-2 py-1 font-bold">Type</th>
                  <th className="text-left px-2 py-1 font-bold">License</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeps.map((dep, i) => {
                  const hasConflict = audit?.conflicts.some((c) => c.dep_name === dep.dep_name);
                  return (
                    <tr
                      key={i}
                      className={`border-t border-fm-border/50 ${
                        hasConflict ? "bg-red-50" : i % 2 === 0 ? "bg-white/50" : ""
                      }`}
                    >
                      <td className="px-2 py-1 font-mono">
                        {hasConflict && <span className="text-red-500 mr-1">!</span>}
                        {dep.dep_name}
                      </td>
                      <td className="px-2 py-1 font-mono text-fm-text-light">{dep.dep_version}</td>
                      <td className="px-2 py-1">
                        <span className="bg-gray-100 px-1 rounded text-[9px]">
                          {TYPE_LABELS[dep.dep_type] || dep.dep_type}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        {dep.license ? (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                            LICENSE_COLORS[dep.license_category || "unknown"]
                          }`}>
                            {dep.license}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">unresolved</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!hasDeps && !scanning && (
        <p className="text-[10px] text-fm-text-light">
          No dependencies scanned yet. Click &ldquo;Scan Dependencies&rdquo; to analyze this package&apos;s dependency tree and check for license conflicts.
        </p>
      )}
    </div>
  );
}
