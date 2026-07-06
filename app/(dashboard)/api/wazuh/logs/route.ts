// Browser-facing proxy to the connector's /logs.
// The connector returns Wazuh /manager/logs body ({data: {affected_items}});
// flatten to {entries, total}.

import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["limit", "offset"]);

export async function GET(req: Request): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return proxyConnector(req, {
    path: "/logs",
    allowedQuery: ALLOWED,
    transform: (u) => {
      const d = (u as { data?: { affected_items?: unknown[]; total_affected_items?: number } } | null)?.data;
      return { entries: d?.affected_items ?? [], total: d?.total_affected_items ?? 0 };
    }
  });
}
