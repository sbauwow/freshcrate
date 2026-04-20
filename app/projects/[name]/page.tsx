import Link from "next/link";
import { getProjectByName, getProjectReleases, getProjectWithReadme, getSimilarProjects } from "@/lib/queries";
import { getVerificationStatus } from "@/lib/verify";
import { getHealthStatus } from "@/lib/health";
import { getMCPManifest, MCP_LABELS } from "@/lib/mcp";
import { getDependencyAuditSummary } from "@/lib/deps";
import { sanitizeHtml } from "@/lib/sanitize";
import { notFound } from "next/navigation";
import DepGraph from "@/app/components/dep-graph";
import { parseProvenanceJson } from "@/lib/provenance";

export default async function ProjectPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const project = getProjectByName(name);
  if (!project) notFound();

  const releases = getProjectReleases(project.id);
  const enriched = getProjectWithReadme(name);
  const similar = getSimilarProjects(project.id, project.category, project.tags, 5);
  const verification = getVerificationStatus(project.id);
  const health = getHealthStatus(project.id);
  const mcp = getMCPManifest(project.id);
  const dependencySummary = getDependencyAuditSummary(project.id);
  const provenance = parseProvenanceJson(project.provenance_json);

  const urgencyColors: Record<string, string> = {
    Low: "text-fm-urgency-low",
    Medium: "text-fm-urgency-medium",
    High: "text-fm-urgency-high",
    Critical: "text-fm-urgency-critical",
  };
  const languageSourceLabel = {
    github: "GitHub primary",
    inferred: "Inferred",
    manual: "Manual map",
    docs_meta: "Docs / Meta bucket",
    registry: "Registry default",
  }[enriched?.language_source || project.language_source || ""];

  return (
    <div className="flex flex-col md:flex-row gap-5">
      <div className="flex-1 min-w-0">
        {/* Breadcrumb */}
        <div className="text-[10px] text-fm-text-light mb-3">
          <Link href="/" className="text-fm-link hover:text-fm-link-hover">Home</Link>
          {" > "}
          <Link href={`/browse?category=${encodeURIComponent(project.category)}`} className="text-fm-link hover:text-fm-link-hover">
            {project.category}
          </Link>
          {" > "}
          <span className="font-bold text-fm-text">{project.name}</span>
        </div>

        {/* Project header */}
        <div className="border-b-2 border-fm-green pb-3 mb-4">
          <h2 className="text-[18px] font-bold text-fm-green mb-1">{project.name}</h2>
          <p className="text-[12px] text-fm-text mb-2">{project.short_desc}</p>
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tag/${encodeURIComponent(tag)}`}
                className="text-[9px] bg-fm-green/10 text-fm-green px-1.5 py-0.5 rounded hover:bg-fm-green/20"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-[12px] font-bold text-fm-green mb-1">Description</h3>
          <p className="text-[11px] text-fm-text leading-relaxed">{project.description}</p>
        </div>

        {/* README */}
        {enriched?.readme_html && (
          <div className="mb-6">
            <h3 className="text-[12px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              README
            </h3>
            <div
              className="text-[11px] text-fm-text leading-relaxed prose prose-sm max-w-none overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(enriched.readme_html) }}
            />
          </div>
        )}

        {/* Release history */}
        <div>
          <h3 className="text-[12px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Release History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-fm-text-light border-b border-fm-border">
                  <th className="py-1 font-bold">Version</th>
                  <th className="py-1 font-bold">Changes</th>
                  <th className="py-1 font-bold">Urgency</th>
                  <th className="py-1 font-bold text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((r) => (
                  <tr key={r.id} className="border-b border-fm-border/30">
                    <td className="py-1.5 font-mono font-bold">{r.version}</td>
                    <td className="py-1.5">{r.changes}</td>
                    <td className={`py-1.5 font-bold ${urgencyColors[r.urgency] || ""}`}>{r.urgency}</td>
                    <td className="py-1.5 text-right text-fm-text-light">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dependencies & License Audit */}
        <div className="mt-6">
          <h3 className="text-[12px] font-bold text-fm-green border-b border-fm-border pb-1 mb-3">
            Dependencies &amp; License Audit
          </h3>
          <DepGraph projectName={project.name} />
        </div>

        {/* Similar packages */}
        {similar.length > 0 && (
          <div className="mt-6">
            <h3 className="text-[12px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              Similar Packages
            </h3>
            <div className="space-y-2">
              {similar.map((p) => (
                <div key={p.id} className="flex items-baseline gap-2 text-[11px]">
                  <Link href={`/projects/${p.name}`} className="font-bold text-fm-link hover:text-fm-link-hover">
                    {p.name}
                  </Link>
                  <span className="text-fm-text-light">{p.short_desc}</span>
                  <span className="text-fm-text-light font-mono ml-auto shrink-0">{p.latest_version}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar info */}
      <aside className="w-full md:w-[220px] md:shrink-0">
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Project Info
          </h3>
          <div className="space-y-2 text-[11px]">
            <div>
              <span className="text-fm-text-light block">Author:</span>
              <Link href={`/author/${encodeURIComponent(project.author)}`} className="font-bold text-fm-link hover:text-fm-link-hover">
                {project.author}
              </Link>
            </div>
            <div>
              <span className="text-fm-text-light block">License:</span>
              <span className="font-bold">{project.license}</span>
            </div>
            <div>
              <span className="text-fm-text-light block">Category:</span>
              <Link href={`/browse?category=${encodeURIComponent(project.category)}`} className="font-bold text-fm-link hover:text-fm-link-hover">
                {project.category}
              </Link>
            </div>
            <div>
              <span className="text-fm-text-light block">Source:</span>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="inline-block bg-fm-green/10 text-fm-green border border-fm-green/20 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
                  {project.source_type || "github"}
                </span>
                {project.source_package_id && (
                  <span className="font-mono text-[10px] text-fm-text-light">{project.source_package_id}</span>
                )}
              </div>
              {provenance?.confidence !== undefined && (
                <div className="text-[10px] text-fm-text-light mt-0.5">
                  Confidence: {Math.round(Number(provenance.confidence) * 100)}%
                </div>
              )}
            </div>
            <div>
              <span className="text-fm-text-light block">Latest:</span>
              <span className="font-mono font-bold">{project.latest_version}</span>
            </div>
            <div>
              <span className="text-fm-text-light block">Registered:</span>
              <span>{new Date(project.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* MCP compatibility matrix */}
        {mcp && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              MCP Compatibility
            </h3>
            <div className="space-y-2 text-[11px]">
              {[
                { key: "transports", label: "Transport", values: mcp.transports },
                { key: "auth", label: "Auth", values: mcp.auth },
                { key: "runtime", label: "Runtime", values: mcp.runtime },
                { key: "hosting", label: "Hosting", values: mcp.hosting },
              ].map((row) => (
                <div key={row.key}>
                  <span className="text-fm-text-light block mb-0.5">{row.label}:</span>
                  <div className="flex flex-wrap gap-1">
                    {row.values.length === 0 ? (
                      <span className="text-fm-text-light text-[10px]">—</span>
                    ) : (
                      row.values.map((v) => (
                        <span key={v} className="bg-fm-green/10 text-fm-green px-1.5 py-0.5 rounded text-[10px]">
                          {MCP_LABELS[v] || v}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
              <div className="text-fm-text-light text-[10px] pt-1 border-t border-fm-border/30">
                Detected from README ({new Date(mcp.detected_at).toLocaleDateString()})
              </div>
            </div>
          </div>
        )}

        {/* Health / trust score */}
        {health && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              Health Score
            </h3>
            <div className="space-y-2 text-[11px]">
              <div>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                  health.score >= 75
                    ? "bg-green-900/30 text-green-400 border-green-700/50"
                    : health.score >= 50
                    ? "bg-yellow-900/30 text-yellow-400 border-yellow-700/50"
                    : "bg-red-900/30 text-red-400 border-red-700/50"
                }`}>
                  {health.score}/100
                </span>
              </div>
              <div className="space-y-1">
                {health.factors.map((f) => (
                  <div key={f.name} title={f.explain} className="flex items-baseline justify-between gap-2">
                    <span className="text-fm-text-light">{f.label}</span>
                    <span className={`font-mono font-bold ${
                      !f.present ? "text-fm-text-light" :
                      f.score >= 75 ? "text-green-400" :
                      f.score >= 50 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {f.present ? f.score : "—"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-fm-text-light text-[10px] pt-1 border-t border-fm-border/30">
                Computed: {new Date(health.computed_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {/* Verification status */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Verification
          </h3>
          {verification ? (
            <div className="space-y-2 text-[11px]">
              <div>
                {verification.verified ? (
                  <span className="inline-block bg-green-900/30 text-green-400 border border-green-700/50 px-2 py-0.5 rounded text-[10px] font-bold">
                    ✓ Verified ({verification.score}/100)
                  </span>
                ) : (
                  <span className="inline-block bg-red-900/30 text-red-400 border border-red-700/50 px-2 py-0.5 rounded text-[10px] font-bold">
                    ✗ Failed ({verification.score}/100)
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {verification.checks.map((c) => (
                  <div key={c.check} className="flex items-center gap-1">
                    <span className={c.passed ? "text-green-400" : "text-red-400"}>
                      {c.passed ? "✓" : "✗"}
                    </span>
                    <span className="text-fm-text-light">{c.check}</span>
                  </div>
                ))}
              </div>
              {verification.verified_at && (
                <div className="text-fm-text-light text-[10px] pt-1 border-t border-fm-border/30">
                  Verified: {new Date(verification.verified_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-fm-text-light">Not yet verified</p>
          )}
        </div>

        {/* Dependency scan status */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Dependency Scan
          </h3>
          {dependencySummary ? (
            <div className="space-y-2 text-[11px]">
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-block bg-fm-green/10 text-fm-green border border-fm-green/20 px-2 py-0.5 rounded text-[10px] font-bold">
                  {dependencySummary.conflict_count} conflict{dependencySummary.conflict_count === 1 ? "" : "s"}
                </span>
                <span className="inline-block bg-yellow-100 text-yellow-800 border border-yellow-300 px-2 py-0.5 rounded text-[10px] font-bold">
                  {dependencySummary.unresolved} unresolved
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <div className="text-fm-text-light">Audit score</div>
                  <div className="font-bold">{dependencySummary.score}/100</div>
                </div>
                <div>
                  <div className="text-fm-text-light">Total deps</div>
                  <div className="font-bold">{dependencySummary.total_deps}</div>
                </div>
              </div>
              <div className="text-[10px] text-fm-text-light pt-1 border-t border-fm-border/30">
                Scanned: {dependencySummary.scanned_at ? new Date(dependencySummary.scanned_at).toLocaleDateString() : "—"}
              </div>
              <Link href="/dependencies#license-risk" className="text-[10px] font-bold text-fm-link hover:text-fm-link-hover">
                Open dependency risk map
              </Link>
            </div>
          ) : (
            <p className="text-[10px] text-fm-text-light">No dependency audit cached yet.</p>
          )}
        </div>

        {/* GitHub stats badges */}
        {enriched && (enriched.stars > 0 || enriched.forks > 0 || enriched.language) && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              GitHub Stats
            </h3>
            <div className="space-y-2 text-[11px]">
              {enriched.stars > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-fm-text-light">⭐</span>
                  <span className="font-bold">{enriched.stars.toLocaleString()}</span>
                  <span className="text-fm-text-light">stars</span>
                </div>
              )}
              {enriched.forks > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-fm-text-light">🍴</span>
                  <span className="font-bold">{enriched.forks.toLocaleString()}</span>
                  <span className="text-fm-text-light">forks</span>
                </div>
              )}
              {enriched.language && (
                <div className="flex items-center gap-1.5">
                  <span className="text-fm-text-light">🔤</span>
                  <span className="font-bold">{enriched.language}</span>
                  {languageSourceLabel && (
                    <span className="text-[10px] text-fm-text-light">Language source: {languageSourceLabel}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {(project.repo_url || project.homepage_url) && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              Links
            </h3>
            <div className="space-y-1 text-[11px]">
              {project.repo_url && (
                <div>
                  <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">
                    &#128193; Source Code &rarr;
                  </a>
                </div>
              )}
              {project.homepage_url && project.homepage_url !== project.repo_url && (
                <div>
                  <a href={project.homepage_url} target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">
                    &#127760; Homepage &rarr;
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
