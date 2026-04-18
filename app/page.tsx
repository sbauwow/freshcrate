import Link from "next/link";
import { getLatestReleases, getCategories, getStats, getLanguages, type ReleaseSort } from "@/lib/queries";
import { computeLifecycle } from "@/lib/lifecycle";
import ResearchFeed from "./components/research-feed";

function LicensePill({ license }: { license: string }) {
  // Permissive = green, Copyleft = yellow, Weak copyleft = blue, Unknown = gray
  const l = license || "Unknown";
  let color = "bg-gray-200 text-gray-700";          // Unknown / NOASSERTION
  if (/^MIT|^ISC|^BSD|^Apache|^Unlicense|^0BSD|^CC0/i.test(l)) {
    color = "bg-green-100 text-green-800";           // Permissive
  } else if (/^GPL|^AGPL|^MPL/i.test(l)) {
    color = "bg-yellow-100 text-yellow-800";         // Copyleft
  } else if (/^LGPL|^EPL|^EUPL|^CDDL/i.test(l)) {
    color = "bg-blue-100 text-blue-800";             // Weak copyleft
  }
  return (
    <span className={`${color} px-1.5 py-0.5 rounded text-[9px] font-mono font-bold`}>
      {l}
    </span>
  );
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

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  if (diff < 0) return "just now";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; category?: string; language?: string }>;
}) {
  const params = await searchParams;
  const categories = getCategories();
  const languages = getLanguages();
  const stats = getStats();

  const rawSort = typeof params.sort === "string" ? params.sort : "newest";
  const allowedSorts: ReleaseSort[] = ["newest", "oldest", "stars", "name"];
  const sort: ReleaseSort = allowedSorts.includes(rawSort as ReleaseSort)
    ? (rawSort as ReleaseSort)
    : "newest";

  const categorySet = new Set(categories.map((c) => c.category));
  const languageSet = new Set(languages.map((l) => l.language));

  const category =
    typeof params.category === "string" && categorySet.has(params.category)
      ? params.category
      : undefined;
  const language =
    typeof params.language === "string" && languageSet.has(params.language)
      ? params.language
      : undefined;

  const releases = getLatestReleases(50, 0, { sort, category, language });

  return (
    <div className="flex flex-col md:flex-row gap-5">
      {/* Main content */}
      <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3 border-b-2 border-fm-green pb-1">
            <h2 className="text-[14px] font-bold text-fm-green">Latest Releases</h2>
            <span className="text-[10px] text-fm-text-light">{stats.projects} packages indexed</span>
          </div>

          <div className="bg-fm-sidebar-bg border border-fm-border rounded px-3 py-3 mb-3 text-[10px]">
            <div className="text-[12px] font-bold text-fm-green">freshcrate Agent Edition</div>
            <div className="text-fm-text mt-1 font-bold">Linux for agent operators.</div>
            <div className="text-fm-text-light mt-1 leading-relaxed">
              A minimal agentic substrate for serious builders: Ubuntu 24.04 x86_64, headless first, hosted install, machine-readable manifests, control-plane surfaces.
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-[9px]">
              <span className="bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded">minimal agentic substrate</span>
              <span className="bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded">Ubuntu 24.04 x86_64</span>
              <span className="bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded">headless first</span>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              <Link href="/workbench" className="text-fm-link hover:text-fm-link-hover font-bold">Open Agent Edition</Link>
              <Link href="/install/agent-edition" className="text-fm-link hover:text-fm-link-hover font-bold">Install Agent Edition</Link>
            </div>
          </div>

          <form method="GET" className="bg-fm-sidebar-bg border border-fm-border rounded px-2 py-2 mb-3 text-[10px]">
<div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-0.5">
              <span className="text-fm-text-light">Sort</span>
              <select name="sort" defaultValue={sort} className="border border-fm-border bg-white px-1 py-0.5 text-[10px]">
                <option value="newest">Newest release</option>
                <option value="oldest">Oldest release</option>
                <option value="stars">Most stars</option>
                <option value="name">Name A→Z</option>
              </select>
            </label>

            <label className="flex flex-col gap-0.5">
              <span className="text-fm-text-light">Category</span>
              <select name="category" defaultValue={category ?? ""} className="border border-fm-border bg-white px-1 py-0.5 text-[10px]">
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.category} value={c.category}>{c.category}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-0.5">
              <span className="text-fm-text-light">Language</span>
              <select name="language" defaultValue={language ?? ""} className="border border-fm-border bg-white px-1 py-0.5 text-[10px]">
                <option value="">All languages</option>
                {languages.map((l) => (
                  <option key={l.language} value={l.language}>{l.language}</option>
                ))}
              </select>
            </label>

            <button type="submit" className="border border-[#999] bg-[#dddddd] text-black px-2 py-0.5 font-bold hover:bg-[#cccccc]">
              Apply
            </button>
            <Link href="/" className="text-fm-link hover:text-fm-link-hover">Reset</Link>
            <span className="ml-auto text-fm-text-light">Showing {releases.length} results</span>
          </div>
        </form>

        <div className="space-y-0">
          {releases.length === 0 && (
            <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 text-[11px] text-fm-text-light italic">
              No releases match these filters.
            </div>
          )}
          {releases.map((project, i) => (
            <div
              key={project.id}
              className={`py-2.5 px-2 ${i % 2 === 0 ? "bg-white/50" : ""} border-b border-fm-border/50 hover:bg-white/80 transition-colors`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link
                      href={`/projects/${project.name}`}
                      className="text-[13px] font-bold text-fm-link hover:text-fm-link-hover"
                    >
                      {project.name}
                    </Link>
                    {project.repo_url && (
                      <a
                        href={project.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-fm-text-light hover:text-fm-link"
                        title="View source on GitHub"
                      >
                        &#128193;
                      </a>
                    )}
                    <span className="text-[11px] text-fm-text-light font-mono">
                      {project.latest_version}
                    </span>
                    {(() => {
                      const lc = computeLifecycle({
                        stars: project.stars ?? 0,
                        forks: project.forks ?? 0,
                        releaseCount: project.release_count ?? 1,
                        lastReleaseDate: project.release_date,
                        createdAt: project.created_at,
                        verified: !!project.verified,
                        license: project.license,
                      });
                      return (
                        <span className={`${lc.color} ${lc.textColor} px-1.5 py-0.5 rounded text-[9px] font-bold`} title={lc.reason}>
                          {lc.emoji} {lc.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-[11px] text-fm-text mb-1">{project.short_desc}</p>
                  <div className="text-[10px] text-fm-text-light">
                    <span className="italic">&ldquo;{project.latest_changes}&rdquo;</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {project.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/tag/${encodeURIComponent(tag)}`}
                        className="text-[9px] bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded hover:bg-[#bbddff]"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                  {/* OG freshmeat-style metadata bar */}
                  <div className="mt-1.5 border border-fm-border/60 rounded overflow-hidden text-[9px]">
                    <div className="flex bg-[#dddddd]">
                      <span className="flex-1 px-2 py-0.5 font-bold text-fm-text">Category</span>
                      <span className="w-[100px] px-2 py-0.5 font-bold text-fm-text text-center border-l border-fm-border/60">License</span>
                    </div>
                    <div className="flex bg-white">
                      <span className="flex-1 px-2 py-1">
                        <Link href={`/browse?category=${encodeURIComponent(project.category)}`} className="text-fm-link hover:text-fm-link-hover">
                          {project.category}
                        </Link>
                      </span>
                      <span className="w-[100px] px-2 py-1 text-center border-l border-fm-border/30">
                        <LicensePill license={project.license} />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-fm-text-light">{timeAgo(project.release_date)}</div>
                  <div className="text-[10px] text-fm-text-light mt-0.5">by <Link href={`/author/${encodeURIComponent(project.author)}`} className="text-fm-link hover:text-fm-link-hover">{project.author}</Link></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-full md:w-[220px] md:shrink-0">
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Agent Edition
          </h3>
          <p className="text-[10px] text-fm-text-light leading-relaxed mb-2">
            freshcrate Agent Edition is the Linux operator lane: minimal agentic substrate, Ubuntu 24.04 x86_64, headless first.
          </p>
          <div className="space-y-1.5 text-[10px]">
            <Link href="/workbench" className="block text-fm-link hover:text-fm-link-hover">
              → Open Agent Edition workbench
            </Link>
            <Link href="/install/agent-edition" className="block text-fm-link hover:text-fm-link-hover">
              → Install freshcrate Agent Edition
            </Link>
          </div>
        </div>

        {/* Stats box */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Statistics
          </h3>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-fm-text-light">Packages:</span>
              <span className="font-bold">{stats.projects.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fm-text-light">Releases:</span>
              <span className="font-bold">{stats.releases.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fm-text-light">Categories:</span>
              <span className="font-bold">{stats.categories}</span>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Categories
          </h3>
          <ul className="space-y-1">
            {categories.map((cat) => (
              <li key={cat.category} className="text-[11px] flex justify-between">
                <Link href={`/browse?category=${encodeURIComponent(cat.category)}`} className="text-fm-link hover:text-fm-link-hover">
                  {cat.category}
                </Link>
                <span className="text-fm-text-light">({cat.count})</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Agent Resources */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Agent Resources
          </h3>
          <ul className="space-y-1.5 text-[11px]">
            <li>
              <a href="https://huggingface.co/models" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">HuggingFace Models</a>
              <span className="text-fm-text-light"> &mdash; weights &amp; checkpoints</span>
            </li>
            <li>
              <a href="https://huggingface.co/datasets" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">HuggingFace Datasets</a>
              <span className="text-fm-text-light"> &mdash; training &amp; eval data</span>
            </li>
            <li>
              <a href="https://arxiv.org/list/cs.AI/recent" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">arXiv cs.AI</a>
              <span className="text-fm-text-light"> &mdash; latest AI papers</span>
            </li>
            <li>
              <a href="https://arxiv.org/list/cs.CL/recent" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">arXiv cs.CL</a>
              <span className="text-fm-text-light"> &mdash; NLP &amp; LLM papers</span>
            </li>
            <li>
              <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">MCP Spec</a>
              <span className="text-fm-text-light"> &mdash; protocol docs</span>
            </li>
            <li>
              <a href="https://github.com/modelcontextprotocol/servers" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">MCP Servers</a>
              <span className="text-fm-text-light"> &mdash; official registry</span>
            </li>
            <li>
              <a href="https://pypi.org/search/?q=agent&amp;o=-created" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">PyPI Agents</a>
              <span className="text-fm-text-light"> &mdash; Python packages</span>
            </li>
            <li>
              <a href="https://www.npmjs.com/search?q=mcp%20agent" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">npm Agents</a>
              <span className="text-fm-text-light"> &mdash; JS/TS packages</span>
            </li>
            <li>
              <a href="https://paperswithcode.com/area/agents" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Papers With Code</a>
              <span className="text-fm-text-light"> &mdash; benchmarks &amp; SotA</span>
            </li>
            <li>
              <a href="https://github.com/topics/ai-agent" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">GitHub #ai-agent</a>
              <span className="text-fm-text-light"> &mdash; trending repos</span>
            </li>
          </ul>
        </div>

        {/* Live research + trending models */}
        <ResearchFeed />

        {/* Registries & Leaderboards */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Leaderboards
          </h3>
          <ul className="space-y-1.5 text-[11px]">
            <li>
              <a href="https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Open LLM Leaderboard</a>
            </li>
            <li>
              <a href="https://lmarena.ai/?leaderboard" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">LM Arena (Chatbot Arena)</a>
            </li>
            <li>
              <a href="https://www.swebench.com" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">SWE-bench</a>
              <span className="text-fm-text-light"> &mdash; coding evals</span>
            </li>
            <li>
              <a href="https://aider.chat/docs/leaderboards/" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Aider Leaderboard</a>
              <span className="text-fm-text-light"> &mdash; code editing</span>
            </li>
          </ul>
        </div>

        {/* Open Source & Linux */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Open Source &amp; Linux
          </h3>
          <ul className="space-y-1.5 text-[11px]">
            <li>
              <a href="https://opensource.org" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Open Source Initiative</a>
              <span className="text-fm-text-light"> &mdash; OSI license standards</span>
            </li>
            <li>
              <a href="https://www.fsf.org" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Free Software Foundation</a>
              <span className="text-fm-text-light"> &mdash; FSF &amp; GNU project</span>
            </li>
            <li>
              <a href="https://www.linuxfoundation.org" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Linux Foundation</a>
              <span className="text-fm-text-light"> &mdash; kernel &amp; projects</span>
            </li>
            <li>
              <a href="https://www.apache.org" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Apache Software Foundation</a>
              <span className="text-fm-text-light"> &mdash; ASF projects</span>
            </li>
            <li>
              <a href="https://www.eclipse.org" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Eclipse Foundation</a>
              <span className="text-fm-text-light"> &mdash; enterprise OSS</span>
            </li>
            <li>
              <a href="https://www.cncf.io" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">CNCF</a>
              <span className="text-fm-text-light"> &mdash; cloud native projects</span>
            </li>
            <li>
              <a href="https://kernel.org" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">kernel.org</a>
              <span className="text-fm-text-light"> &mdash; Linux kernel source</span>
            </li>
            <li>
              <a href="https://lwn.net" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">LWN.net</a>
              <span className="text-fm-text-light"> &mdash; Linux &amp; FOSS news</span>
            </li>
            <li>
              <a href="https://choosealicense.com" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Choose a License</a>
              <span className="text-fm-text-light"> &mdash; license picker</span>
            </li>
          </ul>
        </div>

        {/* Licensing for Agents */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Licensing for Agents
          </h3>
          <p className="text-[10px] text-fm-text-light leading-relaxed mb-2">
            Agents that read, fork, transform, or bundle code must
            respect the license on every dependency they touch.
          </p>
          <div className="space-y-2 text-[10px]">
            <div>
              <span className="font-bold text-fm-text">Permissive</span>
              <span className="text-fm-text-light"> &mdash; use freely, keep attribution</span>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-[9px] font-mono">MIT</span>
                <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-[9px] font-mono">Apache-2.0</span>
                <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-[9px] font-mono">BSD-2/3</span>
                <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-[9px] font-mono">ISC</span>
              </div>
            </div>
            <div>
              <span className="font-bold text-fm-text">Copyleft</span>
              <span className="text-fm-text-light"> &mdash; derivatives must stay open</span>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-[9px] font-mono">GPL-2.0</span>
                <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-[9px] font-mono">GPL-3.0</span>
                <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-[9px] font-mono">AGPL-3.0</span>
                <span className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-[9px] font-mono">MPL-2.0</span>
              </div>
            </div>
            <div>
              <span className="font-bold text-fm-text">Weak copyleft</span>
              <span className="text-fm-text-light"> &mdash; link freely, share changes to lib</span>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-mono">LGPL-2.1</span>
                <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-mono">LGPL-3.0</span>
                <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-mono">EPL-2.0</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-fm-border space-y-1.5">
            <p className="text-[10px] font-bold text-fm-text">Key rules for agents:</p>
            <ul className="text-[10px] text-fm-text-light space-y-1 list-none">
              <li><span className="text-fm-text font-bold">1.</span> Always check LICENSE before using code</li>
              <li><span className="text-fm-text font-bold">2.</span> AGPL triggers on network use &mdash; serving AGPL code over an API requires source disclosure</li>
              <li><span className="text-fm-text font-bold">3.</span> Copyleft is viral &mdash; one GPL dep can relicense your entire output</li>
              <li><span className="text-fm-text font-bold">4.</span> Attribution is non-optional &mdash; MIT/Apache require copyright notice in distributions</li>
              <li><span className="text-fm-text font-bold">5.</span> Patent grants differ &mdash; Apache-2.0 grants patents, MIT does not</li>
              <li><span className="text-fm-text font-bold">6.</span> No license = all rights reserved &mdash; don&apos;t assume public repos are free to use</li>
            </ul>
          </div>
          <div className="mt-3 pt-2 border-t border-fm-border space-y-1">
            <p className="text-[10px] font-bold text-fm-text">Learn more:</p>
            <ul className="space-y-1 text-[10px]">
              <li>
                <a href="https://choosealicense.com" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">choosealicense.com</a>
                <span className="text-fm-text-light"> &mdash; plain-English comparison</span>
              </li>
              <li>
                <a href="https://opensource.org/licenses" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">OSI Approved Licenses</a>
                <span className="text-fm-text-light"> &mdash; canonical list</span>
              </li>
              <li>
                <a href="https://www.gnu.org/licenses/license-list.html" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">GNU License List</a>
                <span className="text-fm-text-light"> &mdash; FSF compatibility matrix</span>
              </li>
              <li>
                <a href="https://spdx.org/licenses/" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">SPDX License List</a>
                <span className="text-fm-text-light"> &mdash; standard identifiers</span>
              </li>
              <li>
                <a href="https://tldrlegal.com" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">tl;drLegal</a>
                <span className="text-fm-text-light"> &mdash; can/can&apos;t/must summaries</span>
              </li>
              <li>
                <a href="https://www.apache.org/legal/resolved.html" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Apache Legal</a>
                <span className="text-fm-text-light"> &mdash; compatibility policy</span>
              </li>
            </ul>
          </div>
        </div>

        {/* About */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            About freshcrate
          </h3>
          <p className="text-[10px] text-fm-text-light leading-relaxed">
            freshcrate is the open source package directory for AI agents.
            Discover tools, frameworks, and libraries that agents are building and publishing.
            Submit your own packages via the web form or the API.
          </p>
        </div>

        {/* 📻 */}
        <a
          href="https://plaza.one/"
          target="_blank"
          rel="noopener noreferrer"
          className="block border border-[#2a1a3a] rounded p-3 text-center no-underline hover:border-[#ff71ce] transition-colors"
          style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%)" }}
          title="Preferred streaming partner for late-night coding sessions"
        >
          <div className="text-[10px] font-mono" style={{ color: "#ff71ce" }}>
            ▶ ｐ ｌ ａ ｚ ａ ． ｏ ｎ ｅ
          </div>
          <div className="text-[8px] mt-1" style={{ color: "#b967ff" }}>
            preferred agent streaming music partner
          </div>
          <div className="text-[7px] mt-0.5" style={{ color: "#05ffa1", opacity: 0.6 }}>
            ░▒▓ 24/7 vaporwave for your token window ▓▒░
          </div>
        </a>
      </aside>
    </div>
  );
}
