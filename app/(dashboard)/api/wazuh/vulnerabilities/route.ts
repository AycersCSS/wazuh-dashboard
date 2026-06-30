// TODO(replace-when-endpoint-ready): GET /vulnerability
// Browser-facing proxy to Wazuh's vulnerability detector.

import { proxyWazuh } from "@/lib/wazuh/proxy";
import type { WazuhVulnerabilitiesList } from "@/lib/wazuh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["limit", "offset", "severity", "tenant", "agent_id"]);

export async function GET(req: Request): Promise<Response> {
  return proxyWazuh<WazuhVulnerabilitiesList>(req, {
    path: "/vulnerability",
    allowedQuery: ALLOWED,
    emptyOnLocalTest: true
  });
}
