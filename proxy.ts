import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js Proxy — runs on matching requests before route handlers.
 * Adds lightweight tracing headers for API traffic.
 *
 * Note: Edge runtime only. Database logging happens inside route handlers.
 */
export function proxy(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();

  response.headers.set("X-Request-Start", start.toString());
  response.headers.set("X-Request-Id", crypto.randomUUID().slice(0, 8));

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
