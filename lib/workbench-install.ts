import * as fs from "fs";
import * as path from "path";
import { getWorkbenchBundles, getWorkbenchFilterOptions, type WorkbenchMode } from "@/lib/workbench";

const scriptsRoot = path.join(process.cwd(), "scripts");
const bootstrapCommonPath = path.join(scriptsRoot, "lib", "bootstrap-common.sh");
const bootstrapScriptPath = path.join(scriptsRoot, "bootstrap-agent-edition.sh");

export function getHostedAgentEditionInstallScript(): string {
  const common = fs.readFileSync(bootstrapCommonPath, "utf8").trim();
  const bootstrapLines = fs.readFileSync(bootstrapScriptPath, "utf8").trim().split("\n");
  const bootstrap = bootstrapLines.slice(6).join("\n").trim();

  return `${common}\n\n${bootstrap}\n`;
}

export function buildAgentEditionCommands(input: { bundle?: string; mode?: string } = {}) {
  const options = getWorkbenchFilterOptions();
  const bundle = getWorkbenchBundles().find((item) => item.id === input.bundle)?.id ?? "solo-builder-core";
  const mode = options.modes.includes(input.mode as WorkbenchMode) ? (input.mode as WorkbenchMode) : "headless";
  const modeArg = `--mode ${mode}`;
  const bundleArg = `--bundle ${bundle}`;

  return {
    bundle,
    mode,
    hosted: `curl -fsSL https://freshcrate.ai/api/install/agent-edition | bash -s -- ${bundleArg} ${modeArg}`,
    local: `bash scripts/bootstrap-agent-edition.sh ${bundleArg} ${modeArg}`,
    verify: `bash scripts/verify-agent-edition.sh ${bundleArg} ${modeArg}`,
  };
}

export function getAgentEditionPresetCards() {
  return [
    {
      id: "solo-builder-core",
      title: "Solo Builder",
      summary: "Default lean operator box for one person shipping agents.",
      href: "/install/agent-edition?bundle=solo-builder-core&mode=headless",
    },
    {
      id: "research-node",
      title: "Research Node",
      summary: "Grounded browsing, crawling, and synthesis with optional light desktop.",
      href: "/install/agent-edition?bundle=research-node&mode=light-desktop",
    },
    {
      id: "automation-node",
      title: "Automation Node",
      summary: "Headless-first cron, webhook, and CI execution lane.",
      href: "/install/agent-edition?bundle=automation-node&mode=headless",
    },
    {
      id: "security-ops-node",
      title: "Security Ops",
      summary: "Minimal audit box with isolation and evidence-heavy workflows.",
      href: "/install/agent-edition?bundle=security-ops-node&mode=headless",
    },
  ];
}
