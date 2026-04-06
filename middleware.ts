import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js Edge Middleware — runs on every request.
 * Logs API requests and adds timing headers.
 *
 * Note: This runs in the Edge Runtime, so no direct SQLite access.
 * Request logging to DB happens in the API routes themselves.
 */
export function middleware(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();

  // Add server timing header
  response.headers.set("X-Request-Start", start.toString());

  // Add request ID for tracing
  const requestId = crypto.randomUUID().slice(0, 8);
  response.headers.set("X-Request-Id", requestId);

  return response;
}

export const config = {
  // Only run on API routes — don't slow down page renders
  matcher: "/api/:path*",
};
