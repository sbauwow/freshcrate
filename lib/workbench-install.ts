import * as fs from "fs";
import * as path from "path";
import { getWorkbenchBundles, getWorkbenchFilterOptions, type WorkbenchMode } from "@/lib/workbench";

export type AgentEditionChannel = "stable" | "beta" | "nightly";
export type AgentEditionArtifactKind = "manifest" | "image-build" | "cloud-init";
export type AgentEditionArtifactDownloadKind = "artifact" | "checksum" | "metadata";

export interface AgentEditionReleaseChannel {
  id: AgentEditionChannel;
  name: string;
  version: string;
  cadence: string;
  supportWindow: string;
  summary: string;
  risk: "low" | "medium" | "high";
}

export interface AgentEditionManifestDownload {
  href: string;
  fileName: string;
  label: string;
}

export interface AgentEditionCloudImage {
  id: string;
  name: string;
  provider: string;
  format: string;
  status: string;
  summary: string;
  target: string;
  audience: string;
  nextStep: string;
}

export interface AgentEditionImageBuildManifest {
  artifact: "image-build-manifest";
  schema_version: string;
  image: AgentEditionCloudImage;
  bundle: ReturnType<typeof getWorkbenchBundles>[number];
  channel: AgentEditionReleaseChannel;
  commands: ReturnType<typeof buildAgentEditionCommands>;
  packer: {
    template: string;
    template_exists: boolean;
    cloud_init_url: string;
    provisioner_script: string;
    bootstrap_script: string;
    verify_script: string;
    output_directory: string;
    expected_artifact: string;
    checksum_file: string;
    package_script: string;
    publish_ready: boolean;
    base_image: string;
    output_format: string;
    variables: Record<string, string>;
  };
}

export interface AgentEditionImageBuildCommand {
  script_path: string;
  validate_script_path: string;
  package_script_path: string;
  template: string;
  command: string;
  validate_command: string;
  package_command: string;
}

export interface AgentEditionPublishedImageArtifact {
  image: string;
  bundle: string;
  mode: string;
  channel: string;
  publish_ready: boolean;
  available: boolean;
  output_directory: string;
  artifact_path: string;
  checksum_path: string;
  metadata_path: string;
  sha256: string | null;
  file_size_bytes: number | null;
  updated_at: string | null;
  github_release_tag: string | null;
  github_release_page_url: string | null;
  github_download_urls: Record<AgentEditionArtifactDownloadKind, string> | null;
  download_urls: Record<AgentEditionArtifactDownloadKind, string>;
}

const scriptsRoot = path.join(process.cwd(), "scripts");
const bootstrapCommonPath = path.join(scriptsRoot, "lib", "bootstrap-common.sh");
const bootstrapScriptPath = path.join(scriptsRoot, "bootstrap-agent-edition.sh");

const RELEASE_CHANNELS: AgentEditionReleaseChannel[] = [
  {
    id: "stable",
    name: "Stable",
    version: "0.1.0",
    cadence: "Manual promoted releases",
    supportWindow: "Best default for serious operators",
    summary: "Slowest-moving channel. Use for production-ish agent boxes that need predictable receipts and fewer surprises.",
    risk: "low",
  },
  {
    id: "beta",
    name: "Beta",
    version: "0.2.0-beta",
    cadence: "Weekly preview cuts",
    supportWindow: "Short-lived preview lane before stable promotion",
    summary: "Preview channel for new bundles, installer behavior, and product copy before promotion to stable.",
    risk: "medium",
  },
  {
    id: "nightly",
    name: "Nightly",
    version: "0.3.0-nightly",
    cadence: "Daily tip-of-tree snapshots",
    supportWindow: "No long support window; expect churn",
    summary: "Fastest-moving channel for testing fresh bootstrap logic, manifests, and workbench experiments before they harden.",
    risk: "high",
  },
];

const CLOUD_IMAGES: AgentEditionCloudImage[] = [
  {
    id: "railway-dev-box",
    name: "Railway Dev Box",
    provider: "Railway",
    format: "template / base service",
    status: "roadmap",
    summary: "Fast path for cloud-hosted automation and webhook lanes with the same Agent Edition receipts, logs, and channel semantics.",
    target: "automation-node",
    audience: "operators shipping cron, webhook, and CI-style workloads",
    nextStep: "Pin bootstrap + verify in a Railway template with persistent volume guidance.",
  },
  {
    id: "vm-qcow2-headless",
    name: "Headless QCOW2 VM",
    provider: "Generic KVM / Proxmox",
    format: "qcow2",
    status: "roadmap",
    summary: "Importable VM image for local labs and homelab clusters that want a minimal substrate without ISO install friction.",
    target: "solo-builder-core",
    audience: "homelab and virtualization users",
    nextStep: "Bake a reproducible qcow2 from the stable manifest and verify boot-time receipts.",
  },
  {
    id: "aws-ami-builder",
    name: "AWS AMI Builder",
    provider: "AWS",
    format: "ami",
    status: "roadmap",
    summary: "Opinionated cloud image lane for ephemeral research and automation workers on EC2.",
    target: "research-node",
    audience: "teams needing reproducible cloud agents with fast spin-up",
    nextStep: "Turn manifest fields into Packer inputs and validate on Ubuntu 24.04 base images.",
  },
];

export function getHostedAgentEditionInstallScript(): string {
  const common = fs.readFileSync(bootstrapCommonPath, "utf8").trim();
  const bootstrapLines = fs.readFileSync(bootstrapScriptPath, "utf8").trim().split("\n");
  const bootstrap = bootstrapLines.slice(6).join("\n").trim();

  return `${common}\n\n${bootstrap}\n`;
}

export function getAgentEditionReleaseChannels(): AgentEditionReleaseChannel[] {
  return RELEASE_CHANNELS;
}

function normalizeChannel(input?: string): AgentEditionReleaseChannel {
  return RELEASE_CHANNELS.find((channel) => channel.id === input) ?? RELEASE_CHANNELS[0];
}

function normalizeBundle(input?: string) {
  return getWorkbenchBundles().find((item) => item.id === input) ?? getWorkbenchBundles().find((item) => item.id === "solo-builder-core") ?? getWorkbenchBundles()[0];
}

function normalizeMode(input?: string): WorkbenchMode {
  const options = getWorkbenchFilterOptions();
  return options.modes.includes(input as WorkbenchMode) ? (input as WorkbenchMode) : "headless";
}

function normalizeImage(input?: string): AgentEditionCloudImage {
  return CLOUD_IMAGES.find((image) => image.id === input) ?? CLOUD_IMAGES[0];
}

export function buildAgentEditionCommands(input: { bundle?: string; mode?: string; channel?: string } = {}) {
  const bundle = normalizeBundle(input.bundle).id;
  const mode = normalizeMode(input.mode);
  const channel = normalizeChannel(input.channel);
  const modeArg = `--mode ${mode}`;
  const bundleArg = `--bundle ${bundle}`;
  const channelArg = `--channel ${channel.id}`;

  return {
    bundle,
    mode,
    channel: channel.id,
    version: channel.version,
    hosted: `curl -fsSL https://freshcrate.ai/api/install/agent-edition | bash -s -- ${bundleArg} ${modeArg} ${channelArg}`,
    local: `bash scripts/bootstrap-agent-edition.sh ${bundleArg} ${modeArg} ${channelArg}`,
    verify: `bash scripts/verify-agent-edition.sh ${bundleArg} ${modeArg} ${channelArg}`,
  };
}

export function getAgentEditionManifestDownload(input: { bundle?: string; mode?: string; channel?: string } = {}): AgentEditionManifestDownload {
  const commands = buildAgentEditionCommands(input);
  const fileName = `freshcrate-agent-edition-${commands.bundle}-${commands.mode}-${commands.channel}.json`;
  const href = `/api/workbench/manifest?bundle=${commands.bundle}&mode=${commands.mode}&channel=${commands.channel}&download=1`;

  return {
    href,
    fileName,
    label: `Download manifest JSON (${fileName})`,
  };
}

export function getAgentEditionImageArtifactDownload(input: {
  artifact: Exclude<AgentEditionArtifactKind, "manifest">;
  bundle?: string;
  mode?: string;
  channel?: string;
  image?: string;
}): AgentEditionManifestDownload {
  const commands = buildAgentEditionCommands(input);
  if (input.artifact === "cloud-init") {
    const fileName = `freshcrate-cloud-init-${commands.bundle}-${commands.mode}-${commands.channel}.yaml`;
    return {
      href: `/api/workbench/cloud-init?artifact=cloud-init&bundle=${commands.bundle}&mode=${commands.mode}&channel=${commands.channel}&download=1`,
      fileName,
      label: `Download cloud-init seed (${fileName})`,
    };
  }

  const image = normalizeImage(input.image);
  const fileName = `freshcrate-image-build-${commands.bundle}-${commands.mode}-${commands.channel}-${image.id}.json`;
  return {
    href: `/api/workbench/image-build?artifact=image-build&bundle=${commands.bundle}&mode=${commands.mode}&channel=${commands.channel}&image=${image.id}&download=1`,
    fileName,
    label: `Download image-build manifest (${fileName})`,
  };
}

export function getAgentEditionImageBuildCommand(input: { bundle?: string; mode?: string; channel?: string; image?: string } = {}): AgentEditionImageBuildCommand {
  const commands = buildAgentEditionCommands(input);
  const image = normalizeImage(input.image);
  const template = `images/${image.id}.pkr.hcl`;
  const scriptPath = "scripts/build-agent-edition-image.sh";
  const validateScriptPath = "scripts/validate-agent-edition-templates.sh";
  const packageScriptPath = "scripts/package-agent-edition-image.sh";

  return {
    script_path: scriptPath,
    validate_script_path: validateScriptPath,
    package_script_path: packageScriptPath,
    template,
    command: `bash ${scriptPath} --image ${image.id} --bundle ${commands.bundle} --mode ${commands.mode} --channel ${commands.channel}`,
    validate_command: `bash ${validateScriptPath}`,
    package_command: `bash ${packageScriptPath} --image ${image.id} --bundle ${commands.bundle} --mode ${commands.mode} --channel ${commands.channel}`,
  };
}

export function getAgentEditionCloudImages(): AgentEditionCloudImage[] {
  return CLOUD_IMAGES;
}

export function getAgentEditionPresetCards() {
  return [
    {
      id: "solo-builder-core",
      title: "Solo Builder",
      summary: "Default lean operator box for one person shipping agents.",
      href: "/install/agent-edition?bundle=solo-builder-core&mode=headless&channel=stable",
    },
    {
      id: "research-node",
      title: "Research Node",
      summary: "Grounded browsing, crawling, and synthesis with optional light desktop.",
      href: "/install/agent-edition?bundle=research-node&mode=light-desktop&channel=stable",
    },
    {
      id: "automation-node",
      title: "Automation Node",
      summary: "Headless-first cron, webhook, and CI execution lane.",
      href: "/install/agent-edition?bundle=automation-node&mode=headless&channel=stable",
    },
    {
      id: "security-ops-node",
      title: "Security Ops",
      summary: "Minimal audit box with isolation and evidence-heavy workflows.",
      href: "/install/agent-edition?bundle=security-ops-node&mode=headless&channel=stable",
    },
  ];
}

export function getAgentEditionManifest(input: { bundle?: string; mode?: string; channel?: string } = {}) {
  const commands = buildAgentEditionCommands(input);
  const bundle = normalizeBundle(commands.bundle);
  const channel = normalizeChannel(commands.channel);

  return {
    schema_version: "1.1.0",
    product: "freshcrate-agent-edition",
    target: bundle.target,
    mode: commands.mode,
    channel,
    commands,
    bundle,
  };
}

export function getAgentEditionImageBuildManifest(input: { bundle?: string; mode?: string; channel?: string; image?: string } = {}): AgentEditionImageBuildManifest {
  const commands = buildAgentEditionCommands(input);
  const bundle = normalizeBundle(commands.bundle);
  const channel = normalizeChannel(commands.channel);
  const image = normalizeImage(input.image);

  const template = `images/${image.id}.pkr.hcl`;
  const cloudInitUrl = `/api/workbench/cloud-init?artifact=cloud-init&bundle=${bundle.id}&mode=${commands.mode}&channel=${channel.id}`;
  const outputDirectory = image.id === "vm-qcow2-headless" ? "output/vm-qcow2-headless" : `output/${image.id}`;
  const artifactBaseName = `freshcrate-${bundle.id}-${channel.id}`;
  const extension = image.id === "vm-qcow2-headless" ? ".qcow2" : image.id === "aws-ami-builder" ? ".ami.txt" : ".docker-image.txt";
  const expectedArtifact = `${outputDirectory}/${artifactBaseName}${extension}`;
  const checksumFile = `${expectedArtifact}.sha256`;

  return {
    artifact: "image-build-manifest",
    schema_version: "1.1.0",
    image,
    bundle,
    channel,
    commands,
    packer: {
      template,
      template_exists: fs.existsSync(path.join(process.cwd(), template)),
      cloud_init_url: cloudInitUrl,
      provisioner_script: "scripts/provision-agent-edition-image.sh",
      bootstrap_script: "scripts/bootstrap-agent-edition.sh",
      verify_script: "scripts/verify-agent-edition.sh",
      output_directory: outputDirectory,
      expected_artifact: expectedArtifact,
      checksum_file: checksumFile,
      package_script: "scripts/package-agent-edition-image.sh",
      publish_ready: image.id === "vm-qcow2-headless",
      base_image: bundle.target,
      output_format: image.format,
      variables: {
        bundle: bundle.id,
        mode: commands.mode,
        channel: channel.id,
        version: channel.version,
        target: bundle.target,
      },
    },
  };
}

export function getAgentEditionPublishedImageArtifact(input: { bundle?: string; mode?: string; channel?: string; image?: string } = {}): AgentEditionPublishedImageArtifact {
  const manifest = getAgentEditionImageBuildManifest(input);
  const artifactPath = path.join(process.cwd(), manifest.packer.expected_artifact);
  const checksumPath = path.join(process.cwd(), manifest.packer.checksum_file);
  const metadataPath = `${artifactPath}.json`;
  const artifactExists = fs.existsSync(artifactPath);
  const checksumExists = fs.existsSync(checksumPath);
  const stat = artifactExists ? fs.statSync(artifactPath) : null;
  const checksum = checksumExists ? fs.readFileSync(checksumPath, "utf8").trim().split(/\s+/)[0] ?? null : null;
  const githubReleaseTag = manifest.image.id === "vm-qcow2-headless" && manifest.channel.id === "stable" ? "agent-edition-vm-qcow2-latest" : null;
  const githubReleasePageUrl = githubReleaseTag ? `https://github.com/sbauwow/freshcrate.ai/releases/tag/${githubReleaseTag}` : null;
  const githubDownloadUrls = githubReleaseTag
    ? {
        artifact: `https://github.com/sbauwow/freshcrate.ai/releases/download/${githubReleaseTag}/${path.basename(manifest.packer.expected_artifact)}`,
        checksum: `https://github.com/sbauwow/freshcrate.ai/releases/download/${githubReleaseTag}/${path.basename(manifest.packer.checksum_file)}`,
        metadata: `https://github.com/sbauwow/freshcrate.ai/releases/download/${githubReleaseTag}/${path.basename(`${manifest.packer.expected_artifact}.json`)}`,
      }
    : null;

  return {
    image: manifest.image.id,
    bundle: manifest.bundle.id,
    mode: manifest.commands.mode,
    channel: manifest.channel.id,
    publish_ready: manifest.packer.publish_ready,
    available: artifactExists,
    output_directory: manifest.packer.output_directory,
    artifact_path: manifest.packer.expected_artifact,
    checksum_path: manifest.packer.checksum_file,
    metadata_path: `${manifest.packer.expected_artifact}.json`,
    sha256: checksum,
    file_size_bytes: stat?.size ?? null,
    updated_at: stat?.mtime.toISOString() ?? null,
    github_release_tag: githubReleaseTag,
    github_release_page_url: githubReleasePageUrl,
    github_download_urls: githubDownloadUrls,
    download_urls: {
      artifact: `/api/workbench/image-artifact?bundle=${manifest.bundle.id}&mode=${manifest.commands.mode}&channel=${manifest.channel.id}&image=${manifest.image.id}&kind=artifact`,
      checksum: `/api/workbench/image-artifact?bundle=${manifest.bundle.id}&mode=${manifest.commands.mode}&channel=${manifest.channel.id}&image=${manifest.image.id}&kind=checksum`,
      metadata: `/api/workbench/image-artifact?bundle=${manifest.bundle.id}&mode=${manifest.commands.mode}&channel=${manifest.channel.id}&image=${manifest.image.id}&kind=metadata`,
    },
  };
}

export function resolveAgentEditionImageArtifactPath(
  input: { bundle?: string; mode?: string; channel?: string; image?: string },
  kind: AgentEditionArtifactDownloadKind = "artifact",
): { path: string; fileName: string; contentType: string } {
  const published = getAgentEditionPublishedImageArtifact(input);
  const absoluteArtifactPath = path.join(process.cwd(), published.artifact_path);
  const absoluteChecksumPath = path.join(process.cwd(), published.checksum_path);
  const absoluteMetadataPath = path.join(process.cwd(), published.metadata_path);

  if (kind === "checksum") {
    return {
      path: absoluteChecksumPath,
      fileName: path.basename(published.checksum_path),
      contentType: "text/plain; charset=utf-8",
    };
  }

  if (kind === "metadata") {
    return {
      path: absoluteMetadataPath,
      fileName: path.basename(published.metadata_path),
      contentType: "application/json; charset=utf-8",
    };
  }

  return {
    path: absoluteArtifactPath,
    fileName: path.basename(published.artifact_path),
    contentType: published.image === "vm-qcow2-headless" ? "application/octet-stream" : "text/plain; charset=utf-8",
  };
}

export function getAgentEditionCloudInitSeed(input: { bundle?: string; mode?: string; channel?: string } = {}) {
  const commands = buildAgentEditionCommands(input);
  const bundle = normalizeBundle(commands.bundle);

  return `#cloud-config
package_update: true
package_upgrade: false
write_files:
  - path: /etc/freshcrate-agent-edition.json
    permissions: '0644'
    content: |
      {"product":"freshcrate-agent-edition","bundle":"${bundle.id}","mode":"${commands.mode}","channel":"${commands.channel}"}
runcmd:
  - [ bash, -lc, "mkdir -p /opt/freshcrate" ]
  - [ bash, -lc, "echo freshcrate-agent-edition > /opt/freshcrate/release" ]
  - [ bash, -lc, "${commands.local}" ]
final_message: "freshcrate-agent-edition ${bundle.id} ${commands.channel} bootstrap queued"
`;
}

export function getAgentEditionComparisonMatrix() {
  const rows = getWorkbenchBundles().map((bundle) => ({
    bundle: bundle.id,
    persona: bundle.persona,
    recommended_mode: bundle.installModes.includes("headless") ? "headless" : bundle.installModes[0],
    default_channel: "stable",
    current_version: normalizeChannel("stable").version,
    includes_ollama: bundle.packages.includes("ollama") || bundle.services.includes("ollama") ? "yes" : "no",
    includes_docker: bundle.services.includes("docker") ? "yes" : "no",
    package_count: String(bundle.packages.length),
    verification_count: String(bundle.verificationChecks.length),
  }));

  return {
    columns: [
      "bundle",
      "persona",
      "recommended_mode",
      "default_channel",
      "current_version",
      "includes_ollama",
      "includes_docker",
      "package_count",
      "verification_count",
    ],
    rows,
  };
}

export function getAgentEditionRecommendations(input: { persona?: string; task?: string } = {}) {
  const persona = input.persona ?? "solo-dev";
  const task = (input.task ?? "").toLowerCase();
  const bundles = getWorkbenchBundles();

  const scored = bundles.map((bundle) => {
    let score = 0;
    if (bundle.persona === persona) score += 5;
    if (task.includes("security") || task.includes("audit") || task.includes("isolate")) {
      if (bundle.id === "security-ops-node") score += 4;
    }
    if (task.includes("research") || task.includes("browse") || task.includes("crawl")) {
      if (bundle.id === "research-node") score += 4;
    }
    if (task.includes("cron") || task.includes("webhook") || task.includes("automation")) {
      if (bundle.id === "automation-node") score += 4;
    }
    if (task.includes("model") || task.includes("gpu") || task.includes("ollama")) {
      if (bundle.id === "local-model-box") score += 4;
    }
    if (task.includes("solo") || task.includes("ship") || task.includes("builder")) {
      if (bundle.id === "solo-builder-core") score += 4;
    }
    return { bundle, score };
  }).sort((a, b) => b.score - a.score || a.bundle.name.localeCompare(b.bundle.name));

  const primary = scored[0]?.bundle ?? bundles[0];
  const alternatives = scored.slice(1, 3).map((entry) => entry.bundle);

  return {
    primary: {
      bundle: primary,
      why: [
        `Best fit for persona: ${primary.persona}`,
        `Recommended mode: ${primary.installModes.includes("headless") ? "headless" : primary.installModes[0]}`,
        primary.summary,
      ],
    },
    alternatives,
  };
}
