import { NextRequest, NextResponse } from "next/server";
import { getHostedAgentEditionInstallScript } from "@/lib/workbench-install";
import { logRequest } from "@/lib/request-log";

export function GET(request: NextRequest) {
  const start = Date.now();
  const script = getHostedAgentEditionInstallScript();

  logRequest(request, 200, start);
  return new NextResponse(script, {
    status: 200,
    headers: {
      "content-type": "text/x-shellscript; charset=utf-8",
      "content-disposition": 'inline; filename="agent-edition-install.sh"',
      "cache-control": "public, max-age=300",
    },
  });
}
