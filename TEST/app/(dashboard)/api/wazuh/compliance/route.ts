import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";
import { normalizeCompliance } from "@/lib/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["framework", "limit", "offset"]);

export async function GET(req: Request): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  const url = new URL(req.url);
  const framework = url.searchParams.get("framework") ?? "pci_dss";
  return proxyConnector(req, {
    path: "/compliance",
    allowedQuery: ALLOWED,
    transform: (u) => normalizeCompliance(u, framework),
  });
}
