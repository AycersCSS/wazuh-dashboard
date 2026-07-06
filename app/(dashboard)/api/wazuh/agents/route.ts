// Browser-facing proxy to the connector's /agents.
// The connector returns the Wazuh body shape ({data: {affected_items,
// total_affected_items}}); we flatten to {agents, total} for the page.

import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["limit", "offset", "status", "group", "search"]);

export async function GET(req: Request): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return proxyConnector(req, {
    path: "/agents",
    allowedQuery: ALLOWED,
    transform: (u) => {
      const d = (u as { data?: { affected_items?: unknown[]; total_affected_items?: number } } | null)?.data;
      return { agents: d?.affected_items ?? [], total: d?.total_affected_items ?? 0 };
    }
  });
}
