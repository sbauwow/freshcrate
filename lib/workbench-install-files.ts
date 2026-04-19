import * as fs from "node:fs";
import * as path from "node:path";
import {
  getAgentEditionImageBuildManifest,
  type AgentEditionArtifactDownloadKind,
  type AgentEditionPublishedImageArtifact,
} from "@/lib/workbench-install";

const scriptsRoot = path.join(/*turbopackIgnore: true*/ process.cwd(), "scripts");
const bootstrapCommonPath = path.join(scriptsRoot, "lib", "bootstrap-common.sh");
const bootstrapScriptPath = path.join(scriptsRoot, "bootstrap-agent-edition.sh");

export function getHostedAgentEditionInstallScript(): string {
  const common = fs.readFileSync(bootstrapCommonPath, "utf8").trim();
  const bootstrapLines = fs.readFileSync(bootstrapScriptPath, "utf8").trim().split("\n");
  const bootstrap = bootstrapLines.slice(6).join("\n").trim();

  return `${common}\n\n${bootstrap}\n`;
}

export function getAgentEditionPublishedImageArtifact(input: { bundle?: string; mode?: string; channel?: string; image?: string } = {}): AgentEditionPublishedImageArtifact {
  const manifest = getAgentEditionImageBuildManifest(input);
  const artifactPath = path.join(/*turbopackIgnore: true*/ process.cwd(), manifest.packer.expected_artifact);
  const checksumPath = path.join(/*turbopackIgnore: true*/ process.cwd(), manifest.packer.checksum_file);
  const artifactExists = fs.existsSync(artifactPath);
  const checksumExists = fs.existsSync(checksumPath);
  const stat = artifactExists ? fs.statSync(artifactPath) : null;
  const checksum = checksumExists ? fs.readFileSync(checksumPath, "utf8").trim().split(/\s+/)[0] ?? null : null;
  const githubReleaseTag = manifest.image.id === "vm-qcow2-headless" && manifest.channel.id === "stable"
    ? "agent-edition-vm-qcow2-latest"
    : manifest.image.id === "iso-autoinstall-headless" && manifest.channel.id === "stable"
      ? "agent-edition-iso-latest"
      : null;
  const githubReleasePageUrl = githubReleaseTag ? `https://github.com/sbauwow/freshcrate.ai/releases/tag/${githubReleaseTag}` : null;
  const githubDownloadUrls = githubReleaseTag
    ? {
        artifact: `https://github.com/sbauwow/freshcrate.ai/releases/download/${githubReleaseTag}/${path.basename(manifest.packer.expected_artifact)}.zip`,
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
  const absoluteArtifactPath = path.join(/*turbopackIgnore: true*/ process.cwd(), published.artifact_path);
  const absoluteChecksumPath = path.join(/*turbopackIgnore: true*/ process.cwd(), published.checksum_path);
  const absoluteMetadataPath = path.join(/*turbopackIgnore: true*/ process.cwd(), published.metadata_path);

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
    contentType: published.image === "vm-qcow2-headless" || published.image === "iso-autoinstall-headless" ? "application/octet-stream" : "text/plain; charset=utf-8",
  };
}
