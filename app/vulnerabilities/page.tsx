"use client";
import { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { ExternalLink, Filter, Wrench, ShieldAlert, CheckCircle2, X } from "lucide-react";
import { Card, StatCard } from "@/components/ui";
import { vulnerabilities as seedVulns } from "@/data/seed";
import { cn } from "@/lib/cn";
import { useToasts } from "@/hooks/useToasts";
import { Modal, ConfirmDialog } from "@/components/Modal";
import { useAlertsStore, useSetVulnStatus, vulnStatus } from "@/hooks/useAlertsStore";

const sevOrder = ["critical","high","medium","low"] as const;
const sevColor: Record<string, string> = { critical: "#FF3D5A", high: "#FF8A3D", medium: "#F5C04A", low: "#5BD0A0", info: "#7AA2FF" };
const statusColor: Record<string, string> = { open: "text-critical", in_progress: "text-medium", patched: "text-low", wont_fix: "text-muted" };
const statusBg: Record<string, string>    = { open: "bg-sev-critical", in_progress: "bg-sev-medium", patched: "bg-sev-low", wont_fix: "bg-sev-info" };

export default function VulnerabilitiesPage() {
  const toasts = useToasts();
  const setVulnStatus = useSetVulnStatus();
  useAlertsStore(); // subscribe
  const [filter, setFilter] = useState<typeof sevOrder[number] | "all">("all");
  const [scanOpen, setScanOpen] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [remediationOpen, setRemediationOpen] = useState(false);
  const [confirmPatch, setConfirmPatch] = useState<string | null>(null);

  const filtered = useMemo(() => filter === "all" ? seedVulns : seedVulns.filter(v => v.severity === filter), [filter]);

  const totalAgents = seedVulns.reduce((s, v) => s + v.agentCount, 0);
  const patchedCount = seedVulns.filter(v => vulnStatus(v.cve) === "patched").length;
  const inProgress = seedVulns.filter(v => vulnStatus(v.cve) === "in_progress").length;
  const bySeverity = sevOrder.map(s => ({ name: s, value: seedVulns.filter(v => v.severity === s).reduce((sum, v) => sum + v.agentCount, 0) }));

  function startScan() {
    setScanOpen(true);
    setScanProgress(0);
    const id = window.setInterval(() => {
      setScanProgress(p => {
        const next = p + Math.random() * 12;
        if (next >= 100) {
          window.clearInterval(id);
          toasts.push({ variant: "success", title: "Scan complete", description: `${seedVulns.length} CVEs evaluated across 64 agents` });
          return 100;
        }
        return next;
      });
    }, 280);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted font-mono uppercase tracking-wider">
            <span className="text-signal-400">Analyze</span><span>·</span><span>Vulnerabilities</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">Vulnerability inventory</h1>
          <p className="text-[12.5px] text-muted">Open CVEs across the fleet with fix priority and remediation progress.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => setRemediationOpen(true)}><Wrench size={12} />Remediation plan</button>
          <button className="btn btn-primary" onClick={startScan}><ShieldAlert size={12} />Scan now</button>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Open CVEs" value={seedVulns.length - patchedCount} hint={`${totalAgents} total agent hits`} accent="high" />
        <StatCard label="Critical"  value={seedVulns.filter(v => v.severity === "critical").length} hint="CVE score ≥ 9.0" accent="critical" />
        <StatCard label="Mean CVSS"  value={(seedVulns.reduce((s,v) => s + v.cvss, 0) / seedVulns.length).toFixed(1)} hint="across all open" accent="info" />
        <StatCard label="Patched"    value={patchedCount} delta={`+${patchedCount}`} dir="up" hint={`${inProgress} in progress`} accent="low" />
      </section>

      <section className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 xl:col-span-4" header={
          <>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-primary truncate">Severity distribution</div>
              <div className="text-[11px] text-muted truncate">Sum of affected agents per severity</div>
            </div>
            <div />
          </>
        }>
          <div className="h-[260px] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bySeverity} dataKey="value" innerRadius={50} outerRadius={86} paddingAngle={2} stroke="none">
                  {bySeverity.map((d, i) => <Cell key={i} fill={sevColor[d.name]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#10151D", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11.5, color: "#9AA6B8" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-8" padded={false} header={
          <>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-primary truncate">CVE list</div>
              <div className="text-[11px] text-muted truncate">Sortable by CVSS, affected agents, or published date</div>
            </div>
            <div className="flex items-center gap-1.5">
              {(["all", ...sevOrder] as const).map(s => (
                <button type="button" key={s} onClick={() => setFilter(s)}
                  className={cn("chip cursor-pointer capitalize",
                    filter === s && (s === "critical" ? "bg-sev-critical"
                                  : s === "high" ? "bg-sev-high"
                                  : s === "medium" ? "bg-sev-medium"
                                  : s === "low" ? "bg-sev-low"
                                  : "!bg-signal-500/15 !border-signal-500/30 !text-signal-300"))}>
                  {s}
                </button>
              ))}
            </div>
          </>
        }
        >
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 z-10 surface-2 text-[10.5px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2">CVE</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">CVSS</th>
                  <th className="px-3 py-2">Package</th>
                  <th className="px-3 py-2">Affected</th>
                  <th className="px-3 py-2">Fix version</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const s = vulnStatus(v.cve);
                  return (
                    <tr key={v.cve} className="border-t border-soft hover:surface-2">
                      <td className="px-3 py-2 font-mono text-primary">{v.cve}</td>
                      <td className="px-3 py-2">
                        <span className={`chip ${v.severity === "critical" ? "bg-sev-critical" : v.severity === "high" ? "bg-sev-high" : v.severity === "medium" ? "bg-sev-medium" : "bg-sev-low"}`}>
                          <span className="chip-dot" style={{ background: sevColor[v.severity] }} />
                          {v.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono">{v.cvss.toFixed(1)}</td>
                      <td className="px-3 py-2">
                        <div className="text-primary font-mono">{v.package}</div>
                        <div className="text-[10.5px] text-muted font-mono">v{v.version}</div>
                      </td>
                      <td className="px-3 py-2 font-mono">{v.agentCount}</td>
                      <td className="px-3 py-2 font-mono text-low">{v.fixedVersion ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`chip ${statusBg[s]}`}>
                          <span className="chip-dot" style={{ background: s === "patched" ? "#5BD0A0" : s === "in_progress" ? "#F5C04A" : s === "open" ? "#FF3D5A" : "#7AA2FF" }} />
                          {s.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          {s === "patched"
                            ? <span className="text-low inline-flex items-center gap-1 text-[11.5px]"><CheckCircle2 size={11} />done</span>
                            : <button onClick={() => setConfirmPatch(v.cve)} className="btn btn-sm">Patch<ExternalLink size={11} /></button>
                          }
                          <select
                            className="input input-noicon !h-7 !w-[100px] !text-[11px]"
                            value={s}
                            onChange={e => { setVulnStatus(v.cve, e.target.value as any); toasts.push({ variant: "info", title: `${v.cve} → ${e.target.value.replace("_"," ")}` }); }}
                          >
                            <option value="open">open</option>
                            <option value="in_progress">in_progress</option>
                            <option value="patched">patched</option>
                            <option value="wont_fix">wont_fix</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Scan-now modal with progress */}
      <Modal
        open={scanOpen} onClose={() => scanProgress >= 100 && setScanOpen(false)}
        title="Vulnerability scan"
        subtitle="Evaluating packages across 64 agents."
        size="sm"
        footer={
          <button type="button" className="btn btn-primary" onClick={() => scanProgress >= 100 && setScanOpen(false)} disabled={scanProgress < 100}>
            {scanProgress < 100 ? "Scanning…" : "Done"}
          </button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-secondary">Progress</span>
            <span className="font-mono text-primary">{Math.round(scanProgress)}%</span>
          </div>
          <div className="h-2 surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-signal-500 transition-all" style={{ width: `${scanProgress}%` }} />
          </div>
          <ul className="text-[12px] text-secondary space-y-1.5">
            <li className={scanProgress > 20 ? "text-low" : "text-muted"}>✓ Indexer warmup</li>
            <li className={scanProgress > 50 ? "text-low" : scanProgress > 20 ? "text-primary" : "text-muted"}>{scanProgress > 50 ? "✓" : "…"} Evaluating installed packages</li>
            <li className={scanProgress > 80 ? "text-low" : scanProgress > 50 ? "text-primary" : "text-muted"}>{scanProgress > 80 ? "✓" : "…"} Correlating with NVD feed</li>
            <li className={scanProgress >= 100 ? "text-low" : "text-muted"}>{scanProgress >= 100 ? "✓" : "…"} Computing remediation plan</li>
          </ul>
        </div>
      </Modal>

      <Modal
        open={remediationOpen} onClose={() => setRemediationOpen(false)}
        title="Auto-generated remediation plan"
        subtitle="Based on current CVE inventory, grouped by agent and package."
        size="lg"
        footer={
          <>
            <button className="btn" onClick={() => setRemediationOpen(false)}>Close</button>
            <button type="button" className="btn btn-primary" onClick={() => { toasts.push({ variant: "success", title: "Plan dispatched", description: "Sent to 64 agents via central config" }); setRemediationOpen(false); }}>
              Dispatch to fleet
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {seedVulns.slice(0, 4).map(v => (
            <div key={v.cve} className="panel p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12.5px] text-primary font-mono">{v.cve} · {v.package} {v.version} → {v.fixedVersion ?? "—"}</div>
                  <div className="text-[10.5px] text-muted">{v.agentCount} agents · {v.title}</div>
                </div>
                <span className={`chip ${v.severity === "critical" ? "bg-sev-critical" : "bg-sev-high"}`}>{v.severity}</span>
              </div>
              <pre className="mt-2 surface-2 border border-soft rounded p-2 text-[11px] font-mono text-secondary overflow-x-auto">
{`# ${v.package} ${v.version} → ${v.fixedVersion ?? "n/a"}
sudo apt-get update
sudo apt-get install --only-upgrade ${v.package}
sudo systemctl restart wazuh-agent`}
              </pre>
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmPatch}
        onClose={() => setConfirmPatch(null)}
        title={`Patch ${confirmPatch}?`}
        body="A staged rollout will be created and applied to the affected agents during the next maintenance window."
        confirmLabel="Queue patch"
        onConfirm={() => {
          if (confirmPatch) {
            setVulnStatus(confirmPatch, "in_progress");
            toasts.push({ variant: "success", title: `Patch queued for ${confirmPatch}` });
          }
        }}
      />
    </div>
  );
}
