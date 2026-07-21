import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";
import { normalizeRule } from "@/lib/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["limit", "offset", "level", "group", "search", "status"]);

export async function GET(req: Request): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return proxyConnector(req, {
    path: "/rules",
    allowedQuery: ALLOWED,
    transform: (u) => {
      const d = (u as { data?: { affected_items?: unknown[]; total_affected_items?: number } } | null)?.data;
      const raw = Array.isArray(d?.affected_items) ? d!.affected_items! : [];
      const rules = raw.map(normalizeRule);
      return { rules, total: d?.total_affected_items ?? rules.length };
    },
  });
}
