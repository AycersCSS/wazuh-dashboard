import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireSession, type ResolvedSession } from "@/lib/auth";
import type { TenantContext } from "@/lib/wazuh/client";

export interface TenantRow {
  id: string;
  name: string;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
}

export function getTenantRow(tenantId: string): TenantRow | null {
  const db = getDb();
  const row = db.prepare("SELECT id, name, tier FROM tenants WHERE id = ?").get(tenantId) as
    | TenantRow | undefined;
  return row ?? null;
}

/**
 * Wraps a handler that needs an authenticated session. Returns a JSON
 * 401/403 response on failure, otherwise invokes the handler with the
 * resolved session and tenant context.
 */
export async function withSession(
  handler: (session: ResolvedSession, ctx: TenantContext) => Promise<NextResponse>
): Promise<NextResponse> {
  let session: ResolvedSession;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  const row = getTenantRow(session.tenantId);
  if (!row) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 403 });
  }
  return handler(session, { id: row.id, name: row.name, tier: row.tier });
}
