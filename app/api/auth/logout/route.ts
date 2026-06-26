import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  const userId   = session.userId;
  const tenantId = session.tenantId;
  await clearSession();
  if (userId && tenantId) {
    auditLog({ userId, tenantId, action: "logout", status: "success" });
  }
  return NextResponse.json({ ok: true });
}
