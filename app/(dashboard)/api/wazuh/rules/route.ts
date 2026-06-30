// TODO(replace-when-endpoint-ready): GET /rules
// Browser-facing proxy to Wazuh's ruleset.

import { proxyWazuh } from "@/lib/wazuh/proxy";
import type { WazuhRulesList } from "@/lib/wazuh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["limit", "offset", "level", "group", "search", "status"]);

export async function GET(req: Request): Promise<Response> {
  return proxyWazuh<WazuhRulesList>(req, {
    path: "/rules",
    allowedQuery: ALLOWED,
    emptyOnLocalTest: true
  });
}
