import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.CONNECTOR_JWT_COOKIE ?? "connector_jwt";

// Paths that do not require authentication.
const PUBLIC_PATHS = new Set([
  "/login",
  "/api/connector/auth/login",
  "/api/connector/auth/logout",
]);

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

/**
 * Lightweight JWT validation — no crypto verify (we don't have the secret
 * in middleware; the connector owns signature verification). We guard
 * against forged/empty tokens by:
 *   1. Requiring three dot-separated base64url segments.
 *   2. Decoding the payload and rejecting tokens whose `exp` has passed.
 *
 * This is defence-in-depth: the connector will still reject an invalid
 * signature on every proxied request, but this stops obviously forged or
 * expired cookies from even reaching the dashboard pages.
 */
function isTokenStructurallyValid(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Pad the base64url segment before decoding.
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded.padEnd(padded.length + (4 - (padded.length % 4)) % 4, "="));
    const payload = JSON.parse(json) as Record<string, unknown>;

    // Reject expired tokens.
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
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

  if (!jwt || !isTokenStructurallyValid(jwt)) {
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
