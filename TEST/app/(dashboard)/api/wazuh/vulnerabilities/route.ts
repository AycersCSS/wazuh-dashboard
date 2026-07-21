import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";
import { normalizeVuln } from "@/lib/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["limit", "offset", "severity", "tenant", "agent_id"]);

export async function GET(req: Request): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return proxyConnector(req, {
    path: "/vulnerabilities",
    allowedQuery: ALLOWED,
    transform: (u) => {
      const d = (u as { data?: { affected_items?: unknown[]; total_affected_items?: number } } | null)?.data;
      const raw = Array.isArray(d?.affected_items) ? d!.affected_items! : [];
      const vulnerabilities = raw.map(normalizeVuln);
      return { vulnerabilities, total: d?.total_affected_items ?? vulnerabilities.length };
    },
  });
}
