"use client";
import { Drawer, Button, Badge, Tabs } from "@/components/ui";
import { useToasts } from "@/hooks/useToasts";
import { useSetVulnStatus, vulnStatus } from "@/hooks/useAlertsStore";
import { useAudit } from "@/hooks/useAudit";
import { useWazuhResource, buildPath } from "@/lib/wazuh";
import type { VulnState, Vulnerability, Agent } from "@/types";
import Link from "next/link";

const NEXT: Record<VulnState, VulnState | null> = {
  open: "in_progress", in_progress: "patched", patched: null, wont_fix: null
};

export function VulnDrawer({ cve, open, onClose }: { cve: string | null; open: boolean; onClose: () => void }) {
  const toasts = useToasts();
  const setStatus = useSetVulnStatus();
  const audit = useAudit();

  // TODO(replace-when-endpoint-ready): GET /vulnerability?cve=:cve — gives
  // us the single CVE record plus the list of affected agents.
  const { data: vulnRes } = useWazuhResource<{ vulnerabilities: Vulnerability[] }>(
    cve ? buildPath("/api/wazuh/vulnerabilities", { limit: 1 }) : null
  );
  // TODO(replace-when-endpoint-ready): GET /agents?cve=:cve — affected agents list.
  const { data: agentsRes } = useWazuhResource<{ agents: Agent[] }>(
    cve ? buildPath("/api/wazuh/agents", { limit: 12 }) : null
  );

  if (!cve) return null;
  const v = vulnRes?.vulnerabilities.find(x => x.cve === cve);
  if (!v) return null;
  const status = vulnStatus(v.cve);
  const next = NEXT[status];
  const affectedAgents = (agentsRes?.agents ?? []).slice(0, Math.min(v.agentCount, 12));

  function set(s: VulnState) {
    audit.record({
      scope: "vuln",
      type: s === "wont_fix" ? "vuln.wont_fix" : "vuln.status_change",
      summary: `${v!.cve} status: ${status} → ${s}`,
      outcome: "success",
      target: { kind: "cve", id: v!.cve },
      meta: { from: status, to: s, severity: v!.severity, package: v!.package }
    });
    setStatus(v!.cve, s);
    toasts.push({ variant: "success", title: `${v!.cve} marked ${s.replace("_", " ")}` });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 min-w-0">
          <Badge tone={v.severity} dot>{v.severity}</Badge>
          <span className="font-mono text-cream truncate">{v.cve}</span>
        </div>
      }
      actions={
        <>
          {next && <Button size="sm" variant="primary" onClick={() => set(next)}>Mark {next.replace("_", " ")}</Button>}
          {status !== "wont_fix" && <Button size="sm" variant="ghost" onClick={() => set("wont_fix")}>Won't fix</Button>}
        </>
      }
    >
      <Tabs
        tabs={[
          { id: "detail", label: "Detail", content: (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-navy-600">Title</div>
                <div className="text-cream">{v.title}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><div className="text-xs text-navy-600">CVSS</div><div className="font-mono text-cream">{v.cvss.toFixed(1)}</div></div>
                <div><div className="text-xs text-navy-600">Status</div><Badge tone={status === "patched" ? "low" : status === "in_progress" ? "medium" : status === "wont_fix" ? "neutral" : "high"} dot>{status.replace("_", " ")}</Badge></div>
                <div><div className="text-xs text-navy-600">Package</div><div className="font-mono text-cream">{v.package}</div></div>
                <div><div className="text-xs text-navy-600">Version</div><div className="font-mono text-cream">{v.version}</div></div>
                <div><div className="text-xs text-navy-600">Fix</div><div className="font-mono text-cream">{v.fixedVersion ?? "-"}</div></div>
                <div><div className="text-xs text-navy-600">Affected agents</div><div className="font-mono text-cream">{v.agentCount}</div></div>
              </div>
            </div>
          )},
          { id: "remediation", label: "Remediation", content: (
            <div className="text-sm text-sage space-y-2">
              <p>Upgrade <span className="font-mono">{v.package}</span> to <span className="font-mono">{v.fixedVersion ?? "the latest version"}</span> across all affected agents.</p>
              <ol className="list-decimal pl-5 text-sage space-y-1 text-xs">
                <li>Open the agent's package manager (apt, yum, or docker exec).</li>
                <li>Update the package: <code className="px-1 py-0.5 rounded bg-navy-200 border border-navy-400 font-mono">install {v.package}={v.fixedVersion ?? "latest"}</code></li>
                <li>Restart the affected service if required.</li>
                <li>Confirm with: <code className="px-1 py-0.5 rounded bg-navy-200 border border-navy-400 font-mono">wazuh-modulesd -t</code></li>
              </ol>
            </div>
          )},
          { id: "agents", label: `Affected agents (${v.agentCount})`, content: (
            <ul className="divide-y divide-navy-400/60 -mx-1 text-xs">
              {affectedAgents.map(a => (
                <li key={a.id} className="px-1 py-2 flex items-center gap-2">
                  <span className="font-mono text-sage">{a.name}</span>
                  <span className="text-navy-600">{a.ip}</span>
                  <Link href="/agents" className="ml-auto text-emerald-400 hover:text-severity-info">view</Link>
                </li>
              ))}
              {v.agentCount > 12 && <li className="px-1 py-2 text-navy-600">+ {v.agentCount - 12} more</li>}
            </ul>
          )}
        ]}
      />
    </Drawer>
  );
}
