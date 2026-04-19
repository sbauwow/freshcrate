import * as fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { type AgentEditionArtifactDownloadKind } from "@/lib/workbench-install";
import { getAgentEditionPublishedImageArtifact, resolveAgentEditionImageArtifactPath } from "@/lib/workbench-install-files";
import { logRequest } from "@/lib/request-log";

export function GET(request: NextRequest) {
  const start = Date.now();
  const bundle = request.nextUrl.searchParams.get("bundle") || undefined;
  const mode = request.nextUrl.searchParams.get("mode") || undefined;
  const channel = request.nextUrl.searchParams.get("channel") || undefined;
  const image = request.nextUrl.searchParams.get("image") || undefined;
  const kind = (request.nextUrl.searchParams.get("kind") as AgentEditionArtifactDownloadKind | null) ?? "artifact";
  const published = getAgentEditionPublishedImageArtifact({ bundle, mode, channel, image });

  if (request.nextUrl.searchParams.get("download") !== "1") {
    logRequest(request, 200, start);
    return NextResponse.json(published);
  }

  const resolved = resolveAgentEditionImageArtifactPath({ bundle, mode, channel, image }, kind);
  if (!fs.existsSync(resolved.path)) {
    logRequest(request, 404, start);
    return NextResponse.json(
      {
        error: "artifact_not_built",
        kind,
        published,
      },
      { status: 404 },
    );
  }

  const body = fs.readFileSync(resolved.path);
  logRequest(request, 200, start);
  return new NextResponse(body, {
    headers: {
      "content-type": resolved.contentType,
      "content-disposition": `attachment; filename="${resolved.fileName}"`,
    },
  });
}
