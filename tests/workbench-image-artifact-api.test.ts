import { beforeEach, afterEach, describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { NextRequest } from "next/server";
import { GET as GET_IMAGE_ARTIFACT } from "@/app/api/workbench/image-artifact/route";

const outputDir = path.join(process.cwd(), "output", "vm-qcow2-headless");
const artifactPath = path.join(outputDir, "freshcrate-solo-builder-core-stable.qcow2");
const checksumPath = `${artifactPath}.sha256`;
const metadataPath = `${artifactPath}.json`;

function cleanup() {
  for (const file of [artifactPath, checksumPath, metadataPath]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

describe("workbench image artifact api", () => {
  beforeEach(() => {
    fs.mkdirSync(outputDir, { recursive: true });
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it("returns live artifact status json when no built artifact exists", async () => {
    const request = new NextRequest("https://freshcrate.ai/api/workbench/image-artifact?bundle=solo-builder-core&mode=headless&channel=stable&image=vm-qcow2-headless");
    const response = GET_IMAGE_ARTIFACT(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.available).toBe(false);
    expect(data.publish_ready).toBe(true);
    expect(data.artifact_path).toBe("output/vm-qcow2-headless/freshcrate-solo-builder-core-stable.qcow2");
  });

  it("downloads built metadata sidecar when present", async () => {
    fs.writeFileSync(artifactPath, "freshcrate-vm-image");
    fs.writeFileSync(checksumPath, "abc123  freshcrate-solo-builder-core-stable.qcow2\n");
    fs.writeFileSync(metadataPath, JSON.stringify({ sha256: "abc123", file_size_bytes: 19 }));

    const request = new NextRequest("https://freshcrate.ai/api/workbench/image-artifact?bundle=solo-builder-core&mode=headless&channel=stable&image=vm-qcow2-headless&kind=metadata&download=1");
    const response = GET_IMAGE_ARTIFACT(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("freshcrate-solo-builder-core-stable.qcow2.json");
    expect(response.headers.get("content-type")).toContain("application/json");

    const text = await response.text();
    expect(text).toContain("abc123");
  });

  it("returns 404 for download requests when artifact file is missing", async () => {
    const request = new NextRequest("https://freshcrate.ai/api/workbench/image-artifact?bundle=solo-builder-core&mode=headless&channel=stable&image=vm-qcow2-headless&download=1");
    const response = GET_IMAGE_ARTIFACT(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("artifact_not_built");
    expect(data.published.available).toBe(false);
  });
});
