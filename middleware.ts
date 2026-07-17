import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Cheap cookie-presence gate; real session validation happens server-side in
// lib/auth. Keeps unauthenticated visitors off app pages without a DB hit.
const PUBLIC = ["/login", "/api/login", "/api/health"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (!req.cookies.get("bidsys_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
