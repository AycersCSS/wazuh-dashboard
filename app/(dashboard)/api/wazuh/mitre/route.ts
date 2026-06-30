// TODO(replace-when-endpoint-ready): GET /experimental/mitre
// Coverage heatmap. Wazuh does not have a first-class mitre endpoint; in
// practice this aggregates the last-24h alerts and groups by mitre id.

import { proxyWazuh } from "@/lib/wazuh/proxy";
import type { WazuhMitreCoverage } from "@/lib/wazuh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["since", "until", "tenant"]);

export async function GET(req: Request): Promise<Response> {
  return proxyWazuh<WazuhMitreCoverage>(req, {
    path: "/experimental/mitre",
    allowedQuery: ALLOWED,
    emptyOnLocalTest: true
  });
}
