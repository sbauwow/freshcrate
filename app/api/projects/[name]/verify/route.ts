import { NextRequest, NextResponse } from "next/server";
import { getProjectByName } from "@/lib/queries";
import { hasApiKeys, extractBearerToken, validateApiKey } from "@/lib/auth";
import { verifyAndStore } from "@/lib/verify";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    // Auth check: if API keys exist, require one
    if (hasApiKeys()) {
      const token = extractBearerToken(request.headers.get("authorization") || "");
      if (!token) {
        return NextResponse.json(
          { error: "Authentication required. Include: Authorization: Bearer <key>" },
          { status: 401 }
        );
      }
      const auth = validateApiKey(token);
      if (!auth.valid) {
        const status = auth.error.includes("Rate limit") ? 429 : 401;
        return NextResponse.json({ error: auth.error }, { status });
      }
    }

    const { name } = await params;
    const project = getProjectByName(name);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const result = await verifyAndStore(project.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
