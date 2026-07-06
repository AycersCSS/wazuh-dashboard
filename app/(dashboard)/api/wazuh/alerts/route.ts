// Browser-facing proxy to the connector's /alerts.
// The connector returns bucketed alerts ({critical, high, warning, total}).
// The page reads a single flat array; concat the buckets and tag each item
// with its severity bucket for the column.

import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["tenant", "limit", "since", "until", "level", "rule_id", "time_range"]);

type Bucket = "critical" | "high" | "warning";

export async function GET(req: Request): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return proxyConnector(req, {
    path: "/alerts",
    allowedQuery: ALLOWED,
    transform: (u) => {
      const r = (u ?? {}) as { critical?: unknown[]; high?: unknown[]; warning?: unknown[]; total?: number };
      const tag = (arr: unknown[] | undefined, bucket: Bucket) =>
        (arr ?? []).map((a) => ({ ...(a as object), _bucket: bucket }));
      const alerts = [
        ...tag(r.critical, "critical"),
        ...tag(r.high, "high"),
        ...tag(r.warning, "warning")
      ];
      return { alerts, total: r.total ?? alerts.length };
    }
  });
}
