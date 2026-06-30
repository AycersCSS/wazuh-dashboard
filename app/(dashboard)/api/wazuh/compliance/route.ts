// TODO(replace-when-endpoint-ready): GET /compliance/:framework
// Browser-facing proxy to Wazuh's compliance endpoints. The framework is
// passed as a path segment; the client-side caller supplies one of the
// supported frameworks (PCI DSS, HIPAA, GDPR, NIST 800-53, ISO 27001).

import { proxyWazuh } from "@/lib/wazuh/proxy";
import type { WazuhComplianceList } from "@/lib/wazuh/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["tenant", "agent_id"]);
const ALLOWED_FRAMEWORKS = new Set(["pci_dss", "hipaa", "gdpr", "nist_800-53", "iso_27001"]);

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const fw = url.searchParams.get("framework") ?? "pci_dss";
  if (!ALLOWED_FRAMEWORKS.has(fw)) {
    return new Response(JSON.stringify({ ok: false, error: "unsupported_framework" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }
  return proxyWazuh<WazuhComplianceList>(req, {
    path: `/compliance/${fw}`,
    allowedQuery: ALLOWED,
    emptyOnLocalTest: true
  });
}
