import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { getSession, setSession, type PortalSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

interface Body { email?: unknown; code?: unknown; }

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code  = typeof body.code === "string"  ? body.code.trim() : "";
  if (!email || !code) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 400 });
  }

  const result = verifyOtp(email, code);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 401 });
  }

  const db = getDb();
  const user = db.prepare(
    "SELECT id, email, name, tenant_id, role FROM users WHERE email = ?"
  ).get(email) as
    | { id: string; email: string; name: string; tenant_id: string; role: "admin" | "analyst" | "viewer" }
    | undefined;
  if (!user) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 401 });
  }

  const session = await getSession();
  const data: PortalSession = {
    userId:   user.id,
    email:    user.email,
    name:     user.name,
    tenantId: user.tenant_id,
    role:     user.role
  };
  setSession(session, data);
  await session.save();

  auditLog({
    userId:   user.id,
    tenantId: user.tenant_id,
    action:   "login",
    status:   "success"
  });

  return NextResponse.json({ ok: true, name: user.name });
}
