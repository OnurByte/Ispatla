import { NextResponse } from "next/server";
import { adminTokenState } from "@/server/security";

/**
 * Protects both server-rendered panel pages and API routes in production.
 * The reverse proxy/session layer must inject this header server-side; it is
 * never placed in the browser bundle.
 */
export function proxy(request: Request): NextResponse {
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const state = adminTokenState(request);
  if (state === "missing") {
    return new NextResponse("ISPATLA_ADMIN_TOKEN must be configured for production access", { status: 503 });
  }
  if (state === "invalid") {
    return new NextResponse("admin authorization required", {
      status: 401,
      headers: { "WWW-Authenticate": "Bearer" },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
