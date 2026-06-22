"use client";
import { useState } from "react";
import { ShieldCheck, ExternalLink, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui";
import { alerts } from "@/data/seed";
import { cn } from "@/lib/cn";
import { useToasts } from "@/hooks/useToasts";
import { useRouter } from "next/navigation";

const matrix: { id: string; tactic: string; techniques: { id: string; name: string }[] }[] = [
  { id: "TA0001", tactic: "Initial Access",     techniques: [{ id: "T1190", name: "Exploit Public-Facing App" }, { id: "T1566.001", name: "Spearphishing Attachment" }, { id: "T1078", name: "Valid Accounts" }] },
  { id: "TA0002", tactic: "Execution",          techniques: [{ id: "T1059.004", name: "Unix Shell" }, { id: "T1204.002", name: "Malicious File" }, { id: "T1047", name: "Windows Mgmt Instrumentation" }] },
  { id: "TA0003", tactic: "Persistence",        techniques: [{ id: "T1543", name: "Service" }, { id: "T1547", name: "Boot/Logon Autostart" }, { id: "T1098", name: "Account Manipulation" }] },
  { id: "TA0004", tactic: "Privilege Escalation", techniques: [{ id: "T1068", name: "Exploitation for Priv Esc" }, { id: "T1548.002", name: "Bypass UAC" }] },
  { id: "TA0005", tactic: "Defense Evasion",    techniques: [{ id: "T1070.004", name: "File Deletion" }, { id: "T1027", name: "Obfuscated Files" }, { id: "T1562.001", name: "Disable/Modify Tools" }] },
  { id: "TA0006", tactic: "Credential Access",  techniques: [{ id: "T1110.003", name: "Password Spraying" }, { id: "T1003.001", name: "LSASS Memory" }, { id: "T1555", name: "Credentials from Stores" }] },
  { id: "TA0007", tactic: "Discovery",          techniques: [{ id: "T1083", name: "File/Directory Discovery" }, { id: "T1057", name: "Process Discovery" }, { id: "T1087.002", name: "Domain Account" }] },
  { id: "TA0008", tactic: "Lateral Movement",   techniques: [{ id: "T1021.001", name: "RDP" }, { id: "T1021.002", name: "SMB/Windows Admin Shares" }, { id: "T1570", name: "Lateral Tool Transfer" }] },
  { id: "TA0009", tactic: "Collection",         techniques: [{ id: "T1005", name: "Data from Local System" }, { id: "T1114", name: "Email Collection" }] },
  { id: "TA0010", tactic: "Exfiltration",       techniques: [{ id: "T1041", name: "Exfil over C2" }, { id: "T1567.002", name: "Exfil to Cloud" }, { id: "T1052.001", name: "Exfil over USB" }] },
  { id: "TA0011", tactic: "Command & Control",  techniques: [{ id: "T1071.001", name: "Web Protocols" }, { id: "T1090.003", name: "Multi-hop Proxy" }, { id: "T1572", name: "Protocol Tunneling" }] },
  { id: "TA0040", tactic: "Impact",             techniques: [{ id: "T1486", name: "Data Encrypted for Impact" }, { id: "T1490", name: "Inhibit System Recovery" }] }
];

function heatFor(techId: string) {
  return alerts.filter(a => a.rule.mitre?.technique === techId).length;
}

export default function MitrePage() {
  const toasts = useToasts();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>("TA0001");

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted font-mono uppercase tracking-wider">
            <span className="text-signal-400">Analyze</span><span>·</span><span>MITRE ATT&CK</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">ATT&CK coverage</h1>
          <p className="text-[12.5px] text-muted">Heatmap of techniques observed in the last 30 days.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toasts.push({ variant: "info", title: "Refreshing ATT&CK data" })} className="btn">Refresh</button>
          <button onClick={() => toasts.push({ variant: "success", title: "Coverage report exported" })} className="btn btn-primary">Export coverage</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10.5px] text-muted">
            <span>less</span>
            <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(122,162,255,0.08)" }} />
            <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(122,162,255,0.25)" }} />
            <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(245,192,74,0.55)" }} />
            <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,61,90,0.7)" }} />
            <span>more</span>
          </div>
        </div>
      </header>

      <Card padded={false} header={
        <>
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-primary truncate">Tactics matrix</div>
            <div className="text-[11px] text-muted truncate">Click a tactic to expand techniques</div>
          </div>
          <div />
        </>
      }>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 p-3">
          {matrix.map(t => {
            const total = t.techniques.reduce((s, tech) => s + heatFor(tech.id), 0);
            const intensity = Math.min(1, total / 30);
            const bg = `rgba(255, ${61 + (1-intensity)*100}, ${90 + (1-intensity)*30}, ${0.15 + intensity*0.55})`;
            return (
              <button type="button"
                key={t.id}
                onClick={() => setOpen(open === t.id ? null : t.id)}
                className={cn("text-left p-3 rounded-md border border-soft transition-colors", open === t.id ? "surface-3" : "surface-2 hover:border-base")}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-mono text-muted">{t.id}</span>
                  <ChevronRight size={12} className={cn("text-muted transition-transform", open === t.id && "rotate-90 text-signal-400")} />
                </div>
                <div className="text-[12.5px] text-primary mt-0.5">{t.tactic}</div>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden surface-3">
                  <div className="h-full" style={{ width: `${(intensity * 100).toFixed(0)}%`, background: bg }} />
                </div>
                <div className="mt-1.5 text-[10.5px] text-muted flex items-center justify-between">
                  <span>{t.techniques.length} techniques</span>
                  <span className="font-mono text-primary">{total} hits</span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {open && (() => {
        const t = matrix.find(m => m.id === open)!;
        return (
          <Card padded={false} header={
            <>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-primary truncate">{t.tactic}</div>
                <div className="text-[11px] text-muted truncate">{`${t.id} · ${t.techniques.length} techniques`}</div>
              </div>
              <button onClick={() => toasts.push({ variant: "info", title: `Opening ${t.id} on attack.mitre.org` })} className="btn btn-sm">Open in ATT&CK<ExternalLink size={11} /></button>
            </>
          }>
            <table className="w-full text-left text-[12px]">
              <thead className="surface-2 text-[10.5px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2">Technique</th>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Hits 30d</th>
                  <th className="px-3 py-2">Detection rule</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {t.techniques.map(tech => {
                  const h = heatFor(tech.id);
                  return (
                    <tr key={tech.id} className="border-t border-soft hover:surface-2 cursor-pointer"
                        onClick={() => router.push(`/alerts?q=${encodeURIComponent(tech.id)}`)}>
                      <td className="px-3 py-2.5 text-primary">{tech.name}</td>
                      <td className="px-3 py-2.5 font-mono text-muted">{tech.id}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="font-mono">{h}</div>
                          <div className="flex-1 max-w-[160px] h-1.5 surface-3 rounded-full overflow-hidden">
                            <div className="h-full bg-signal-500" style={{ width: `${Math.min(100, h * 4)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-muted">5{tech.id.slice(1, 5).replace(/\D/g, "").padEnd(4, "0")}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={e => { e.stopPropagation(); toasts.push({ variant: "info", title: `Loading alerts for ${tech.id}` }); router.push(`/alerts?q=${encodeURIComponent(tech.id)}`); }} className="btn btn-sm">View<ChevronRight size={11} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        );
      })()}
    </div>
  );
}
