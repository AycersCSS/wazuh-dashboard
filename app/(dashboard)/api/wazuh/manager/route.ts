// TODO(replace-when-endpoint-ready): GET /manager/status + /cluster/health
// Used by Settings → Cluster card. Combines manager identity, worker count,
// indexer info, and API p95 latency.

import { proxyWazuh } from "@/lib/wazuh/proxy";
import type { WazuhClusterStatus } from "@/lib/wazuh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  return proxyWazuh<WazuhClusterStatus>(req, {
    path: "/manager/status",
    allowedQuery: new Set(),
    emptyOnLocalTest: true
  });
}
