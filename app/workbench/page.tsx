import type { Metadata } from "next";
import {
  getWorkbenchBrief,
  getWorkbenchBundles,
  getWorkbenchFilterOptions,
  getWorkbenchInstallModes,
  getWorkbenchPlaybook,
  type WorkbenchMode,
  type WorkbenchPersona,
  type WorkbenchTarget,
} from "@/lib/workbench";
import {
  getAgentEditionCloudImages,
  getAgentEditionComparisonMatrix,
  getAgentEditionImageArtifactDownload,
  getAgentEditionManifestDownload,
  getAgentEditionPublishedImageArtifact,
  getAgentEditionRecommendations,
  getAgentEditionReleaseChannels,
} from "@/lib/workbench-install";

export const metadata: Metadata = {
  title: "freshcrate workbench — minimal agentic substrate",
  description:
    "freshcrate Agent Edition: a minimal Linux substrate for serious agent operators. Headless first, persona packs second, ISO later.",
};

function personaLabel(persona: WorkbenchPersona): string {
  return persona.replace(/-/g, " ");
}

export default async function WorkbenchPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string; target?: string; mode?: string; q?: string }>;
}) {
  const params = await searchParams;
  const options = getWorkbenchFilterOptions();
  const installModes = getWorkbenchInstallModes();

  const persona =
    typeof params.persona === "string" && options.personas.includes(params.persona as WorkbenchPersona)
      ? (params.persona as WorkbenchPersona)
      : undefined;
  const target =
    typeof params.target === "string" && options.targets.includes(params.target as WorkbenchTarget)
      ? (params.target as WorkbenchTarget)
      : undefined;
  const mode =
    typeof params.mode === "string" && options.modes.includes(params.mode as WorkbenchMode)
      ? (params.mode as WorkbenchMode)
      : undefined;
  const q = typeof params.q === "string" && params.q.trim().length > 0 ? params.q.trim() : undefined;

  const brief = getWorkbenchBrief();
  const bundles = getWorkbenchBundles({ persona, target, mode, q });
  const playbook = getWorkbenchPlaybook({ persona, target, mode, q });
  const matrix = getAgentEditionComparisonMatrix();
  const releaseChannels = getAgentEditionReleaseChannels();
  const cloudImages = getAgentEditionCloudImages();
  const recommendations = getAgentEditionRecommendations({ persona, task: q });
  const manifestDownload = getAgentEditionManifestDownload({
    bundle: recommendations.primary.bundle.id,
    mode: mode ?? "headless",
    channel: "stable",
  });
  const publishedVmArtifact = getAgentEditionPublishedImageArtifact({
    bundle: "solo-builder-core",
    mode: "headless",
    channel: "stable",
    image: "vm-qcow2-headless",
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b-2 border-fm-green pb-1">
        <h2 className="text-[14px] font-bold text-fm-green">Workbench — freshcrate Linux as a minimal agentic substrate</h2>
        <p className="text-[11px] text-fm-text-light mt-1">
          Bodhi-style minimalism, but for agent operators: headless first, exact toolchain second, custom ISO later.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
        <div className="bg-fm-sidebar-bg border border-fm-border rounded px-2 py-2">
          <div className="text-fm-text-light">Bundles</div>
          <div className="font-bold text-[13px]">{brief.bundles}</div>
        </div>
        <div className="bg-fm-sidebar-bg border border-fm-border rounded px-2 py-2">
          <div className="text-fm-text-light">Principles</div>
          <div className="font-bold text-[13px]">{brief.principles}</div>
        </div>
        <div className="bg-fm-sidebar-bg border border-fm-border rounded px-2 py-2">
          <div className="text-fm-text-light">Verification checks</div>
          <div className="font-bold text-[13px]">{brief.verificationChecks}</div>
        </div>
        <div className="bg-fm-sidebar-bg border border-fm-border rounded px-2 py-2">
          <div className="text-fm-text-light">Operator score</div>
          <div className="font-bold text-[13px]">{playbook.score}/100</div>
        </div>
      </div>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Product framing
        </div>
        <div className="p-2 text-[11px] space-y-2">
          <p>
            freshcrate Agent Edition is not trying to be a consumer distro. It is a minimal Linux substrate for serious agent operators.
          </p>
          <ul className="list-disc ml-4 text-fm-text-light space-y-0.5">
            <li>Ubuntu 24.04 x86_64 only for v0.</li>
            <li>Headless first. Light desktop optional. Heavy desktop never default.</li>
            <li>Agent core first: shell, containers, uv/Python, Node, logs, receipts, workspace layout, verification.</li>
            <li>Persona packs later: builder, research, automation, security, local-models.</li>
            <li>ISO/cloud image after the bootstrap contract is stable.</li>
          </ul>
          <p className="text-fm-text-light">
            Hosted install path: <a href="/install/agent-edition" className="text-fm-link hover:text-fm-link-hover">/install/agent-edition</a>
          </p>
          <div className="bg-fm-bg border border-fm-border rounded p-2 font-mono text-[10px] space-y-1">
            <div>curl -fsSL https://freshcrate.ai/api/install/agent-edition | bash -s -- --bundle solo-builder-core --channel stable</div>
            <div>bash scripts/verify-agent-edition.sh --bundle solo-builder-core --channel stable</div>
          </div>
        </div>
      </section>

      <form method="GET" className="bg-fm-sidebar-bg border border-fm-border rounded px-2 py-2 text-[10px]">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5 min-w-[220px]">
            <span className="text-fm-text-light">Keyword</span>
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="e.g. minimal substrate, security, tmux"
              className="border border-fm-border bg-white px-1 py-0.5 text-[10px]"
            />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-fm-text-light">Persona</span>
            <select name="persona" defaultValue={persona ?? ""} className="border border-fm-border bg-white px-1 py-0.5 text-[10px]">
              <option value="">All personas</option>
              {options.personas.map((item) => (
                <option key={item} value={item}>{personaLabel(item)}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-fm-text-light">Target</span>
            <select name="target" defaultValue={target ?? ""} className="border border-fm-border bg-white px-1 py-0.5 text-[10px]">
              <option value="">All targets</option>
              {options.targets.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-fm-text-light">Mode</span>
            <select name="mode" defaultValue={mode ?? ""} className="border border-fm-border bg-white px-1 py-0.5 text-[10px]">
              <option value="">All modes</option>
              {options.modes.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <button type="submit" className="border border-[#999] bg-[#dddddd] text-black px-2 py-0.5 font-bold hover:bg-[#cccccc]">
            Apply
          </button>
          <a href="/workbench" className="text-fm-link hover:text-fm-link-hover">Reset</a>
          <span className="ml-auto text-fm-text-light">Showing {bundles.length} bundles</span>
        </div>
      </form>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Install modes
        </div>
        <div className="divide-y divide-fm-border/50">
          {installModes.map((installMode) => (
            <div key={installMode.id} className="p-2 text-[11px]">
              <div className="font-bold text-fm-link">{installMode.name}</div>
              <p className="text-fm-text-light mt-1">{installMode.summary}</p>
              <div className="mt-2 text-[10px]">
                <span className="font-bold text-red-700">Anti-goals:</span>
                <ul className="list-disc ml-4 text-fm-text-light mt-1 space-y-0.5">
                  {installMode.antiGoals.map((goal) => (
                    <li key={goal}>{goal}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Operator playbook
        </div>
        <div className="p-2 space-y-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-fm-text">Minimal substrate score:</span>
            <span className="px-1.5 py-0.5 rounded bg-[#bbddff]/60 text-fm-link font-bold">{playbook.score}/100</span>
            <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${playbook.level === "high" ? "bg-red-100 text-red-800" : playbook.level === "medium" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
              {playbook.level}
            </span>
            <span className="text-fm-text-light">{playbook.rationale}</span>
          </div>
          <div className="space-y-2">
            {playbook.actions.map((action) => (
              <div key={action.id} className="border border-fm-border rounded p-2 bg-fm-bg/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-fm-text">{action.title}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${action.priority === "P0" ? "bg-red-100 text-red-800" : action.priority === "P1" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}`}>
                    {action.priority}
                  </span>
                </div>
                <ul className="list-disc ml-4 text-[10px] text-fm-text-light space-y-0.5">
                  {action.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Release channels
        </div>
        <div className="divide-y divide-fm-border/50">
          {releaseChannels.map((channel) => (
            <div key={channel.id} className="p-2 text-[11px] space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-fm-link">{channel.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#f3f3f3] text-fm-text-light text-[9px]">{channel.version}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${channel.risk === "low" ? "bg-green-100 text-green-800" : channel.risk === "medium" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                  {channel.risk} risk
                </span>
              </div>
              <p className="text-fm-text-light">{channel.summary}</p>
              <p className="text-[10px] text-fm-text-light">Cadence: {channel.cadence} • Support: {channel.supportWindow}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Recommended bundle
        </div>
        <div className="p-2 space-y-2 text-[11px]">
          <div>
            <span className="font-bold text-fm-link">{recommendations.primary.bundle.name}</span>
            <span className="text-fm-text-light"> — {recommendations.primary.bundle.summary}</span>
          </div>
          <ul className="list-disc ml-4 text-fm-text-light space-y-0.5">
            {recommendations.primary.why.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="text-[10px] text-fm-text-light">
            Alternatives: {recommendations.alternatives.map((bundle) => bundle.name).join(" • ")}
          </div>
          <div className="text-[10px] text-fm-text-light">
            API: <a href={`/api/workbench/recommend?persona=${recommendations.primary.bundle.persona}&task=${encodeURIComponent(q ?? recommendations.primary.bundle.summary)}`} className="text-fm-link hover:text-fm-link-hover">/api/workbench/recommend</a>
          </div>
          <div className="text-[10px] text-fm-text-light">
            Download: <a href={manifestDownload.href} className="text-fm-link hover:text-fm-link-hover">{manifestDownload.label}</a>
          </div>
        </div>
      </section>

      <section id="cloud-images" className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Cloud images / VM images
        </div>
        <div className="divide-y divide-fm-border/50">
          {cloudImages.map((image) => {
            const imageBuildDownload = getAgentEditionImageArtifactDownload({
              artifact: "image-build",
              bundle: image.target,
              mode: image.target === "research-node" ? "light-desktop" : "headless",
              channel: "stable",
              image: image.id,
            });
            const cloudInitDownload = getAgentEditionImageArtifactDownload({
              artifact: "cloud-init",
              bundle: image.target,
              mode: image.target === "research-node" ? "light-desktop" : "headless",
              channel: "stable",
            });

            return (
            <div key={image.id} className="p-2 text-[11px] space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-fm-link">{image.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#f3f3f3] text-fm-text-light text-[9px]">{image.provider}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#eef6ff] text-fm-link text-[9px]">{image.format}</span>
                <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 text-[9px] font-bold">{image.status}</span>
              </div>
              <p className="text-fm-text-light">{image.summary}</p>
              <p className="text-[10px] text-fm-text-light">Target bundle: {image.target} • Audience: {image.audience}</p>
              <p className="text-[10px] text-fm-text-light">Next step: {image.nextStep}</p>
              <p className="text-[10px] text-fm-text-light">Template: <code className="font-mono">images/{image.id}.pkr.hcl</code></p>
              <p className="text-[10px] text-fm-text-light">Build: <code className="font-mono">bash scripts/build-agent-edition-image.sh --image {image.id} --bundle {image.target} --mode {image.target === "research-node" ? "light-desktop" : "headless"} --channel stable</code></p>
              <p className="text-[10px] text-fm-text-light">Validate: <code className="font-mono">bash scripts/validate-agent-edition-templates.sh</code> or <code className="font-mono">npm run image:validate</code></p>
              {image.id === "vm-qcow2-headless" ? (
                <>
                  <p className="text-[10px] text-fm-text-light">Artifact path: <code className="font-mono">output/vm-qcow2-headless/freshcrate-solo-builder-core-stable.qcow2</code></p>
                  <p className="text-[10px] text-fm-text-light">Package: <code className="font-mono">bash scripts/package-agent-edition-image.sh --image vm-qcow2-headless --bundle solo-builder-core --mode headless --channel stable</code></p>
                  <p className="text-[10px] text-fm-text-light">Live status: {publishedVmArtifact.available ? "artifact built" : "not built yet"}</p>
                  <p className="text-[10px] text-fm-text-light">Artifact API: <a href={publishedVmArtifact.download_urls.metadata} className="text-fm-link hover:text-fm-link-hover">metadata</a> • <a href={publishedVmArtifact.download_urls.checksum} className="text-fm-link hover:text-fm-link-hover">checksum</a> • <a href={`${publishedVmArtifact.download_urls.artifact}&download=1`} className="text-fm-link hover:text-fm-link-hover">artifact download</a></p>
                  {publishedVmArtifact.github_download_urls ? <p className="text-[10px] text-fm-text-light">GitHub release: <a href={publishedVmArtifact.github_release_page_url ?? "#"} className="text-fm-link hover:text-fm-link-hover">release page</a> • <a href={publishedVmArtifact.github_download_urls.artifact} className="text-fm-link hover:text-fm-link-hover">public qcow2 zip</a> • <a href={publishedVmArtifact.github_download_urls.checksum} className="text-fm-link hover:text-fm-link-hover">sha256</a></p> : null}
                  <p className="text-[10px] text-fm-text-light">This is the first publish-ready Linux image lane.</p>
                </>
              ) : null}
              <div className="text-[10px] text-fm-text-light">
                Artifacts: <a href={imageBuildDownload.href} className="text-fm-link hover:text-fm-link-hover">image-build manifest</a> • <a href={cloudInitDownload.href} className="text-fm-link hover:text-fm-link-hover">cloud-init seed</a>
              </div>
            </div>
          );
          })}
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Comparison matrix
        </div>
        <div className="overflow-x-auto p-2">
          <table className="min-w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-fm-bg text-fm-green">
                {matrix.columns.map((column) => (
                  <th key={column} className="border border-fm-border px-2 py-1 text-left font-bold">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row.bundle} className="odd:bg-white even:bg-fm-bg/20">
                  {matrix.columns.map((column) => (
                    <td key={`${row.bundle}-${column}`} className="border border-fm-border px-2 py-1 text-fm-text-light">{row[column as keyof typeof row]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Bundles
        </div>
        <div className="divide-y divide-fm-border/50">
          {bundles.length === 0 && (
            <div className="p-3 text-[11px] text-fm-text-light italic">No workbench bundles match your filters.</div>
          )}
          {bundles.map((bundle) => (
            <div key={bundle.id} className="p-2 text-[11px] space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[12px] text-fm-link">{bundle.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#bbddff]/50 text-fm-link text-[9px]">{personaLabel(bundle.persona)}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#f3f3f3] text-fm-text-light text-[9px]">{bundle.target}</span>
                <span className="text-fm-text-light">{bundle.summary}</span>
              </div>

              <p><span className="font-bold">Why this exists:</span> {bundle.philosophy}</p>
              <p><span className="font-bold">Bootstrap:</span> <code className="font-mono text-[10px]">{bundle.bootstrapCommand}</code></p>
              <p><span className="font-bold">Verify:</span> <code className="font-mono text-[10px]">{bundle.verifyCommand}</code></p>

              <div className="grid md:grid-cols-2 gap-2 text-[10px]">
                <div>
                  <div className="font-bold text-fm-green mb-1">Core packages</div>
                  <ul className="list-disc ml-4 text-fm-text-light space-y-0.5">
                    {bundle.packages.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-bold text-fm-green mb-1">Services + verification</div>
                  <ul className="list-disc ml-4 text-fm-text-light space-y-0.5">
                    {bundle.services.map((item) => (
                      <li key={item}>service: {item}</li>
                    ))}
                    {bundle.verificationChecks.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <div className="font-bold text-red-700 mb-1 text-[10px]">Anti-goals</div>
                <div className="flex flex-wrap gap-1">
                  {bundle.antiGoals.map((item) => (
                    <span key={item} className="text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded">{item}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
