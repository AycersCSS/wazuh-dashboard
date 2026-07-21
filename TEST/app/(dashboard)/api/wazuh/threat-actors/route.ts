import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";
import { normalizeThreatActor } from "@/lib/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["limit", "offset", "sector", "region"]);

export async function GET(req: Request): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return proxyConnector(req, {
    path: "/threat-actors",
    allowedQuery: ALLOWED,
    transform: (u) => {
      const body = (u ?? {}) as { actors?: unknown[]; total?: number };
      const raw = Array.isArray(body.actors) ? body.actors : [];
      const actors = raw.map(normalizeThreatActor);
      return { actors, total: typeof body.total === "number" ? body.total : actors.length };
    },
  });
}
