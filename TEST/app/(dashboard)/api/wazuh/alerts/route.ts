import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";
import { normalizeAlert } from "@/lib/normalize";

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
      const r = (u ?? {}) as {
        critical?: unknown[];
        high?: unknown[];
        warning?: unknown[];
        total?: number;
        alerts?: unknown[];
      };
      const tag = (arr: unknown[] | undefined, bucket: Bucket) =>
        (Array.isArray(arr) ? arr : []).map((a) => normalizeAlert(a, bucket));
      let alerts = [
        ...tag(r.critical, "critical"),
        ...tag(r.high, "high"),
        ...tag(r.warning, "warning"),
      ];
      if (alerts.length === 0 && Array.isArray(r.alerts)) {
        alerts = r.alerts.map((a) => normalizeAlert(a));
      }
      return { alerts, total: typeof r.total === "number" ? r.total : alerts.length };
    },
  });
}
