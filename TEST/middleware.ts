import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.CONNECTOR_JWT_COOKIE ?? "connector_jwt";

// Paths that do not require authentication.
const PUBLIC_PATHS = new Set([
  "/login",
  "/api/connector/auth/login",
  "/api/connector/auth/logout",
  "/api/admin/access",
  "/api/tenant/register",
]);

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and Next.js internals pass through.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const jwt = request.cookies.get(COOKIE_NAME)?.value;
  if (!jwt) {
    // API routes: return 401 JSON.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    // Page routes: redirect to login.
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
