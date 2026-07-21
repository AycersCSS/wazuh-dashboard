import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";
import { asNumber } from "@/lib/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return proxyConnector(req, {
    path: "/agents/status-count",
    transform: (u) => {
      const b = (u ?? {}) as Record<string, unknown>;
      return {
        active: asNumber(b.active, 0),
        disconnected: asNumber(b.disconnected, 0),
        pending: asNumber(b.pending, 0),
        never_connected: asNumber(b.never_connected, 0),
      };
    },
  });
}
