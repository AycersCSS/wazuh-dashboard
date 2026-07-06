// Browser-facing proxy to the connector's /manager.
// Returns { manager, workers: {total, active}, indexer: {name, version},
// apiLatencyP95Ms } — the connector combines three Wazuh calls.

import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return proxyConnector(req, { path: "/manager" });
}
