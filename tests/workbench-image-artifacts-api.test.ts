import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as GET_IMAGE_BUILD } from "@/app/api/workbench/image-build/route";
import { GET as GET_CLOUD_INIT } from "@/app/api/workbench/cloud-init/route";

describe("workbench image artifact apis", () => {
  it("returns image-build manifest json with attachment headers", async () => {
    const request = new NextRequest("https://freshcrate.ai/api/workbench/image-build?bundle=solo-builder-core&mode=headless&channel=beta&image=aws-ami-builder&download=1");
    const response = GET_IMAGE_BUILD(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toContain("freshcrate-image-build-solo-builder-core-headless-beta-aws-ami-builder.json");

    const data = await response.json();
    expect(data.artifact).toBe("image-build-manifest");
    expect(data.image.id).toBe("aws-ami-builder");
  });

  it("returns cloud-init yaml with attachment headers", async () => {
    const request = new NextRequest("https://freshcrate.ai/api/workbench/cloud-init?bundle=research-node&mode=light-desktop&channel=stable&download=1");
    const response = GET_CLOUD_INIT(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/yaml");
    expect(response.headers.get("content-disposition")).toContain("freshcrate-cloud-init-research-node-light-desktop-stable.yaml");

    const text = await response.text();
    expect(text.startsWith("#cloud-config")).toBe(true);
    expect(text).toContain("research-node");
  });
});
