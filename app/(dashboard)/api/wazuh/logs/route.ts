// TODO(replace-when-endpoint-ready): GET /logs/archives
// Recent Wazuh archived log entries. Powers the Logs page's virtualized list.

import { proxyWazuh } from "@/lib/wazuh/proxy";
import type { WazuhLogEntry } from "@/lib/wazuh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["limit", "offset", "source", "level", "since", "until"]);

export async function GET(req: Request): Promise<Response> {
  return proxyWazuh<{ entries: WazuhLogEntry[]; total: number }>(req, {
    path: "/logs/archives",
    allowedQuery: ALLOWED,
    emptyOnLocalTest: true
  });
}
