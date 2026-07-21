import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whitelist: keys we forward to the connector's /stats/agents.
// The connector's `_get_request_context` resolves the tenant from the
// customer JWT, so an attacker-supplied `tenant` here is ignored upstream.
const ALLOWED = new Set(["status"]);

export async function GET(req: Request): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return proxyConnector(req, { path: "/stats/agents", allowedQuery: ALLOWED });
}
