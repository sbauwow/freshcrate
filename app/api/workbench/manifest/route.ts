import { NextRequest, NextResponse } from "next/server";
import { getAgentEditionManifest, getAgentEditionManifestDownload } from "@/lib/workbench-install";
import { logRequest } from "@/lib/request-log";

export function GET(request: NextRequest) {
  const start = Date.now();
  const bundle = request.nextUrl.searchParams.get("bundle") || undefined;
  const mode = request.nextUrl.searchParams.get("mode") || undefined;
  const channel = request.nextUrl.searchParams.get("channel") || undefined;
  const downloadRequested = request.nextUrl.searchParams.get("download") === "1";
  const manifest = getAgentEditionManifest({ bundle, mode, channel });

  logRequest(request, 200, start);

  if (downloadRequested) {
    const download = getAgentEditionManifestDownload({ bundle, mode, channel });
    return NextResponse.json(manifest, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${download.fileName}"`,
      },
    });
  }

  return NextResponse.json(manifest);
}
