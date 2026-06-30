// TODO(replace-when-endpoint-ready): GET /agents
// Browser-facing proxy to Wazuh's agents list. Local-test tokens return an
// empty data shape so the Agents page renders its empty state.

import { proxyWazuh } from "@/lib/wazuh/proxy";
import type { WazuhAgentsList } from "@/lib/wazuh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["limit", "offset", "status", "os", "group", "search"]);

export async function GET(req: Request): Promise<Response> {
  return proxyWazuh<WazuhAgentsList>(req, {
    path: "/agents",
    allowedQuery: ALLOWED,
    emptyOnLocalTest: true
  });
}
