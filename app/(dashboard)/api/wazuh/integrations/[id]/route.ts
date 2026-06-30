// TODO(replace-when-endpoint-ready): GET /integrations/:id
// Per-integration health + KPIs + recent events. id is one of:
// microsoft-365, ninjaone, bitdefender, cyber-essentials, customer-portal.
//
// When the upstream endpoint is not configured (e.g. the platform hasn't
// provisioned that integration yet), the page renders an explicit
// "Not connected" state. The proxy does NOT return a hardcoded success
// payload — it returns 503 + error code so the UI surfaces the real
// status to the user.

import { NextResponse } from "next/server";
import { proxyWazuh, isAuthenticated, isLocalTestToken } from "@/lib/wazuh/proxy";
import type { WazuhIntegrationHealth } from "@/lib/wazuh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_IDS = new Set([
  "microsoft-365",
  "ninjaone",
  "bitdefender",
  "cyber-essentials",
  "customer-portal"
]);

export async function GET(req: Request, ctx: { params: { id: string } }): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  if (!ALLOWED_IDS.has(ctx.params.id)) {
    return NextResponse.json({ ok: false, error: "unsupported_integration" }, { status: 400 });
  }

  // Local-test token: the real upstream is unreachable, so the integration
  // is by definition not connected. Return an explicit 503 so the page
  // renders the "Not connected" state instead of fake Connected badges.
  if (isLocalTestToken()) {
    return NextResponse.json(
      { ok: false, error: "not_connected", id: ctx.params.id, mode: "local-test" },
      { status: 503 }
    );
  }

  return proxyWazuh<WazuhIntegrationHealth>(req, {
    path: `/integrations/${ctx.params.id}`,
    allowedQuery: new Set(),
    emptyOnLocalTest: false
  });
}
