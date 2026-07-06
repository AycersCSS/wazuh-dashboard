// Aggregated active/disconnected/pending/never_connected counts.
// The connector derives this with 4 scoped Wazuh calls and returns
// { active, disconnected, pending, never_connected }.

import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return proxyConnector(req, { path: "/agents/status-count" });
}
