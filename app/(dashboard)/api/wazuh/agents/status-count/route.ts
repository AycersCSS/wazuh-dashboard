// TODO(replace-when-endpoint-ready): GET /agents/summary/status
// Aggregated active/disconnected/pending/never_connected counts.

import { proxyWazuh } from "@/lib/wazuh/proxy";
import type { WazuhAgentStatusCount } from "@/lib/wazuh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["tenant"]);

export async function GET(req: Request): Promise<Response> {
  return proxyWazuh<WazuhAgentStatusCount>(req, {
    path: "/agents/summary/status",
    allowedQuery: ALLOWED,
    emptyOnLocalTest: true
  });
}
