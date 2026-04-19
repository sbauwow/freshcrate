import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/workbench/manifest/route";

describe("workbench manifest api", () => {
  it("returns a normalized manifest with release channel metadata", async () => {
    const request = new NextRequest("https://freshcrate.ai/api/workbench/manifest?bundle=research-node&mode=light-desktop&channel=beta");
    const response = GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.bundle.id).toBe("research-node");
    expect(data.mode).toBe("light-desktop");
    expect(data.channel.id).toBe("beta");
    expect(data.channel.version).toBe("0.2.0-beta");
    expect(data.commands.hosted).toContain("--channel beta");
  });

  it("returns downloadable json attachment headers when requested", async () => {
    const request = new NextRequest("https://freshcrate.ai/api/workbench/manifest?bundle=solo-builder-core&mode=headless&channel=stable&download=1");
    const response = GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toContain("attachment;");
    expect(response.headers.get("content-disposition")).toContain("freshcrate-agent-edition-solo-builder-core-headless-stable.json");

    const data = await response.json();
    expect(data.bundle.id).toBe("solo-builder-core");
  });
});
