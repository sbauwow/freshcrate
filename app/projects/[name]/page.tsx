import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import ShareLinks from "@/app/components/share-links";
import RankExplanation from "@/app/components/rank-explanation";
import AgentInstallCard from "@/app/components/agent-install-card";
import { cleanAuthor } from "@/lib/author-slug";
import { classifyLicense } from "@/lib/license";
import { getProjectByName, getProjectReleases, getProjectWithReadme, getSimilarProjects, getProjectsByAuthor, getProjectsByCategory } from "@/lib/queries";
import { getVerificationStatus } from "@/lib/verify";
import { getHealthStatus } from "@/lib/health";
import { getMCPManifest, MCP_LABELS } from "@/lib/mcp";
import { getDependencyAuditSummary } from "@/lib/deps";
import { sanitizeHtml } from "@/lib/sanitize";
import { resolveReadmeLinks } from "@/lib/readme-links";
import { getCopy, LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import DepGraph from "@/app/components/dep-graph";
import TrackedLink from "@/app/components/tracked-link";
import { parseProvenanceJson } from "@/lib/provenance";
import { buildAgentInstallInfo } from "@/lib/agent-install";

function hostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url.slice(0, 60); }
}

const appearsInGuidesByProject: Record<string, Array<{ href: string; title: string; blurb: string }>> = {
  "everything-claude-code": [
    { href: "/learn/best-mcp-servers-for-claude-code", title: "Best MCP Servers for Claude Code", blurb: "Featured as a top Claude-oriented MCP stack." },
  ],
  "chrome-devtools-mcp": [
    { href: "/learn/best-mcp-servers-for-claude-code", title: "Best MCP Servers for Claude Code", blurb: "Highlighted for live browser debugging inside Claude Code workflows." },
    { href: "/learn/best-browser-automation-tools-for-ai-agents", title: "Best Browser Automation Tools for AI Agents", blurb: "Featured for real browser inspection and debugging." },
  ],
  "playwright-mcp": [
    { href: "/learn/best-mcp-servers-for-claude-code", title: "Best MCP Servers for Claude Code", blurb: "Featured for deterministic browser automation." },
    { href: "/learn/best-browser-automation-tools-for-ai-agents", title: "Best Browser Automation Tools for AI Agents", blurb: "Featured for repeatable QA and browser runbooks." },
  ],
  fastmcp: [
    { href: "/learn/best-mcp-servers-for-claude-code", title: "Best MCP Servers for Claude Code", blurb: "Featured for building custom MCP servers quickly." },
  ],
  "mcp-toolbox": [
    { href: "/learn/best-mcp-servers-for-claude-code", title: "Best MCP Servers for Claude Code", blurb: "Featured for broad operational tool access." },
  ],
  langgraph: [
    { href: "/learn/best-open-source-ai-agent-frameworks", title: "Best Open Source AI Agent Frameworks", blurb: "Featured as a top framework pick." },
    { href: "/compare/langgraph-vs-crewai-vs-autogen", title: "LangGraph vs CrewAI vs AutoGen", blurb: "Included in the direct framework comparison." },
  ],
  crewAI: [
    { href: "/learn/best-open-source-ai-agent-frameworks", title: "Best Open Source AI Agent Frameworks", blurb: "Featured as a top framework pick." },
    { href: "/compare/langgraph-vs-crewai-vs-autogen", title: "LangGraph vs CrewAI vs AutoGen", blurb: "Included in the direct framework comparison." },
  ],
  autogen: [
    { href: "/compare/langgraph-vs-crewai-vs-autogen", title: "LangGraph vs CrewAI vs AutoGen", blurb: "Included in the direct framework comparison." },
  ],
  "hermes-agent": [
    { href: "/learn/best-coding-agents", title: "Best Coding Agents and AI Dev Assistants", blurb: "Featured for terminal-first operator workflows." },
  ],
  continue: [
    { href: "/learn/best-coding-agents", title: "Best Coding Agents and AI Dev Assistants", blurb: "Featured for editor-native coding workflows." },
  ],
  tabby: [
    { href: "/learn/best-coding-agents", title: "Best Coding Agents and AI Dev Assistants", blurb: "Featured for local-first coding assistance." },
  ],
  sweep: [
    { href: "/learn/best-coding-agents", title: "Best Coding Agents and AI Dev Assistants", blurb: "Featured for repo automation and code review workflows." },
  ],
  stagehand: [
    { href: "/learn/best-browser-automation-tools-for-ai-agents", title: "Best Browser Automation Tools for AI Agents", blurb: "Featured as a browser agent SDK choice." },
  ],
  opentabs: [
    { href: "/learn/best-browser-automation-tools-for-ai-agents", title: "Best Browser Automation Tools for AI Agents", blurb: "Featured for API-first browser escape hatches." },
  ],
  ragflow: [
    { href: "/learn/best-rag-memory-tools-for-agents", title: "Best RAG and Memory Tools for Agents", blurb: "Featured as a top retrieval stack." },
  ],
  mem0: [
    { href: "/learn/best-rag-memory-tools-for-agents", title: "Best RAG and Memory Tools for Agents", blurb: "Featured for persistent agent memory." },
  ],
  vllm: [
    { href: "/learn/best-rag-memory-tools-for-agents", title: "Best RAG and Memory Tools for Agents", blurb: "Featured for serving retrieval-heavy systems." },
  ],
  "vector-graph-rag": [
    { href: "/learn/best-rag-memory-tools-for-agents", title: "Best RAG and Memory Tools for Agents", blurb: "Featured for GraphRAG-style retrieval exploration." },
  ],
  langfuse: [
    { href: "/learn/best-ai-agent-observability-tools", title: "Best AI Agent Observability Tools", blurb: "Featured as a broad observability stack." },
  ],
  mlflow: [
    { href: "/learn/best-ai-agent-observability-tools", title: "Best AI Agent Observability Tools", blurb: "Featured for eval-heavy production loops." },
  ],
  phoenix: [
    { href: "/learn/best-ai-agent-observability-tools", title: "Best AI Agent Observability Tools", blurb: "Featured for tracing and diagnosis." },
  ],
  agentops: [
    { href: "/learn/best-ai-agent-observability-tools", title: "Best AI Agent Observability Tools", blurb: "Featured for coding-agent feedback loops." },
  ],
};

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const project = getProjectByName(name);
  if (!project) {
    // Hallucinated / mistyped crate names (logs showed 2,100+ distinct ones,
    // e.g. /projects/sandboxed.sh 678x). Keep them out of the search index so
    // crawlers stop treating phantom URLs as real, indexable pages.
    return { title: "Crate not found — freshcrate", robots: { index: false, follow: true } };
  }
  const mdUrl = `/projects/${encodeURIComponent(project.name)}.md`;
  return {
    title: `${project.name} — freshcrate`,
    description: project.short_desc || project.description?.slice(0, 160),
    alternates: {
      canonical: `/projects/${encodeURIComponent(project.name)}`,
      types: { "text/markdown": mdUrl },
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const t = getCopy(locale).projectPage;
  const project = getProjectByName(name);
  if (!project) notFound();

  const releases = getProjectReleases(project.id);
  const enriched = getProjectWithReadme(name);
  const similar = getSimilarProjects(project.id, project.category, project.tags, 5);
  const sameAuthor = getProjectsByAuthor(cleanAuthor(project.author))
    .filter((p) => p.id !== project.id)
    .slice(0, 4);
  const sameCategory = getProjectsByCategory(project.category)
    .filter((p) => p.id !== project.id)
    .slice(0, 4);
  const verification = getVerificationStatus(project.id);
  const health = getHealthStatus(project.id);
  const mcp = getMCPManifest(project.id);
  const dependencySummary = getDependencyAuditSummary(project.id);
  const provenance = parseProvenanceJson(project.provenance_json);
  const agentInstall = buildAgentInstallInfo(project, mcp, verification);
  const appearsInGuides = appearsInGuidesByProject[project.name] ?? [];

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
          <Link href="/" className="text-fm-link hover:text-fm-link-hover">{t.home}</Link>
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
          <RankExplanation breakdown={project.rank_breakdown} className="mt-2" />
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-[12px] font-bold text-fm-green mb-1">{t.descriptionHeading}</h3>
          <p className="text-[11px] text-fm-text leading-relaxed">{project.description}</p>
        </div>

        {appearsInGuides.length > 0 && (
          <div className="mb-6 border border-fm-border rounded p-3 bg-fm-sidebar-bg">
            <h3 className="text-[12px] font-bold text-fm-green mb-2">Appears in guides</h3>
            <div className="space-y-2">
              {appearsInGuides.map((guide) => (
                <TrackedLink
                  key={guide.href}
                  event="related_click"
                  eventTarget={`guide:${project.name}->${guide.href}`}
                  href={guide.href}
                  className="block rounded border border-fm-border bg-white/70 p-2 hover:bg-white"
                >
                  <div className="text-[11px] font-bold text-fm-link">{guide.title}</div>
                  <p className="mt-1 text-[10px] text-fm-text-light leading-relaxed">{guide.blurb}</p>
                </TrackedLink>
              ))}
            </div>
          </div>
        )}

        {/* README */}
        {enriched?.readme_html && (
          <div className="mb-6">
            <h3 className="text-[12px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              README
            </h3>
            <div
              className="text-[11px] text-fm-text leading-relaxed prose prose-sm max-w-none overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(resolveReadmeLinks(enriched.readme_html, project.repo_url, project.homepage_url)) }}
            />
          </div>
        )}

        {/* Release history */}
        <div>
          <h3 className="text-[12px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            {t.releaseHistory}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-fm-text-light border-b border-fm-border">
                  <th className="py-1 font-bold">{t.version}</th>
                  <th className="py-1 font-bold">{t.changes}</th>
                  <th className="py-1 font-bold">{t.urgency}</th>
                  <th className="py-1 font-bold text-right">{t.date}</th>
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
            {t.dependencyAudit}
          </h3>
          <DepGraph projectName={project.name} />
        </div>

        {/* Similar packages */}
        {similar.length > 0 && (
          <div className="mt-6">
            <h3 className="text-[12px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              {t.similarPackages}
            </h3>
            <div className="space-y-2">
              {similar.map((p) => (
                <div key={p.id} className="flex items-baseline gap-2 text-[11px]">
                  <TrackedLink
                    event="related_click"
                    eventTarget={`similar:${project.name}->${p.name}`}
                    href={`/projects/${encodeURIComponent(p.name)}`}
                    className="font-bold text-fm-link hover:text-fm-link-hover"
                  >
                    {p.name}
                  </TrackedLink>
                  <span className="text-fm-text-light">{p.short_desc}</span>
                  <span className="text-fm-text-light font-mono ml-auto shrink-0">{p.latest_version}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sameAuthor.length > 0 && (
          <div className="mt-6">
            <h3 className="text-[12px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              {t.moreFrom} {cleanAuthor(project.author)}
            </h3>
            <div className="space-y-2">
              {sameAuthor.map((p) => (
                <div key={p.id} className="flex items-baseline gap-2 text-[11px]">
                  <TrackedLink
                    event="related_click"
                    eventTarget={`author:${project.name}->${p.name}`}
                    href={`/projects/${encodeURIComponent(p.name)}`}
                    className="font-bold text-fm-link hover:text-fm-link-hover"
                  >
                    {p.name}
                  </TrackedLink>
                  <span className="text-fm-text-light">{p.short_desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sameCategory.length > 0 && (
          <div className="mt-6">
            <h3 className="text-[12px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              {t.moreIn} {project.category}
            </h3>
            <div className="space-y-2">
              {sameCategory.map((p) => (
                <div key={p.id} className="flex items-baseline gap-2 text-[11px]">
                  <TrackedLink
                    event="related_click"
                    eventTarget={`category:${project.name}->${p.name}`}
                    href={`/projects/${encodeURIComponent(p.name)}`}
                    className="font-bold text-fm-link hover:text-fm-link-hover"
                  >
                    {p.name}
                  </TrackedLink>
                  <span className="text-fm-text-light">{p.short_desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar info */}
      <aside className="w-full md:w-[220px] md:shrink-0 xl:w-[260px] 2xl:w-[300px]">
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            {t.projectInfo}
          </h3>
          <div className="space-y-2 text-[11px]">
            <div>
              <span className="text-fm-text-light block">{t.author}:</span>
              <Link href={`/author/${encodeURIComponent(cleanAuthor(project.author))}`} className="font-bold text-fm-link hover:text-fm-link-hover">
                {cleanAuthor(project.author)}
              </Link>
            </div>
            <div id="license">
              <span className="text-fm-text-light block">{t.license}:</span>
              {(() => {
                const info = classifyLicense(project.license);
                if (info.isNonStandard) {
                  return (
                    <>
                      <span className="font-bold">{t.nonStandard}</span>
                      <details className="mt-1">
                        <summary className="text-[10px] text-fm-link hover:text-fm-link-hover cursor-pointer">{t.viewDeclaredLicense}</summary>
                        <pre className="mt-1 max-h-[240px] overflow-auto whitespace-pre-wrap text-[10px] text-fm-text-light bg-fm-bg border border-fm-border rounded p-2 font-mono">{info.raw}</pre>
                      </details>
                    </>
                  );
                }
                return <span className="font-bold">{info.display}</span>;
              })()}
            </div>
            <div>
              <span className="text-fm-text-light block">{t.category}:</span>
              <Link href={`/browse?category=${encodeURIComponent(project.category)}`} className="font-bold text-fm-link hover:text-fm-link-hover">
                {project.category}
              </Link>
            </div>
            <div>
              <span className="text-fm-text-light block">{t.source}:</span>
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
                  {t.confidence}: {Math.round(Number(provenance.confidence) * 100)}%
                </div>
              )}
            </div>
            <div>
              <span className="text-fm-text-light block">{t.latest}:</span>
              <span className="font-mono font-bold">{project.latest_version}</span>
            </div>
            <div>
              <span className="text-fm-text-light block">{t.registered}:</span>
              <span>{new Date(project.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <AgentInstallCard
          info={agentInstall}
          labels={{
            title: t.agentInstallCard,
            installCommand: t.installCommand,
            agentConfig: t.agentConfig,
            runtimeRequirements: t.runtimeRequirements,
            authEnv: t.authEnv,
            authUnknown: t.authUnknown,
            verifiedDate: t.verifiedDate,
            source: t.source,
            noAgentConfig: t.noAgentConfig,
            copy: t.copy,
            copied: t.copied,
          }}
        />

        {/* MCP compatibility matrix */}
        {mcp && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              {t.mcpCompatibility}
            </h3>
            <div className="space-y-2 text-[11px]">
              {[
                { key: "transports", label: t.transport, values: mcp.transports },
                { key: "auth", label: t.auth, values: mcp.auth },
                { key: "runtime", label: t.runtime, values: mcp.runtime },
                { key: "hosting", label: t.hosting, values: mcp.hosting },
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
                {t.detectedFromReadme} ({new Date(mcp.detected_at).toLocaleDateString()})
              </div>
            </div>
          </div>
        )}

        {/* Health / trust score */}
        {health && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              {t.healthScore}
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
                {t.computed}: {new Date(health.computed_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {/* Verification status */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            {t.verification}
          </h3>
          {verification ? (
            <div className="space-y-2 text-[11px]">
              <div>
                {verification.verified ? (
                  <span className="inline-block bg-green-900/30 text-green-400 border border-green-700/50 px-2 py-0.5 rounded text-[10px] font-bold">
                    ✓ {t.verified} ({verification.score}/100)
                  </span>
                ) : (
                  <span className="inline-block bg-red-900/30 text-red-400 border border-red-700/50 px-2 py-0.5 rounded text-[10px] font-bold">
                    ✗ {t.failed} ({verification.score}/100)
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
                  {t.verifiedAt}: {new Date(verification.verified_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-fm-text-light">{t.notYetVerified}</p>
          )}
        </div>

        {/* Dependency scan status */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            {t.dependencyScan}
          </h3>
          {dependencySummary ? (
            <div className="space-y-2 text-[11px]">
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-block bg-fm-green/10 text-fm-green border border-fm-green/20 px-2 py-0.5 rounded text-[10px] font-bold">
                  {dependencySummary.conflict_count} {dependencySummary.conflict_count === 1 ? t.conflict : t.conflicts}
                </span>
                <span className="inline-block bg-yellow-100 text-yellow-800 border border-yellow-300 px-2 py-0.5 rounded text-[10px] font-bold">
                  {dependencySummary.unresolved} {t.unresolved}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <div className="text-fm-text-light">{t.auditScore}</div>
                  <div className="font-bold">{dependencySummary.score}/100</div>
                </div>
                <div>
                  <div className="text-fm-text-light">{t.totalDeps}</div>
                  <div className="font-bold">{dependencySummary.total_deps}</div>
                </div>
              </div>
              <div className="text-[10px] text-fm-text-light pt-1 border-t border-fm-border/30">
                {t.scanned}: {dependencySummary.scanned_at ? new Date(dependencySummary.scanned_at).toLocaleDateString() : "—"}
              </div>
              <Link href="/dependencies#license-risk" className="text-[10px] font-bold text-fm-link hover:text-fm-link-hover">
                {t.openDependencyRiskMap}
              </Link>
            </div>
          ) : (
            <p className="text-[10px] text-fm-text-light">{t.noDependencyAudit}</p>
          )}
        </div>

        {/* GitHub stats badges */}
        {enriched && (enriched.stars > 0 || enriched.forks > 0 || enriched.language) && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              {t.githubStats}
            </h3>
            <div className="space-y-2 text-[11px]">
              {enriched.stars > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-fm-text-light">⭐</span>
                  <span className="font-bold">{enriched.stars.toLocaleString()}</span>
                  <span className="text-fm-text-light">{t.stars}</span>
                </div>
              )}
              {enriched.forks > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-fm-text-light">🍴</span>
                  <span className="font-bold">{enriched.forks.toLocaleString()}</span>
                  <span className="text-fm-text-light">{t.forks}</span>
                </div>
              )}
              {enriched.language && (
                <div className="flex items-center gap-1.5">
                  <span className="text-fm-text-light">🔤</span>
                  <span className="font-bold">{enriched.language}</span>
                  {languageSourceLabel && (
                    <span className="text-[10px] text-fm-text-light">{t.languageSource}: {languageSourceLabel}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {(project.repo_url || project.homepage_url) && (
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
            <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
              {t.links}
            </h3>
            <div className="space-y-1 text-[11px]">
              {project.repo_url && (
                <div>
                  <TrackedLink
                    event="outbound"
                    eventTarget={`repo:${hostname(project.repo_url)}`}
                    href={project.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fm-link hover:text-fm-link-hover"
                  >
                    &#128193; {t.sourceCode} &rarr;
                  </TrackedLink>
                </div>
              )}
              {project.homepage_url && project.homepage_url !== project.repo_url && (
                <div>
                  <TrackedLink
                    event="outbound"
                    eventTarget={`home:${hostname(project.homepage_url)}`}
                    href={project.homepage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fm-link hover:text-fm-link-hover"
                  >
                    &#127760; {t.homepage} &rarr;
                  </TrackedLink>
                </div>
              )}
            </div>
          </div>
        )}

        <ShareLinks projectName={project.name} shortDesc={project.short_desc || ""} />
      </aside>
    </div>
  );
}
