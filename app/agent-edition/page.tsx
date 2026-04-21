import type { Metadata } from "next";
import { buildAgentEditionCommands } from "@/lib/workbench-install";
import { getAgentEditionPublishedImageArtifact } from "@/lib/workbench-install-files";
import { getWorkbenchBundles } from "@/lib/workbench";

export const metadata: Metadata = {
  title: "freshcrate Agent Edition — Linux for agent operators",
  description:
    "freshcrate Agent Edition: a minimal Linux substrate for agent operators. Ubuntu 24.04 x86_64, headless first. Install via script, ISO + USB, or QCOW2.",
};

const BUNDLE_ID = "solo-builder-core";

export default function AgentEditionPage() {
  const bundle = getWorkbenchBundles().find((b) => b.id === BUNDLE_ID);
  if (!bundle) {
    throw new Error(`Missing bundle: ${BUNDLE_ID}`);
  }

  const commands = buildAgentEditionCommands({
    bundle: BUNDLE_ID,
    mode: "headless",
    channel: "stable",
  });
  const commandsWithOllama = `${commands.hosted} --with-ollama`;

  const iso = getAgentEditionPublishedImageArtifact({
    bundle: BUNDLE_ID,
    mode: "headless",
    channel: "stable",
    image: "iso-autoinstall-headless",
  });
  const qcow = getAgentEditionPublishedImageArtifact({
    bundle: BUNDLE_ID,
    mode: "headless",
    channel: "stable",
    image: "vm-qcow2-headless",
  });

  const isoDownloadUrl = iso.github_download_urls?.artifact ?? `${iso.download_urls.artifact}&download=1`;
  const isoChecksumUrl = iso.github_download_urls?.checksum ?? iso.download_urls.checksum;
  const qcowDownloadUrl = qcow.github_download_urls?.artifact ?? `${qcow.download_urls.artifact}&download=1`;
  const qcowChecksumUrl = qcow.github_download_urls?.checksum ?? qcow.download_urls.checksum;

  return (
    <div className="max-w-[800px] flex flex-col gap-4">
      <div className="border-b-2 border-fm-green pb-1">
        <h2 className="text-[14px] font-bold text-fm-green">freshcrate Agent Edition</h2>
        <p className="text-[11px] text-fm-text-light mt-1">
          Linux for agent operators. A minimal agentic substrate on Ubuntu 24.04 x86_64, headless first.
        </p>
      </div>

      <section className="bg-white border border-fm-border rounded p-3 text-[11px] space-y-2">
        <div className="flex flex-wrap gap-2 text-[9px]">
          <span className="bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded">minimal agentic substrate</span>
          <span className="bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded">Ubuntu 24.04 x86_64</span>
          <span className="bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded">headless first</span>
          <span className="bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded">stable channel v0.1.0</span>
        </div>
        <p>
          Agent Edition is the operator lane of freshcrate: reproducible bootstrap, one base bundle, shippable VM and ISO artifacts, and a machine-readable manifest.
        </p>
        <ul className="list-disc ml-4 text-fm-text-light space-y-0.5 text-[10px]">
          <li>Shell, containers, uv/Python, Node, gh CLI — nothing you do not need.</li>
          <li>No heavy desktop, no consumer bundles, no surprise services.</li>
          <li>Ollama is the only optional install-time add-on.</li>
        </ul>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          What&rsquo;s in the bundle — {bundle.name}
        </div>
        <div className="p-2 text-[11px] space-y-2">
          <p className="text-fm-text-light">{bundle.summary}</p>
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
        </div>
      </section>

      <div className="border-b-2 border-fm-green pb-1 mt-2">
        <h3 className="text-[13px] font-bold text-fm-green">Install</h3>
      </div>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Option 1 — Hosted install script (fastest)
        </div>
        <div className="p-2 space-y-2 text-[11px]">
          <p className="text-fm-text-light">On an existing Ubuntu 24.04 x86_64 host:</p>
          <div className="bg-fm-bg border border-fm-border rounded p-2 font-mono text-[10px] break-all">{commands.hosted}</div>
          <p className="text-fm-text-light">Add Ollama for optional local model inference:</p>
          <div className="bg-fm-bg border border-fm-border rounded p-2 font-mono text-[10px] break-all">{commandsWithOllama}</div>
          <p className="text-fm-text-light">Then verify:</p>
          <div className="bg-fm-bg border border-fm-border rounded p-2 font-mono text-[10px] break-all">{commands.verify}</div>
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Option 2 — Boot from USB (ISO)
        </div>
        <div className="p-2 space-y-3 text-[11px]">
          <p className="text-fm-text-light">
            Autoinstall ISO with freshcrate bootstrap baked in. Boot it on bare metal or a VM and verification runs on first boot.
          </p>
          <div className="flex flex-wrap gap-3 text-[10px]">
            <a href={isoDownloadUrl} className="text-fm-link hover:text-fm-link-hover font-bold">Download ISO</a>
            <a href={isoChecksumUrl} className="text-fm-link hover:text-fm-link-hover">sha256</a>
            <span className="text-fm-text-light">Status: {iso.available ? "built" : "pending first publish"}</span>
          </div>

          <div>
            <div className="font-bold text-fm-green text-[11px] mb-1">Linux — write ISO to USB</div>
            <p className="text-fm-text-light text-[10px] mb-1">
              Find your USB device with <code className="font-mono">lsblk</code>. The device path looks like <code className="font-mono">/dev/sdX</code> — <span className="font-bold">not</span> a partition like <code className="font-mono">/dev/sdX1</code>. This wipes the target device.
            </p>
            <div className="bg-fm-bg border border-fm-border rounded p-2 font-mono text-[10px] space-y-1">
              <div>lsblk</div>
              <div>sha256sum -c freshcrate-solo-builder-core-stable.iso.sha256</div>
              <div>sudo dd if=freshcrate-solo-builder-core-stable.iso of=/dev/sdX bs=4M status=progress conv=fsync</div>
              <div>sync</div>
            </div>
          </div>

          <div>
            <div className="font-bold text-fm-green text-[11px] mb-1">macOS — write ISO to USB</div>
            <p className="text-fm-text-light text-[10px] mb-1">
              Find the raw disk with <code className="font-mono">diskutil list</code>. Use the <code className="font-mono">rdiskN</code> form for speed. This wipes the target disk.
            </p>
            <div className="bg-fm-bg border border-fm-border rounded p-2 font-mono text-[10px] space-y-1">
              <div>diskutil list</div>
              <div>shasum -a 256 -c freshcrate-solo-builder-core-stable.iso.sha256</div>
              <div>diskutil unmountDisk /dev/diskN</div>
              <div>sudo dd if=freshcrate-solo-builder-core-stable.iso of=/dev/rdiskN bs=4m status=progress</div>
              <div>diskutil eject /dev/diskN</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Option 3 — Import QCOW2 (KVM / Proxmox / libvirt)
        </div>
        <div className="p-2 space-y-2 text-[11px]">
          <p className="text-fm-text-light">
            Pre-built VM disk image for labs and homelab clusters. Boot once and verify receipts under <code className="font-mono">~/.freshcrate</code>.
          </p>
          <div className="flex flex-wrap gap-3 text-[10px]">
            <a href={qcowDownloadUrl} className="text-fm-link hover:text-fm-link-hover font-bold">Download QCOW2</a>
            <a href={qcowChecksumUrl} className="text-fm-link hover:text-fm-link-hover">sha256</a>
            <span className="text-fm-text-light">Status: {qcow.available ? "built" : "pending first publish"}</span>
          </div>
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Guardrails
        </div>
        <div className="p-2 text-[11px]">
          <ul className="list-disc ml-4 text-fm-text-light space-y-0.5">
            <li>Ubuntu 24.04 x86_64 only.</li>
            <li>Headless first. Bootstrap creates workspace, logs, receipts, and model-cache paths.</li>
            <li>Verification exits non-zero if the machine does not match the contract.</li>
            <li>One bundle, one channel. More lanes land when they are actually shipping.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
