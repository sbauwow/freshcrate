import type { Metadata } from "next";
import Link from "next/link";
import {
  buildAgentEditionCommands,
  getAgentEditionCloudImages,
  getAgentEditionComparisonMatrix,
  getAgentEditionImageArtifactDownload,
  getAgentEditionManifestDownload,
  getAgentEditionPresetCards,
  getAgentEditionRecommendations,
  getAgentEditionReleaseChannels,
} from "@/lib/workbench-install";
import { getWorkbenchBundles, getWorkbenchFilterOptions, getWorkbenchInstallModes, type WorkbenchMode } from "@/lib/workbench";

export const metadata: Metadata = {
  title: "freshcrate Agent Edition install",
  description: "Install freshcrate Agent Edition from a hosted single-file bootstrap script.",
};

export default async function AgentEditionInstallPage({
  searchParams,
}: {
  searchParams: Promise<{ bundle?: string; mode?: string; channel?: string }>;
}) {
  const params = await searchParams;
  const options = getWorkbenchFilterOptions();
  const installModes = getWorkbenchInstallModes();
  const releaseChannels = getAgentEditionReleaseChannels();
  const bundles = getWorkbenchBundles();
  const presets = getAgentEditionPresetCards();
  const matrix = getAgentEditionComparisonMatrix();
  const cloudImages = getAgentEditionCloudImages();
  const commands = buildAgentEditionCommands({
    bundle: typeof params.bundle === "string" ? params.bundle : undefined,
    mode: typeof params.mode === "string" ? params.mode : undefined,
    channel: typeof params.channel === "string" ? params.channel : undefined,
  });
  const selectedBundle = bundles.find((bundle) => bundle.id === commands.bundle) ?? bundles[0];
  const selectedChannel = releaseChannels.find((channel) => channel.id === commands.channel) ?? releaseChannels[0];
  const manifestDownload = getAgentEditionManifestDownload({ bundle: commands.bundle, mode: commands.mode, channel: commands.channel });
  const recommendations = getAgentEditionRecommendations({ persona: selectedBundle.persona, task: selectedBundle.summary });

  return (
    <div className="max-w-[800px] flex flex-col gap-4">
      <div className="border-b-2 border-fm-green pb-1">
        <h2 className="text-[14px] font-bold text-fm-green">Install freshcrate Agent Edition</h2>
        <p className="text-[11px] text-fm-text-light mt-1">
          Hosted single-file installer for the minimal agentic substrate. Ubuntu 24.04 x86_64 only for v0.
        </p>
      </div>

      <form method="GET" className="bg-fm-sidebar-bg border border-fm-border rounded px-2 py-2 text-[10px]">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-fm-text-light">Bundle</span>
            <select name="bundle" defaultValue={commands.bundle} className="border border-fm-border bg-white px-1 py-0.5 text-[10px]">
              {bundles.map((bundle) => (
                <option key={bundle.id} value={bundle.id}>{bundle.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-fm-text-light">Mode</span>
            <select name="mode" defaultValue={commands.mode} className="border border-fm-border bg-white px-1 py-0.5 text-[10px]">
              {options.modes.map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-fm-text-light">Channel</span>
            <select name="channel" defaultValue={commands.channel} className="border border-fm-border bg-white px-1 py-0.5 text-[10px]">
              {releaseChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>{channel.id}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="border border-[#999] bg-[#dddddd] text-black px-2 py-0.5 font-bold hover:bg-[#cccccc]">
            Apply
          </button>
          <a href="/install/agent-edition" className="text-fm-link hover:text-fm-link-hover">Reset</a>
          <span className="ml-auto text-fm-text-light">Target: {selectedBundle.target}</span>
        </div>
      </form>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Preset bundle cards
        </div>
        <div className="grid md:grid-cols-2 gap-2 p-2 text-[11px]">
          {presets.map((preset) => (
            <Link key={preset.id} href={preset.href} className="block border border-fm-border rounded p-2 bg-fm-bg/30 hover:bg-[#bbddff]/20 no-underline">
              <div className="font-bold text-fm-link">{preset.title}</div>
              <div className="text-fm-text-light mt-1">{preset.summary}</div>
              <div className="mt-2 font-mono text-[9px] text-fm-text-light">{preset.href}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Fast path
        </div>
        <div className="p-2 space-y-2 text-[11px]">
          <p>
            Use the hosted installer when you want curl | bash ergonomics but still keep the product minimal and script-first.
          </p>
          <div className="bg-fm-bg border border-fm-border rounded p-2 font-mono text-[10px] break-all">{commands.hosted}</div>
          <p className="text-fm-text-light">
            Release channel: <span className="font-bold text-fm-link">{selectedChannel.name}</span> ({selectedChannel.version}) — {selectedChannel.summary}
          </p>
          <p className="text-fm-text-light">
            Machine-readable manifest: <a href={`/api/workbench/manifest?bundle=${commands.bundle}&mode=${commands.mode}&channel=${commands.channel}`} className="text-fm-link hover:text-fm-link-hover">/api/workbench/manifest?bundle={commands.bundle}&mode={commands.mode}&channel={commands.channel}</a>
          </p>
          <p className="text-fm-text-light">
            Download: <a href={manifestDownload.href} className="text-fm-link hover:text-fm-link-hover">{manifestDownload.label}</a>
          </p>
          <p className="text-fm-text-light">Then verify the machine locally:</p>
          <div className="bg-fm-bg border border-fm-border rounded p-2 font-mono text-[10px] break-all">{commands.verify}</div>
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Recommendation
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
            API: <a href={`/api/workbench/recommend?persona=${selectedBundle.persona}&task=${encodeURIComponent(selectedBundle.summary)}`} className="text-fm-link hover:text-fm-link-hover">/api/workbench/recommend</a>
          </div>
          <div className="text-[10px] text-fm-text-light">
            Alternatives: {recommendations.alternatives.map((bundle) => bundle.name).join(" • ")}
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
                {channel.id === commands.channel ? <span className="text-[9px] font-bold text-fm-green">selected</span> : null}
              </div>
              <p className="text-fm-text-light">{channel.summary}</p>
              <p className="text-[10px] text-fm-text-light">Cadence: {channel.cadence} • Support: {channel.supportWindow}</p>
            </div>
          ))}
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
              channel: commands.channel,
              image: image.id,
            });
            const cloudInitDownload = getAgentEditionImageArtifactDownload({
              artifact: "cloud-init",
              bundle: image.target,
              mode: image.target === "research-node" ? "light-desktop" : "headless",
              channel: commands.channel,
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
              <p className="text-[10px] text-fm-text-light">Build: <code className="font-mono">bash scripts/build-agent-edition-image.sh --image {image.id} --bundle {image.target} --mode {image.target === "research-node" ? "light-desktop" : "headless"} --channel {commands.channel}</code></p>
              <p className="text-[10px] text-fm-text-light">Validate: <code className="font-mono">bash scripts/validate-agent-edition-templates.sh</code> or <code className="font-mono">npm run image:validate</code></p>
              <div className="text-[10px] text-fm-text-light">
                Artifacts: <a href={imageBuildDownload.href} className="text-fm-link hover:text-fm-link-hover">image-build manifest</a> • <a href={cloudInitDownload.href} className="text-fm-link hover:text-fm-link-hover">cloud-init seed</a>
              </div>
            </div>
          );})}
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
          Selected bundle
        </div>
        <div className="p-2 space-y-2 text-[11px]">
          <p><span className="font-bold">{selectedBundle.name}</span> — {selectedBundle.summary}</p>
          <p><span className="font-bold">Why this exists:</span> {selectedBundle.philosophy}</p>
          <div className="grid md:grid-cols-2 gap-2 text-[10px]">
            <div>
              <div className="font-bold text-fm-green mb-1">Core packages</div>
              <ul className="list-disc ml-4 text-fm-text-light space-y-0.5">
                {selectedBundle.packages.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-bold text-fm-green mb-1">Allowed modes</div>
              <ul className="list-disc ml-4 text-fm-text-light space-y-0.5">
                {selectedBundle.installModes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Local repo path
        </div>
        <div className="p-2 space-y-2 text-[11px]">
          <p>If you already cloned the repo and want the grounded local path:</p>
          <div className="bg-fm-bg border border-fm-border rounded p-2 font-mono text-[10px] break-all">{commands.local}</div>
          <div className="bg-fm-bg border border-fm-border rounded p-2 font-mono text-[10px] break-all">{commands.verify}</div>
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Guardrails
        </div>
        <div className="p-2 text-[11px] space-y-2">
          <ul className="list-disc ml-4 text-fm-text-light space-y-0.5">
            <li>Supports Ubuntu 24.04 x86_64 only.</li>
            <li>Headless first. Light desktop is optional, never default.</li>
            <li>Bootstrap creates workspace, logs, receipts, and model-cache paths.</li>
            <li>Verification exits non-zero if the machine does not match the contract.</li>
            <li>ISO/cloud image comes later after the bootstrap contract stabilizes.</li>
          </ul>
          <div>
            <div className="font-bold text-fm-green mb-1">Mode notes</div>
            <ul className="list-disc ml-4 text-fm-text-light space-y-0.5 text-[10px]">
              {installModes.map((mode) => (
                <li key={mode.id}>
                  <span className="font-bold">{mode.id}</span>: {mode.summary}
                </li>
              ))}
            </ul>
          </div>
          {selectedBundle.installModes.includes(commands.mode as WorkbenchMode) ? null : (
            <div className="border border-yellow-300 bg-yellow-50 text-yellow-900 rounded p-2 text-[10px]">
              Selected mode is not listed for this bundle. Resetting to a supported mode is recommended.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
