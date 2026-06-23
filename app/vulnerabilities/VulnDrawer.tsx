"use client";
import { Drawer, Button, Badge, Tabs } from "@/components/ui";
import { useToasts } from "@/hooks/useToasts";
import { useSetVulnStatus, vulnStatus } from "@/hooks/useAlertsStore";
import type { VulnState } from "@/types";
import { vulnerabilities, agents } from "@/data/seed";
import Link from "next/link";

const NEXT: Record<VulnState, VulnState | null> = {
  open: "in_progress", in_progress: "patched", patched: null, wont_fix: null
};

export function VulnDrawer({ cve, open, onClose }: { cve: string | null; open: boolean; onClose: () => void }) {
  const toasts = useToasts();
  const setStatus = useSetVulnStatus();
  if (!cve) return null;
  const v = vulnerabilities.find(x => x.cve === cve);
  if (!v) return null;
  const status = vulnStatus(v.cve);
  const next = NEXT[status];

  function set(s: VulnState) {
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
          <span className="font-mono text-slate-900 truncate">{v.cve}</span>
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
                <div className="text-xs text-slate-500">Title</div>
                <div className="text-slate-900">{v.title}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><div className="text-xs text-slate-500">CVSS</div><div className="font-mono text-slate-900">{v.cvss.toFixed(1)}</div></div>
                <div><div className="text-xs text-slate-500">Status</div><Badge tone={status === "patched" ? "low" : status === "in_progress" ? "medium" : status === "wont_fix" ? "neutral" : "high"} dot>{status.replace("_", " ")}</Badge></div>
                <div><div className="text-xs text-slate-500">Package</div><div className="font-mono text-slate-900">{v.package}</div></div>
                <div><div className="text-xs text-slate-500">Version</div><div className="font-mono text-slate-900">{v.version}</div></div>
                <div><div className="text-xs text-slate-500">Fix</div><div className="font-mono text-slate-900">{v.fixedVersion ?? "-"}</div></div>
                <div><div className="text-xs text-slate-500">Affected agents</div><div className="font-mono text-slate-900">{v.agentCount}</div></div>
              </div>
            </div>
          )},
          { id: "remediation", label: "Remediation", content: (
            <div className="text-sm text-slate-700 space-y-2">
              <p>Upgrade <span className="font-mono">{v.package}</span> to <span className="font-mono">{v.fixedVersion ?? "the latest version"}</span> across all affected agents.</p>
              <ol className="list-decimal pl-5 text-slate-600 space-y-1 text-xs">
                <li>Open the agent's package manager (apt, yum, or docker exec).</li>
                <li>Update the package: <code className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono">install {v.package}={v.fixedVersion ?? "latest"}</code></li>
                <li>Restart the affected service if required.</li>
                <li>Confirm with: <code className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono">wazuh-modulesd -t</code></li>
              </ol>
            </div>
          )},
          { id: "agents", label: `Affected agents (${v.agentCount})`, content: (
            <ul className="divide-y divide-slate-100 -mx-1 text-xs">
              {agents.slice(0, Math.min(v.agentCount, 12)).map(a => (
                <li key={a.id} className="px-1 py-2 flex items-center gap-2">
                  <span className="font-mono text-slate-700">{a.name}</span>
                  <span className="text-slate-500">{a.ip}</span>
                  <Link href="/agents" className="ml-auto text-indigo-600 hover:text-indigo-700">view</Link>
                </li>
              ))}
              {v.agentCount > 12 && <li className="px-1 py-2 text-slate-500">+ {v.agentCount - 12} more</li>}
            </ul>
          )}
        ]}
      />
    </Drawer>
  );
}
