// TODO(replace-when-endpoint-ready): GET /threat-intel/actors
// Threat-actor feed. Wazuh itself has no actor concept; the MergeIT
// platform tracks the intel list and exposes it through the connector.

import { proxyWazuh } from "@/lib/wazuh/proxy";
import type { WazuhThreatActor } from "@/lib/wazuh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["limit", "offset", "sector", "region"]);

export async function GET(req: Request): Promise<Response> {
  return proxyWazuh<{ actors: WazuhThreatActor[]; total: number }>(req, {
    path: "/threat-intel/actors",
    allowedQuery: ALLOWED,
    emptyOnLocalTest: true
  });
}
