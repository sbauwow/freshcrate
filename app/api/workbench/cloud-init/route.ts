import { NextRequest, NextResponse } from "next/server";
import { getAgentEditionCloudInitSeed, getAgentEditionImageArtifactDownload } from "@/lib/workbench-install";
import { logRequest } from "@/lib/request-log";

export function GET(request: NextRequest) {
  const start = Date.now();
  const bundle = request.nextUrl.searchParams.get("bundle") || undefined;
  const mode = request.nextUrl.searchParams.get("mode") || undefined;
  const channel = request.nextUrl.searchParams.get("channel") || undefined;
  const downloadRequested = request.nextUrl.searchParams.get("download") === "1";
  const seed = getAgentEditionCloudInitSeed({ bundle, mode, channel });

  logRequest(request, 200, start);

  if (downloadRequested) {
    const download = getAgentEditionImageArtifactDownload({ artifact: "cloud-init", bundle, mode, channel });
    return new NextResponse(seed, {
      headers: {
        "content-type": "text/yaml; charset=utf-8",
        "content-disposition": `attachment; filename="${download.fileName}"`,
      },
    });
  }

  return new NextResponse(seed, {
    headers: {
      "content-type": "text/yaml; charset=utf-8",
    },
  });
}
