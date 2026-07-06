// Browser-facing proxy to the connector's /integrations/<id>.
// Only the 5 known integration ids are forwarded; anything else is rejected
// to prevent path traversal.
//
// The connector returns 503 {ok: false, error: "not_connected", id} for any
// valid id until the data plane populates it.

import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KNOWN_IDS = new Set([
  "aws",
  "azure",
  "gcp",
  "office365",
  "okta"
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
  return proxyConnector(req, { path: `/integrations/${id}` });
}
