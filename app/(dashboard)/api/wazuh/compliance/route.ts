// Browser-facing proxy to the connector's /compliance?framework=<fw>.
// Allowed frameworks: pci_dss, hipaa, gdpr, nist_800-53, iso_27001.

import { isAuthenticated, proxyConnector } from "@/lib/connector/proxy";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["framework", "limit", "offset"]);

export async function GET(req: Request): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return proxyConnector(req, { path: "/compliance", allowedQuery: ALLOWED });
}
