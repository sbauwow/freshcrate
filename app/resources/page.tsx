import type { Metadata } from "next";
import TrackedLink from "../components/tracked-link";

export const metadata: Metadata = {
  title: "Resources — agent tooling, leaderboards, open source & licensing | freshcrate",
  description:
    "Curated resources for AI agents: model & dataset registries, evaluation leaderboards, open source foundations, and a licensing primer for agents that read, fork, or bundle code.",
  alternates: { canonical: "/resources" },
  openGraph: {
    title: "Resources — agent tooling, leaderboards, open source & licensing",
    description:
      "Model & dataset registries, evaluation leaderboards, open source foundations, and a licensing primer for agents.",
    url: "https://www.freshcrate.ai/resources",
  },
};

export default function ResourcesPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="border-b-2 border-fm-green pb-3">
        <h1 className="text-[16px] font-bold text-fm-green">Resources</h1>
        <p className="text-[11px] text-fm-text mt-1">
          Registries, leaderboards, foundations, and licensing — the reference shelf that used to
          crowd the dashboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Agent Resources */}
        <section className="bg-fm-sidebar-bg border border-fm-border rounded p-3">
          <h2 className="text-[12px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Agent Resources
          </h2>
          <ul className="space-y-1.5 text-[11px]">
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:huggingface.co/models@resources" href="https://huggingface.co/models" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">HuggingFace Models</TrackedLink>
              <span className="text-fm-text-light"> &mdash; weights &amp; checkpoints</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:huggingface.co/datasets@resources" href="https://huggingface.co/datasets" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">HuggingFace Datasets</TrackedLink>
              <span className="text-fm-text-light"> &mdash; training &amp; eval data</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:arxiv.org/cs.ai@resources" href="https://arxiv.org/list/cs.AI/recent" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">arXiv cs.AI</TrackedLink>
              <span className="text-fm-text-light"> &mdash; latest AI papers</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:arxiv.org/cs.cl@resources" href="https://arxiv.org/list/cs.CL/recent" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">arXiv cs.CL</TrackedLink>
              <span className="text-fm-text-light"> &mdash; NLP &amp; LLM papers</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:modelcontextprotocol.io@resources" href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">MCP Spec</TrackedLink>
              <span className="text-fm-text-light"> &mdash; protocol docs</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:github.com/mcp-servers@resources" href="https://github.com/modelcontextprotocol/servers" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">MCP Servers</TrackedLink>
              <span className="text-fm-text-light"> &mdash; official registry</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:pypi.org/agents@resources" href="https://pypi.org/search/?q=agent&amp;o=-created" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">PyPI Agents</TrackedLink>
              <span className="text-fm-text-light"> &mdash; Python packages</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:npmjs.com/mcp-agent@resources" href="https://www.npmjs.com/search?q=mcp%20agent" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">npm Agents</TrackedLink>
              <span className="text-fm-text-light"> &mdash; JS/TS packages</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:paperswithcode.com/agents@resources" href="https://paperswithcode.com/area/agents" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Papers With Code</TrackedLink>
              <span className="text-fm-text-light"> &mdash; benchmarks &amp; SotA</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:github.com/topics/ai-agent@resources" href="https://github.com/topics/ai-agent" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">GitHub #ai-agent</TrackedLink>
              <span className="text-fm-text-light"> &mdash; trending repos</span>
            </li>
          </ul>
        </section>

        {/* Leaderboards */}
        <section className="bg-fm-sidebar-bg border border-fm-border rounded p-3">
          <h2 className="text-[12px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Leaderboards
          </h2>
          <ul className="space-y-1.5 text-[11px]">
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:huggingface.co/open-llm-leaderboard@resources" href="https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Open LLM Leaderboard</TrackedLink>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:lmarena.ai@resources" href="https://lmarena.ai/?leaderboard" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">LM Arena (Chatbot Arena)</TrackedLink>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:swebench.com@resources" href="https://www.swebench.com" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">SWE-bench</TrackedLink>
              <span className="text-fm-text-light"> &mdash; coding evals</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:aider.chat/leaderboards@resources" href="https://aider.chat/docs/leaderboards/" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Aider Leaderboard</TrackedLink>
              <span className="text-fm-text-light"> &mdash; code editing</span>
            </li>
          </ul>
        </section>

        {/* Open Source & Linux */}
        <section className="bg-fm-sidebar-bg border border-fm-border rounded p-3">
          <h2 className="text-[12px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Open Source &amp; Linux
          </h2>
          <ul className="space-y-1.5 text-[11px]">
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:opensource.org@resources" href="https://opensource.org" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Open Source Initiative</TrackedLink>
              <span className="text-fm-text-light"> &mdash; OSI license standards</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:fsf.org@resources" href="https://www.fsf.org" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Free Software Foundation</TrackedLink>
              <span className="text-fm-text-light"> &mdash; FSF &amp; GNU project</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:linuxfoundation.org@resources" href="https://www.linuxfoundation.org" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Linux Foundation</TrackedLink>
              <span className="text-fm-text-light"> &mdash; kernel &amp; projects</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:apache.org@resources" href="https://www.apache.org" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Apache Software Foundation</TrackedLink>
              <span className="text-fm-text-light"> &mdash; ASF projects</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:eclipse.org@resources" href="https://www.eclipse.org" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Eclipse Foundation</TrackedLink>
              <span className="text-fm-text-light"> &mdash; enterprise OSS</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:cncf.io@resources" href="https://www.cncf.io" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">CNCF</TrackedLink>
              <span className="text-fm-text-light"> &mdash; cloud native projects</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:kernel.org@resources" href="https://kernel.org" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">kernel.org</TrackedLink>
              <span className="text-fm-text-light"> &mdash; Linux kernel source</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:lwn.net@resources" href="https://lwn.net" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">LWN.net</TrackedLink>
              <span className="text-fm-text-light"> &mdash; Linux &amp; FOSS news</span>
            </li>
            <li>
              <TrackedLink event="outbound" eventTarget="outbound:choosealicense.com@resources" href="https://choosealicense.com" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Choose a License</TrackedLink>
              <span className="text-fm-text-light"> &mdash; license picker</span>
            </li>
          </ul>
        </section>

        {/* Licensing for Agents */}
        <section className="bg-fm-sidebar-bg border border-fm-border rounded p-3">
          <h2 className="text-[12px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Licensing for Agents
          </h2>
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
                <TrackedLink event="outbound" eventTarget="outbound:choosealicense.com@resources-licensing" href="https://choosealicense.com" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">choosealicense.com</TrackedLink>
                <span className="text-fm-text-light"> &mdash; plain-English comparison</span>
              </li>
              <li>
                <TrackedLink event="outbound" eventTarget="outbound:opensource.org/licenses@resources-licensing" href="https://opensource.org/licenses" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">OSI Approved Licenses</TrackedLink>
                <span className="text-fm-text-light"> &mdash; canonical list</span>
              </li>
              <li>
                <TrackedLink event="outbound" eventTarget="outbound:gnu.org/licenses@resources-licensing" href="https://www.gnu.org/licenses/license-list.html" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">GNU License List</TrackedLink>
                <span className="text-fm-text-light"> &mdash; FSF compatibility matrix</span>
              </li>
              <li>
                <TrackedLink event="outbound" eventTarget="outbound:spdx.org/licenses@resources-licensing" href="https://spdx.org/licenses/" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">SPDX License List</TrackedLink>
                <span className="text-fm-text-light"> &mdash; standard identifiers</span>
              </li>
              <li>
                <TrackedLink event="outbound" eventTarget="outbound:tldrlegal.com@resources-licensing" href="https://tldrlegal.com" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">tl;drLegal</TrackedLink>
                <span className="text-fm-text-light"> &mdash; can/can&apos;t/must summaries</span>
              </li>
              <li>
                <TrackedLink event="outbound" eventTarget="outbound:apache.org/legal@resources-licensing" href="https://www.apache.org/legal/resolved.html" target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">Apache Legal</TrackedLink>
                <span className="text-fm-text-light"> &mdash; compatibility policy</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
