// TODO(replace-when-endpoint-ready): GET /experimental/syscheck
// Browser-facing proxy to Wazuh's FIM (syscheck) events.

import { proxyWazuh } from "@/lib/wazuh/proxy";
import type { WazuhFimList } from "@/lib/wazuh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["limit", "offset", "agent_id", "path", "action"]);

export async function GET(req: Request): Promise<Response> {
  return proxyWazuh<WazuhFimList>(req, {
    path: "/experimental/syscheck",
    allowedQuery: ALLOWED,
    emptyOnLocalTest: true
  });
}
