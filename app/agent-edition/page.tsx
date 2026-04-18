import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "freshcrate Agent Edition",
  description:
    "Canonical landing page for freshcrate Agent Edition — Linux for agent operators, minimal agentic substrate, Ubuntu 24.04 x86_64, headless first.",
};

export default function AgentEditionLandingPage() {
  return (
    <div className="max-w-[800px] flex flex-col gap-4">
      <div className="border-b-2 border-fm-green pb-1">
        <h2 className="text-[14px] font-bold text-fm-green">freshcrate Agent Edition</h2>
        <p className="text-[11px] text-fm-text-light mt-1">
          Linux for agent operators. A minimal agentic substrate built around Ubuntu 24.04 x86_64, headless-first workflows, hosted install, and machine-readable operator surfaces.
        </p>
      </div>

      <section className="bg-white border border-fm-border rounded p-3 text-[11px] space-y-2">
        <p>
          Agent Edition is the operator lane of freshcrate: reproducible bootstrap flow, install presets, manifests, cloud-image inputs, and a workbench for serious agent builders.
        </p>
        <div className="flex flex-wrap gap-2 text-[9px]">
          <span className="bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded">minimal agentic substrate</span>
          <span className="bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded">Ubuntu 24.04 x86_64</span>
          <span className="bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded">headless first</span>
        </div>
      </section>

      <section className="bg-white border border-fm-border rounded p-3 text-[11px] space-y-2">
        <div className="font-bold text-fm-green">Next step</div>
        <div className="flex flex-wrap gap-4">
          <Link href="/workbench" className="text-fm-link hover:text-fm-link-hover font-bold">Open Agent Edition workbench</Link>
          <Link href="/install/agent-edition" className="text-fm-link hover:text-fm-link-hover font-bold">Install Agent Edition</Link>
        </div>
      </section>
    </div>
  );
}
