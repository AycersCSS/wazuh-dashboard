import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "mergeit_portal_session";

/**
 * Edge middleware: keeps the auth gate in the request path so unauthenticated
 * users are redirected to /login before any portal page renders. We don't
 * decrypt the cookie here (would require iron-session in Edge); we only
 * check for its presence. The page layouts do the full validation.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.get(SESSION_COOKIE)?.value;

  // Public routes — always let these through. The portal layout already
  // validates the session and will redirect unauthenticated users to /login.
  // We do NOT redirect /login → / here because a stale/expired cookie would
  // cause an infinite redirect loop between the middleware and layout.
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Static and public assets.
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)"
  ]
};
