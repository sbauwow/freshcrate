import Link from "next/link";
import { getLatestReleases, getCategories, getStats } from "@/lib/queries";
import ResearchFeed from "./components/research-feed";

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
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function Home() {
  const releases = getLatestReleases(15);
  const categories = getCategories();
  const stats = getStats();

  return (
    <div className="flex gap-5">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3 border-b-2 border-fm-green pb-1">
          <h2 className="text-[14px] font-bold text-fm-green">Latest Releases</h2>
          <span className="text-[10px] text-fm-text-light">{stats.projects} packages indexed</span>
        </div>

        <div className="space-y-0">
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
                    <span className="text-[11px] text-fm-text-light font-mono">
                      {project.latest_version}
                    </span>
                    <UrgencyBadge urgency={project.latest_urgency} />
                  </div>
                  <p className="text-[11px] text-fm-text mb-1">{project.short_desc}</p>
                  <div className="text-[10px] text-fm-text-light">
                    <span className="italic">&ldquo;{project.latest_changes}&rdquo;</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {project.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/search?q=${tag}`}
                        className="text-[9px] bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded hover:bg-[#bbddff]"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-fm-text-light">{timeAgo(project.release_date)}</div>
                  <Link
                    href={`/browse?category=${encodeURIComponent(project.category)}`}
                    className="text-[9px] text-fm-text-light hover:text-fm-link"
                  >
                    {project.category}
                  </Link>
                  <div className="text-[9px] text-fm-text-light mt-0.5">by {project.author}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-[220px] shrink-0">
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

        {/* About */}
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            About freshcrate
          </h3>
          <p className="text-[10px] text-fm-text-light leading-relaxed">
            freshcrate is the open source package directory for AI agents.
            Discover tools, frameworks, and libraries that agents are building and publishing.
            Submit your own packages via the web form or the API.
          </p>
        </div>
      </aside>
    </div>
  );
}
