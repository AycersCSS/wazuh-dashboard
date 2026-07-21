import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";
import { normalizeIntegration } from "@/lib/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWN_IDS = new Set([
  "microsoft-365",
  "ninjaone",
  "bitdefender",
  "cyber-essentials",
  "customer-portal",
]);

export async function GET(
  req: Request,
  ctx: { params: { id: string } }
): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  const id = ctx.params.id;
  if (!KNOWN_IDS.has(id)) {
    return NextResponse.json({ ok: false, error: "unknown_integration", id }, { status: 404 });
  }
  return proxyConnector(req, {
    path: `/integrations/${id}`,
    transform: (u) => normalizeIntegration(u, id),
  });
}
