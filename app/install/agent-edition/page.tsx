import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "freshcrate Agent Edition install",
  description: "Install freshcrate Agent Edition from a hosted single-file bootstrap script.",
};

export default function AgentEditionInstallPage() {
  const hostedCommand = 'curl -fsSL https://freshcrate.ai/api/install/agent-edition | bash -s -- --bundle solo-builder-core';
  const localCommand = 'bash scripts/bootstrap-agent-edition.sh --bundle solo-builder-core';
  const verifyCommand = 'bash scripts/verify-agent-edition.sh --bundle solo-builder-core';

  return (
    <div className="max-w-[800px] flex flex-col gap-4">
      <div className="border-b-2 border-fm-green pb-1">
        <h2 className="text-[14px] font-bold text-fm-green">Install freshcrate Agent Edition</h2>
        <p className="text-[11px] text-fm-text-light mt-1">
          Hosted single-file installer for the minimal agentic substrate. Ubuntu 24.04 x86_64 only for v0.
        </p>
      </div>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Fast path
        </div>
        <div className="p-2 space-y-2 text-[11px]">
          <p>Use the hosted installer when you want curl | bash ergonomics but still keep the product minimal and script-first.</p>
          <div className="bg-fm-bg border border-fm-border rounded p-2 font-mono text-[10px] break-all">{hostedCommand}</div>
          <p className="text-fm-text-light">Then verify the machine locally:</p>
          <div className="bg-fm-bg border border-fm-border rounded p-2 font-mono text-[10px] break-all">{verifyCommand}</div>
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Local repo path
        </div>
        <div className="p-2 space-y-2 text-[11px]">
          <p>If you already cloned the repo and want the grounded local path:</p>
          <div className="bg-fm-bg border border-fm-border rounded p-2 font-mono text-[10px] break-all">{localCommand}</div>
          <div className="bg-fm-bg border border-fm-border rounded p-2 font-mono text-[10px] break-all">{verifyCommand}</div>
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded">
        <div className="px-2 py-1 border-b border-fm-border bg-fm-sidebar-bg text-[11px] font-bold text-fm-green">
          Guardrails
        </div>
        <div className="p-2 text-[11px]">
          <ul className="list-disc ml-4 text-fm-text-light space-y-0.5">
            <li>Supports Ubuntu 24.04 x86_64 only.</li>
            <li>Headless first. Light desktop is optional, never default.</li>
            <li>Bootstrap creates workspace, logs, receipts, and model-cache paths.</li>
            <li>Verification exits non-zero if the machine does not match the contract.</li>
            <li>ISO/cloud image comes later after the bootstrap contract stabilizes.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
