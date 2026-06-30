// TODO(replace-when-endpoint-ready): GET /alerts
// Browser-facing proxy to Wazuh's alerts. Whitelists tenant/limit/since/until.

import { proxyWazuh } from "@/lib/wazuh/proxy";
import type { Alert } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["tenant", "limit", "since", "until", "level", "rule_id"]);

export async function GET(req: Request): Promise<Response> {
  return proxyWazuh<{ alerts: Alert[]; total: number }>(req, {
    path: "/alerts",
    allowedQuery: ALLOWED,
    emptyOnLocalTest: true
  });
}
