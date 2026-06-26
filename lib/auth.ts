import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

export interface PortalSession {
  userId?: string;
  email?: string;
  name?: string;
  tenantId?: string;
  role?: "admin" | "analyst" | "viewer";
  exp?: number;
}

export interface ResolvedSession {
  userId: string;
  email: string;
  name: string;
  tenantId: string;
  role: "admin" | "analyst" | "viewer";
}

const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function getCookiePassword(): string {
  const pw = process.env.PORTAL_COOKIE_PASSWORD;
  if (!pw || pw.length < 32) {
    throw new Error(
      "PORTAL_COOKIE_PASSWORD is missing or shorter than 32 characters. See .env.local.example."
    );
  }
  return pw;
}

const baseOptions: SessionOptions = {
  password: "",
  cookieName: "mergeit_portal_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  }
};

export function getSessionOptions(): SessionOptions {
  return { ...baseOptions, password: getCookiePassword() };
}

export async function getSession(): Promise<IronSession<PortalSession>> {
  return getIronSession<PortalSession>(cookies(), getSessionOptions());
}

export function setSession(session: IronSession<PortalSession>, data: PortalSession): void {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  session.userId = data.userId;
  session.email  = data.email;
  session.name   = data.name;
  session.tenantId = data.tenantId;
  session.role   = data.role;
  session.exp    = exp;
}

export async function clearSession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

/**
 * Reads the session cookie, validates expiration, and confirms the user
 * still exists in the database. Returns null if anything is invalid.
 *
 * We hit the DB on every protected call to support user deletion/role
 * changes taking effect immediately (no waiting for token expiry).
 */
export async function requireSession(): Promise<ResolvedSession> {
  const session = await getSession();
  if (!session.userId || !session.tenantId || !session.email || !session.role) {
    throw new SessionError("unauthenticated");
  }
  if (session.exp && session.exp * 1000 < Date.now()) {
    // Don't call session.destroy() here — it mutates cookies, which is only
    // allowed in Route Handlers / Server Actions.  The caller (layout /
    // withSession) handles the redirect / 401 response, and the stale cookie
    // will be overwritten on next successful login or via the logout endpoint.
    throw new SessionError("expired");
  }
  // Verify the user still exists and matches the session claims.
  const db = getDb();
  const row = db
    .prepare("SELECT id, email, name, tenant_id, role FROM users WHERE id = ?")
    .get(session.userId) as
    | { id: string; email: string; name: string; tenant_id: string; role: string }
    | undefined;
  if (!row) throw new SessionError("unauthenticated");
  if (row.email !== session.email || row.tenant_id !== session.tenantId) {
    throw new SessionError("mismatch");
  }
  return {
    userId:   row.id,
    email:    row.email,
    name:     row.name,
    tenantId: row.tenant_id,
    role:     row.role as ResolvedSession["role"]
  };
}

export class SessionError extends Error {
  readonly code: "unauthenticated" | "expired" | "mismatch";
  constructor(code: "unauthenticated" | "expired" | "mismatch") {
    super(code);
    this.code = code;
    this.name = "SessionError";
  }
}
