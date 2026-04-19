import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/workbench/recommend/route";

describe("workbench recommend api", () => {
  it("returns a normalized recommendation payload", async () => {
    const request = new NextRequest("https://freshcrate.ai/api/workbench/recommend?persona=security&task=audit+logs+and+isolate+tooling");
    const response = GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.filters.persona).toBe("security");
    expect(data.recommendations.primary.bundle.id).toBe("solo-builder-core");
    expect(data.recommendations.primary.why.length).toBeGreaterThan(0);
    expect(data.recommendations.alternatives.length).toBeGreaterThan(0);
  });
});
