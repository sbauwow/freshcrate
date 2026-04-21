import { describe, it, expect } from "vitest";
import {
  buildAgentEditionCommands,
  getAgentEditionPresetCards,
  getAgentEditionReleaseChannels,
  getAgentEditionCloudImages,
  getAgentEditionManifestDownload,
  getAgentEditionImageBuildManifest,
  getAgentEditionCloudInitSeed,
  getAgentEditionImageArtifactDownload,
  getAgentEditionImageBuildCommand,
} from "@/lib/workbench-install";
import {
  getAgentEditionPublishedImageArtifact,
  getHostedAgentEditionInstallScript,
  resolveAgentEditionImageArtifactPath,
} from "@/lib/workbench-install-files";

describe("workbench hosted install script", () => {
  it("returns a single-file install script suitable for curl | bash", () => {
    const script = getHostedAgentEditionInstallScript();
    expect(script.startsWith("#!/usr/bin/env bash")).toBe(true);
    expect(script).toContain("parse_common_args");
    expect(script).toContain("Agent Edition v0 supports Ubuntu 24.04 only");
    expect(script).toContain("freshcrate-agent-edition");
    expect(script).not.toContain('source "${SCRIPT_DIR}/lib/bootstrap-common.sh"');
    expect(script).toContain('bash scripts/verify-agent-edition.sh --bundle ${BUNDLE}');
  });

  it("builds bundle-aware hosted and local install commands", () => {
    const commands = buildAgentEditionCommands({ bundle: "research-node", mode: "light-desktop" });
    expect(commands.hosted).toContain("/api/install/agent-edition");
    expect(commands.hosted).toContain("--bundle research-node");
    expect(commands.hosted).toContain("--mode light-desktop");
    expect(commands.hosted).toContain("--channel stable");
    expect(commands.local).toBe("bash scripts/bootstrap-agent-edition.sh --bundle research-node --mode light-desktop --channel stable");
    expect(commands.verify).toBe("bash scripts/verify-agent-edition.sh --bundle research-node --mode light-desktop --channel stable");
  });

  it("falls back to safe defaults for unsupported query values", () => {
    const commands = buildAgentEditionCommands({ bundle: "made-up-bundle", mode: "weird" as never });
    expect(commands.hosted).toContain("--bundle solo-builder-core");
    expect(commands.hosted).toContain("--mode headless");
    expect(commands.hosted).toContain("--channel stable");
    expect(commands.local).toBe("bash scripts/bootstrap-agent-edition.sh --bundle solo-builder-core --mode headless --channel stable");
  });

  it("returns preset cards with stable bundle/mode deep links", () => {
    const presets = getAgentEditionPresetCards();
    expect(presets.length).toBe(3);
    expect(presets.some((preset) => preset.href.includes("bundle=local-model-box"))).toBe(true);
    expect(presets.some((preset) => preset.href.includes("mode=headless"))).toBe(true);
    expect(presets.every((preset) => preset.summary.length > 0)).toBe(true);
  });

  it("exports a machine-readable manifest for the selected bundle", async () => {
    const mod = await import("@/lib/workbench-install");
    const manifest = mod.getAgentEditionManifest({ bundle: "solo-builder-core", mode: "headless" });
    expect(manifest.bundle.id).toBe("solo-builder-core");
    expect(manifest.mode).toBe("headless");
    expect(manifest.commands.hosted).toContain("solo-builder-core");
    expect(manifest.bundle.packages.length).toBeGreaterThan(0);
    expect(manifest.bundle.verificationChecks.length).toBeGreaterThan(0);
  });

  it("builds a comparison matrix across bundles", async () => {
    const mod = await import("@/lib/workbench-install");
    const matrix = mod.getAgentEditionComparisonMatrix();
    expect(matrix.rows.length).toBe(3);
    expect(matrix.columns).toContain("bundle");
    expect(matrix.columns).toContain("persona");
    expect(matrix.columns).toContain("recommended_mode");
    expect(matrix.rows.some((row: { bundle: string }) => row.bundle === "local-model-box")).toBe(true);
  });

  it("recommends bundles by persona and task intent", async () => {
    const mod = await import("@/lib/workbench-install");
    const recommendations = mod.getAgentEditionRecommendations({ persona: "security", task: "audit logs and isolate tooling" });
    expect(recommendations.primary.bundle.id).toBe("solo-builder-core");
    expect(recommendations.primary.why.length).toBeGreaterThan(0);
    expect(recommendations.alternatives.length).toBeGreaterThan(0);
  });

  it("normalizes unsupported channels to stable", () => {
    const fallback = buildAgentEditionCommands({ channel: "weird" as never });
    expect(fallback.channel).toBe("stable");
    expect(fallback.version).toBe("0.1.0");
    expect(fallback.hosted).toContain("--channel stable");
  });

  it("exports deterministic release channels with versions", () => {
    const channels = getAgentEditionReleaseChannels();
    expect(channels.map((channel) => channel.id)).toEqual(["stable"]);
    expect(channels[0]?.version).toBe("0.1.0");
    expect(channels[0]?.risk).toBe("low");
  });

  it("includes release channel details in the manifest", async () => {
    const mod = await import("@/lib/workbench-install");
    const manifest = mod.getAgentEditionManifest({ bundle: "research-node", mode: "light-desktop", channel: "stable" });
    expect(manifest.channel.id).toBe("stable");
    expect(manifest.channel.version).toBe("0.1.0");
    expect(manifest.commands.channel).toBe("stable");
    expect(manifest.bundle.id).toBe("research-node");
  });

  it("builds deterministic manifest download metadata", () => {
    const download = getAgentEditionManifestDownload({ bundle: "solo-builder-core", mode: "headless", channel: "stable" });
    expect(download.fileName).toBe("freshcrate-agent-edition-solo-builder-core-headless-stable.json");
    expect(download.href).toContain("download=1");
    expect(download.href).toContain("channel=stable");
    expect(download.label).toContain("manifest JSON");
  });

  it("exports cloud image roadmap cards", () => {
    const images = getAgentEditionCloudImages();
    expect(images.length).toBeGreaterThanOrEqual(4);
    expect(images.some((image) => image.id === "railway-dev-box")).toBe(true);
    expect(images.some((image) => image.id === "vm-qcow2-headless")).toBe(true);
    expect(images.some((image) => image.id === "iso-autoinstall-headless")).toBe(true);
    expect(images.every((image) => image.status.length > 0)).toBe(true);
  });

  it("builds image-build manifest and artifact download metadata", () => {
    const manifest = getAgentEditionImageBuildManifest({ bundle: "solo-builder-core", mode: "headless", channel: "stable", image: "aws-ami-builder" });
    expect(manifest.artifact).toBe("image-build-manifest");
    expect(manifest.image.id).toBe("aws-ami-builder");
    expect(manifest.bundle.id).toBe("solo-builder-core");
    expect(manifest.packer.variables.channel).toBe("stable");
    expect(manifest.packer.template).toBe("images/aws-ami-builder.pkr.hcl");
    expect(manifest.packer.template_exists).toBe(true);
    expect(manifest.packer.cloud_init_url).toContain("/api/workbench/cloud-init");
    expect(manifest.packer.provisioner_script).toBe("scripts/provision-agent-edition-image.sh");
    expect(manifest.packer.bootstrap_script).toBe("scripts/bootstrap-agent-edition.sh");
    expect(manifest.packer.verify_script).toBe("scripts/verify-agent-edition.sh");

    const download = getAgentEditionImageArtifactDownload({ artifact: "image-build", bundle: "solo-builder-core", mode: "headless", channel: "stable", image: "aws-ami-builder" });
    expect(download.fileName).toBe("freshcrate-image-build-solo-builder-core-headless-stable-aws-ami-builder.json");
    expect(download.href).toContain("artifact=image-build");
    expect(download.href).toContain("image=aws-ami-builder");

    const command = getAgentEditionImageBuildCommand({ bundle: "solo-builder-core", mode: "headless", channel: "stable", image: "aws-ami-builder" });
    expect(command.script_path).toBe("scripts/build-agent-edition-image.sh");
    expect(command.validate_script_path).toBe("scripts/validate-agent-edition-templates.sh");
    expect(command.command).toContain("scripts/build-agent-edition-image.sh");
    expect(command.command).toContain("--image aws-ami-builder");
    expect(command.command).toContain("--channel stable");
    expect(command.template).toBe("images/aws-ami-builder.pkr.hcl");
    expect(command.validate_command).toContain("scripts/validate-agent-edition-templates.sh");

    const template = require("fs").readFileSync("images/aws-ami-builder.pkr.hcl", "utf8");
    expect(template).toContain("provision-agent-edition-image.sh");
    expect(template).toContain("bootstrap-agent-edition.sh");
    expect(template).toContain("verify-agent-edition.sh");
  });

  it("treats vm-qcow2-headless as the first shippable image lane with packaging metadata", () => {
    const manifest = getAgentEditionImageBuildManifest({ bundle: "solo-builder-core", mode: "headless", channel: "stable", image: "vm-qcow2-headless" });
    expect(manifest.image.id).toBe("vm-qcow2-headless");
    expect(manifest.packer.output_directory).toBe("output/vm-qcow2-headless");
    expect(manifest.packer.expected_artifact).toBe("output/vm-qcow2-headless/freshcrate-solo-builder-core-stable.qcow2");
    expect(manifest.packer.checksum_file).toBe("output/vm-qcow2-headless/freshcrate-solo-builder-core-stable.qcow2.sha256");
    expect(manifest.packer.package_script).toBe("scripts/package-agent-edition-image.sh");
    expect(manifest.packer.publish_ready).toBe(true);

    const command = getAgentEditionImageBuildCommand({ bundle: "solo-builder-core", mode: "headless", channel: "stable", image: "vm-qcow2-headless" });
    expect(command.package_script_path).toBe("scripts/package-agent-edition-image.sh");
    expect(command.package_command).toContain("vm-qcow2-headless");
    expect(command.package_command).toContain("--bundle solo-builder-core");
    expect(command.package_command).toContain("--channel stable");

    const published = getAgentEditionPublishedImageArtifact({ bundle: "solo-builder-core", mode: "headless", channel: "stable", image: "vm-qcow2-headless" });
    expect(published.artifact_path).toBe("output/vm-qcow2-headless/freshcrate-solo-builder-core-stable.qcow2");
    expect(published.checksum_path).toBe("output/vm-qcow2-headless/freshcrate-solo-builder-core-stable.qcow2.sha256");
    expect(published.metadata_path).toBe("output/vm-qcow2-headless/freshcrate-solo-builder-core-stable.qcow2.json");
    expect(published.download_urls.metadata).toContain("kind=metadata");
    expect(published.github_release_tag).toBe("agent-edition-vm-qcow2-latest");
    expect(published.github_download_urls?.artifact).toContain("releases/download/agent-edition-vm-qcow2-latest/");
    expect(published.github_download_urls?.artifact).toContain(".qcow2.zip");

    const resolved = resolveAgentEditionImageArtifactPath({ bundle: "solo-builder-core", mode: "headless", channel: "stable", image: "vm-qcow2-headless" }, "artifact");
    expect(resolved.fileName).toBe("freshcrate-solo-builder-core-stable.qcow2");
    expect(resolved.contentType).toBe("application/octet-stream");
  });

  it("treats iso-autoinstall-headless as a publish-ready installer image lane", () => {
    const manifest = getAgentEditionImageBuildManifest({ bundle: "solo-builder-core", mode: "headless", channel: "stable", image: "iso-autoinstall-headless" });
    expect(manifest.image.id).toBe("iso-autoinstall-headless");
    expect(manifest.packer.output_directory).toBe("output/iso-autoinstall-headless");
    expect(manifest.packer.expected_artifact).toBe("output/iso-autoinstall-headless/freshcrate-solo-builder-core-stable.iso");
    expect(manifest.packer.checksum_file).toBe("output/iso-autoinstall-headless/freshcrate-solo-builder-core-stable.iso.sha256");
    expect(manifest.packer.package_script).toBe("scripts/package-agent-edition-image.sh");
    expect(manifest.packer.publish_ready).toBe(true);

    const command = getAgentEditionImageBuildCommand({ bundle: "solo-builder-core", mode: "headless", channel: "stable", image: "iso-autoinstall-headless" });
    expect(command.command).toContain("scripts/build-agent-edition-iso.sh");
    expect(command.package_command).toContain("iso-autoinstall-headless");

    const published = getAgentEditionPublishedImageArtifact({ bundle: "solo-builder-core", mode: "headless", channel: "stable", image: "iso-autoinstall-headless" });
    expect(published.artifact_path).toBe("output/iso-autoinstall-headless/freshcrate-solo-builder-core-stable.iso");
    expect(published.github_release_tag).toBe("agent-edition-iso-latest");
    expect(published.github_download_urls?.artifact).toContain("releases/download/agent-edition-iso-latest/");
    expect(published.github_download_urls?.artifact).toContain(".iso");

    const resolved = resolveAgentEditionImageArtifactPath({ bundle: "solo-builder-core", mode: "headless", channel: "stable", image: "iso-autoinstall-headless" }, "artifact");
    expect(resolved.fileName).toBe("freshcrate-solo-builder-core-stable.iso");
    expect(resolved.contentType).toBe("application/octet-stream");
  });

  it("builds cloud-init seed yaml and download metadata", () => {
    const seed = getAgentEditionCloudInitSeed({ bundle: "research-node", mode: "light-desktop", channel: "stable" });
    expect(seed.startsWith("#cloud-config")).toBe(true);
    expect(seed).toContain("freshcrate-agent-edition");
    expect(seed).toContain("research-node");
    expect(seed).toContain("bash scripts/bootstrap-agent-edition.sh --bundle research-node --mode light-desktop --channel stable");

    const download = getAgentEditionImageArtifactDownload({ artifact: "cloud-init", bundle: "research-node", mode: "light-desktop", channel: "stable" });
    expect(download.fileName).toBe("freshcrate-cloud-init-research-node-light-desktop-stable.yaml");
    expect(download.href).toContain("artifact=cloud-init");
    expect(download.label).toContain("cloud-init");
  });
});
