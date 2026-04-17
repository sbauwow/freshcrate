export type WorkbenchTarget = "ubuntu-24.04-x86_64";
export type WorkbenchPersona = "solo-dev" | "research" | "automation" | "security" | "local-models";
export type WorkbenchMode = "headless" | "light-desktop";

export interface WorkbenchBundle {
  id: string;
  name: string;
  target: WorkbenchTarget;
  persona: WorkbenchPersona;
  installModes: WorkbenchMode[];
  summary: string;
  philosophy: string;
  packages: string[];
  services: string[];
  verificationChecks: string[];
  antiGoals: string[];
  bootstrapCommand: string;
  verifyCommand: string;
}

export interface WorkbenchInstallMode {
  id: WorkbenchMode;
  name: string;
  summary: string;
  antiGoals: string[];
}

export interface WorkbenchFilters {
  persona?: WorkbenchPersona;
  target?: WorkbenchTarget;
  mode?: WorkbenchMode;
  q?: string;
}

export interface WorkbenchAction {
  id: string;
  title: string;
  priority: "P0" | "P1" | "P2";
  checklist: string[];
}

export interface WorkbenchPlaybook {
  score: number;
  level: "low" | "medium" | "high";
  rationale: string;
  actions: WorkbenchAction[];
}

const INSTALL_MODES: WorkbenchInstallMode[] = [
  {
    id: "headless",
    name: "Headless operator box",
    summary: "Default mode. Minimal agentic substrate with no mandatory desktop environment.",
    antiGoals: [
      "Heavy desktop environments by default",
      "Consumer media, office, chat, or game bundles",
      "GUI-first setup paths that block automation",
    ],
  },
  {
    id: "light-desktop",
    name: "Light desktop overlay",
    summary: "Optional thin UI layer for browser workflows and demos without turning the distro into a general-purpose desktop.",
    antiGoals: [
      "Full-fat workstation bundles",
      "Theme vanity work before operator workflows are stable",
      "Replacing the CLI as the control plane",
    ],
  },
];

const BUNDLES: WorkbenchBundle[] = [
  {
    id: "solo-builder-core",
    name: "Solo Builder Core",
    target: "ubuntu-24.04-x86_64",
    persona: "solo-dev",
    installModes: ["headless", "light-desktop"],
    summary: "A minimal substrate for one operator building and shipping agents without desktop bloat.",
    philosophy: "Start from Ubuntu minimal, keep only the shell, package/update path, containers, and the agent toolchain.",
    packages: ["git", "zsh", "tmux", "curl", "jq", "ripgrep", "fd", "sqlite3", "uv", "python3.11", "nodejs", "npm", "gh"],
    services: ["docker"],
    verificationChecks: [
      "uv and python3.11 available",
      "docker daemon reachable",
      "gh authenticated or explicitly skipped",
      "~/.freshcrate/logs and ~/.freshcrate/receipts created",
    ],
    antiGoals: ["Heavy desktop meta-packages", "Office/media bundles", "Duplicate editors by default"],
    bootstrapCommand: "bash scripts/bootstrap-agent-edition.sh --bundle solo-builder-core --channel stable",
    verifyCommand: "bash scripts/verify-agent-edition.sh --bundle solo-builder-core --channel stable",
  },
  {
    id: "research-node",
    name: "Research Node",
    target: "ubuntu-24.04-x86_64",
    persona: "research",
    installModes: ["headless", "light-desktop"],
    summary: "A minimal agentic substrate tuned for crawling, synthesis, note capture, and benchmark runs.",
    philosophy: "Keep the box lean, but include the exact browser, scraping, and notebook-adjacent dependencies needed for grounded research work.",
    packages: ["git", "tmux", "uv", "python3.11", "nodejs", "npm", "jq", "ripgrep", "sqlite3", "gh"],
    services: ["docker"],
    verificationChecks: [
      "playwright/chromium deps installed",
      "browser sandbox dependencies present",
      "workspace/research and receipts directories created",
      "network + DNS checks pass",
    ],
    antiGoals: ["Random desktop utilities", "GUI notebooks as a hard dependency", "Always-on background daemons"],
    bootstrapCommand: "bash scripts/bootstrap-agent-edition.sh --bundle research-node --channel stable",
    verifyCommand: "bash scripts/verify-agent-edition.sh --bundle research-node --channel stable",
  },
  {
    id: "automation-node",
    name: "Automation Node",
    target: "ubuntu-24.04-x86_64",
    persona: "automation",
    installModes: ["headless"],
    summary: "CLI-first box for cron, webhooks, CI helpers, and multi-agent execution lanes.",
    philosophy: "Bias toward unattended reliability: small surface area, review-gated deploy paths, strong logs, and deterministic runtime checks.",
    packages: ["git", "zsh", "tmux", "uv", "python3.11", "nodejs", "npm", "jq", "sqlite3", "gh", "railway"],
    services: ["docker"],
    verificationChecks: [
      "cron-safe PATH exported",
      "agent receipts dir writable",
      "docker/podman reachable",
      "deploy scripts require explicit review gate",
    ],
    antiGoals: ["Heavy desktop login managers", "Ad-hoc manual deploys", "Hidden credentials in shell history"],
    bootstrapCommand: "bash scripts/bootstrap-agent-edition.sh --bundle automation-node --channel stable",
    verifyCommand: "bash scripts/verify-agent-edition.sh --bundle automation-node --channel stable",
  },
  {
    id: "security-ops-node",
    name: "Security Ops Node",
    target: "ubuntu-24.04-x86_64",
    persona: "security",
    installModes: ["headless"],
    summary: "Minimal substrate for audits, isolated tooling, and evidence-heavy security workflows.",
    philosophy: "Keep attack surface low: no extra GUI junk, strong workspace isolation, strict logging, and explicit operator review points.",
    packages: ["git", "zsh", "tmux", "uv", "python3.11", "nodejs", "npm", "jq", "ripgrep", "fd", "sqlite3", "gh"],
    services: ["docker"],
    verificationChecks: [
      "workspace isolation directories created",
      "logs and receipts on separate paths",
      "sudo policy reduced to reviewed paths",
      "audit toolchain binaries present",
    ],
    antiGoals: ["Heavy desktop environment", "Ambient root access", "Unreviewed package sprawl"],
    bootstrapCommand: "bash scripts/bootstrap-agent-edition.sh --bundle security-ops-node --channel stable",
    verifyCommand: "bash scripts/verify-agent-edition.sh --bundle security-ops-node --channel stable",
  },
  {
    id: "local-model-box",
    name: "Local Model Box",
    target: "ubuntu-24.04-x86_64",
    persona: "local-models",
    installModes: ["headless", "light-desktop"],
    summary: "A lean local-model workstation with agent orchestration core and optional inference runtimes.",
    philosophy: "GPU support matters, but still keep the substrate minimal: model runners are optional packs layered over the same clean operator base.",
    packages: ["git", "tmux", "uv", "python3.11", "nodejs", "npm", "jq", "sqlite3", "gh", "ollama"],
    services: ["docker", "ollama"],
    verificationChecks: [
      "GPU or CPU fallback detected",
      "model cache directories created",
      "ollama or local runtime reachable",
      "workspace/model receipts writable",
    ],
    antiGoals: ["Desktop bloat for eye candy", "Huge default model downloads", "Forcing GPU-only support"],
    bootstrapCommand: "bash scripts/bootstrap-agent-edition.sh --bundle local-model-box --channel stable",
    verifyCommand: "bash scripts/verify-agent-edition.sh --bundle local-model-box --channel stable",
  },
];

const ACTION_LIBRARY: Record<string, WorkbenchAction> = {
  minimalBase: {
    id: "minimalBase",
    title: "Start from Ubuntu minimal and keep the substrate lean",
    priority: "P0",
    checklist: [
      "Support Ubuntu 24.04 x86_64 only for v0.",
      "Ship headless first; make desktop optional.",
      "Exclude office/media/chat/game bundles from the base image.",
    ],
  },
  verification: {
    id: "verification",
    title: "Ship a real machine verification path",
    priority: "P0",
    checklist: [
      "Verify OS, arch, package/runtime presence, and service health.",
      "Check receipts/log directories and workspace layout.",
      "Fail closed with operator-readable remediation output.",
    ],
  },
  isolation: {
    id: "isolation",
    title: "Bake in workspace and secrets isolation",
    priority: "P1",
    checklist: [
      "Create explicit workspace, logs, receipts, and model-cache directories.",
      "Keep project secrets scoped per workspace.",
      "Reduce sudo and deploy actions to reviewed scripts.",
    ],
  },
  packs: {
    id: "packs",
    title: "Layer persona packs on the same core substrate",
    priority: "P1",
    checklist: [
      "Keep one base core across builder, research, automation, and security personas.",
      "Add optional local-model pack instead of bloating the default image.",
      "Document exact package/service composition per bundle.",
    ],
  },
};

const PERSONA_TO_ACTIONS: Record<WorkbenchPersona, string[]> = {
  "solo-dev": ["minimalBase", "verification", "packs"],
  research: ["minimalBase", "verification", "packs"],
  automation: ["minimalBase", "verification", "isolation"],
  security: ["minimalBase", "verification", "isolation"],
  "local-models": ["minimalBase", "verification", "packs"],
};

export function getWorkbenchBundles(filters: WorkbenchFilters = {}): WorkbenchBundle[] {
  const q = filters.q?.trim().toLowerCase();

  return BUNDLES.filter((bundle) => (filters.persona ? bundle.persona === filters.persona : true))
    .filter((bundle) => (filters.target ? bundle.target === filters.target : true))
    .filter((bundle) => (filters.mode ? bundle.installModes.includes(filters.mode) : true))
    .filter((bundle) => {
      if (!q) return true;
      const haystack = [
        bundle.name,
        bundle.summary,
        bundle.philosophy,
        ...bundle.packages,
        ...bundle.services,
        ...bundle.verificationChecks,
        ...bundle.antiGoals,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getWorkbenchFilterOptions() {
  return {
    personas: Array.from(new Set(BUNDLES.map((bundle) => bundle.persona))).sort(),
    targets: Array.from(new Set(BUNDLES.map((bundle) => bundle.target))).sort(),
    modes: Array.from(new Set(BUNDLES.flatMap((bundle) => bundle.installModes))).sort(),
  };
}

export function getWorkbenchInstallModes() {
  return INSTALL_MODES;
}

export function getWorkbenchBrief() {
  return {
    bundles: BUNDLES.length,
    principles: 4,
    verificationChecks: BUNDLES.reduce((sum, bundle) => sum + bundle.verificationChecks.length, 0),
  };
}

export function getWorkbenchPlaybook(filters: WorkbenchFilters = {}): WorkbenchPlaybook {
  const bundles = getWorkbenchBundles(filters);
  const score = Math.max(10, Math.min(100, bundles.length * 18 + (filters.mode === "headless" ? 12 : 0) + (filters.persona ? 8 : 0)));
  const level: WorkbenchPlaybook["level"] = score >= 60 ? "high" : score >= 35 ? "medium" : "low";

  const actionIds = new Set<string>();
  if (filters.persona) {
    for (const actionId of PERSONA_TO_ACTIONS[filters.persona] ?? []) {
      actionIds.add(actionId);
    }
  }
  for (const bundle of bundles) {
    for (const actionId of PERSONA_TO_ACTIONS[bundle.persona] ?? []) {
      actionIds.add(actionId);
    }
  }
  if (filters.mode === "headless") {
    actionIds.add("minimalBase");
    actionIds.add("verification");
  }

  const actions = Array.from(actionIds)
    .map((id) => ACTION_LIBRARY[id])
    .filter(Boolean)
    .sort((a, b) => a.priority.localeCompare(b.priority) || a.title.localeCompare(b.title));

  return {
    score,
    level,
    rationale:
      bundles.length === 0
        ? "No bundle matches the current filters. Reset filters or widen the install mode/persona scope."
        : "Freshcrate Agent Edition should behave like a minimal operator substrate: headless first, explicit packs later, and verification before polish.",
    actions,
  };
}
