// MITRE coverage. Wazuh has no first-class mitre endpoint; the connector
// could either aggregate from /security/alerts or call a MergeIT platform
// endpoint. Until the connector exposes this, the page will derive the
// matrix from the live alerts list (see /app/(dashboard)/mitre/page.tsx).
// This proxy is reserved for when the connector does ship /mitre.

import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["since", "until", "tenant"]);

export async function GET(req: Request): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return proxyConnector(req, { path: "/mitre", allowedQuery: ALLOWED });
}
