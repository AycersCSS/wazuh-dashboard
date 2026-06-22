"use client";
import { useMemo, useState, useEffect } from "react";
import {
  AlertTriangle, ArrowUpRight, Check, ChevronDown, Download, Filter, MoreHorizontal,
  Search, ShieldAlert, X, Archive, BellOff, Inbox, ExternalLink, Copy, CopyCheck
} from "lucide-react";
import { alerts as allAlerts, agents } from "@/data/seed";
import { Card, Badge } from "@/components/ui";
import { formatRelativeTime, formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Alert } from "@/types";
import { severityBucket } from "@/types";
import { useToasts } from "@/hooks/useToasts";
import { ConfirmDialog, Modal } from "@/components/Modal";
import { useAcknowledge, useArchive, useAlertsStore, isAcked, isArchived } from "@/hooks/useAlertsStore";
import { useTimeRange } from "@/hooks/useTimeRange";
import { useRouter } from "next/navigation";

const sevOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
type SortKey = "timestamp" | "level" | "agent" | "rule";

export default function AlertsPage() {
  const toasts = useToasts();
  const router = useRouter();
  const acknowledge = useAcknowledge();
  const archive = useArchive();
  const store = useAlertsStore();
  const { range } = useTimeRange();

  const [q, setQ] = useState("");
  const [sevFilter, setSevFilter] = useState<Set<string>>(new Set());
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [onlyUnack, setOnlyUnack] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "timestamp", dir: "desc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerAlert, setDrawerAlert] = useState<Alert | null>(allAlerts[0]);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmSuppress, setConfirmSuppress] = useState(false);
  const [newRuleOpen, setNewRuleOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // keyboard: A acknowledges selection
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === "a" && selected.size > 0) {
        acknowledge([...selected]);
        toasts.push({ variant: "success", title: `Acknowledged ${selected.size} alert${selected.size > 1 ? "s" : ""}` });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, acknowledge, toasts]);

  const filtered = useMemo(() => {
    let list = allAlerts.slice();
    if (!showArchived) list = list.filter(a => !isArchived(a.id));
    if (q.trim()) {
      const n = q.toLowerCase();
      list = list.filter(a =>
        a.id.toLowerCase().includes(n) ||
        a.rule.description.toLowerCase().includes(n) ||
        a.agent.name.toLowerCase().includes(n) ||
        (a.rule.mitre?.id.toLowerCase().includes(n)) ||
        (a.rule.mitre?.tactic.toLowerCase().includes(n))
      );
    }
    if (sevFilter.size) {
      list = list.filter(a => sevFilter.has(severityName(a.rule.level)));
    }
    if (agentFilter) list = list.filter(a => a.agent.id === agentFilter);
    if (onlyUnack) list = list.filter(a => !isAcked(a.id));

    list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      switch (sort.key) {
        case "timestamp": return dir * (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        case "level":     return dir * (a.rule.level - b.rule.level);
        case "agent":     return dir * a.agent.name.localeCompare(b.agent.name);
        case "rule":      return dir * a.rule.id.localeCompare(b.rule.id);
      }
    });
    return list;
  }, [q, sevFilter, agentFilter, onlyUnack, sort, showArchived, store]); // store intentionally keeps the memo reactive to ack/archive mutations
  // eslint-disable-next-line react-hooks/exhaustive-deps

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(a => a.id)));
  }
  function toggleOne(id: string) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }

  function toggleSort(k: SortKey) {
    setSort(s => s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "desc" });
  }

  function exportCSV() {
    const rows = [
      ["id","timestamp","level","rule_id","rule_desc","agent","agent_ip","location","mitre","acked"],
      ...filtered.map(a => [
        a.id, a.timestamp, a.rule.level, a.rule.id, a.rule.description,
        a.agent.name, a.agent.ip, a.location,
        a.rule.mitre ? `${a.rule.mitre.id}/${a.rule.mitre.technique}` : "",
        isAcked(a.id) ? "yes" : "no"
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `alerts-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toasts.push({ variant: "success", title: `Exported ${filtered.length} alerts`, description: "CSV saved to your downloads" });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted font-mono uppercase tracking-wider">
            <span className="text-signal-400">SOC</span>
            <span>·</span>
            <span>Alerts</span>
            <span>·</span>
            <span>{filtered.length.toLocaleString()} of {allAlerts.length.toLocaleString()}</span>
            <span>·</span>
            <span>{range.label}</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">Alert queue</h1>
          <p className="text-[12.5px] text-muted">Triage incoming events. Click a row to inspect full event payload.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={exportCSV}><Download size={12} />Export CSV</button>
          <button type="button" className="btn" onClick={() => setShowArchived(s => !s)}>
            <Archive size={12} />{showArchived ? "Hide archived" : "Show archived"}
          </button>
          <button type="button" onClick={() => setNewRuleOpen(true)} className="btn btn-primary">
            <ShieldAlert size={12} />New detection rule
          </button>
        </div>
      </header>

      <Card padded={false}
        header={
          <>
            <div className="text-[12.5px] font-semibold text-primary truncate">Filters</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted">
                <span className="font-mono text-primary">{filtered.length}</span> result{filtered.length === 1 ? "" : "s"}
              </span>
            </div>
          </>
        }
      >
        <div className="p-3 flex flex-col md:flex-row md:items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input" placeholder="Filter by ID, rule, agent, MITRE…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["critical","high","medium","low","info"].map(s => (
              <button type="button"
                key={s}
                onClick={() => {
                  const set = new Set(sevFilter);
                  if (set.has(s)) set.delete(s); else set.add(s);
                  setSevFilter(set);
                }}
                className={cn(
                  "chip cursor-pointer capitalize",
                  sevFilter.has(s) && (s === "critical" ? "bg-sev-critical" : s === "high" ? "bg-sev-high" : s === "medium" ? "bg-sev-medium" : s === "low" ? "bg-sev-low" : "bg-sev-info")
                )}
              >
                <span className="chip-dot" style={{ background: s === "critical" ? "#FF3D5A" : s === "high" ? "#FF8A3D" : s === "medium" ? "#F5C04A" : s === "low" ? "#5BD0A0" : "#7AA2FF" }} />
                {s}
              </button>
            ))}
            {sevFilter.size > 0 && (
              <button type="button" onClick={() => setSevFilter(new Set())} className="chip">
                <X size={10} /> clear
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-[12px] text-secondary ml-auto">
            <input type="checkbox" checked={onlyUnack} onChange={e => setOnlyUnack(e.target.checked)}
              className="accent-signal-500" />
            Unacknowledged only
          </label>
        </div>
      </Card>

      <Card
        padded={false}
        header={
          <>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-primary truncate">Events</div>
              <div className="text-[11px] text-muted truncate">{agentFilter ? `Agent: ${agents.find(a => a.id === agentFilter)?.name ?? agentFilter}` : "All agents"}</div>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <>
                  <span className="text-[11px] text-muted"><span className="font-mono text-primary">{selected.size}</span> selected</span>
                  <button type="button" onClick={() => { acknowledge([...selected]); toasts.push({ variant: "success", title: `Acknowledged ${selected.size} alert${selected.size > 1 ? "s" : ""}` }); setSelected(new Set()); }} className="btn btn-sm">
                    <Check size={11} />Acknowledge
                  </button>
                  <button type="button" onClick={() => setConfirmArchive(true)} className="btn btn-sm">
                    <Archive size={11} />Archive
                  </button>
                  <button type="button" onClick={() => setConfirmSuppress(true)} className="btn btn-sm btn-danger">
                    <BellOff size={11} />Suppress
                  </button>
                </>
              )}
              {agentFilter && (
                <button onClick={() => setAgentFilter(null)} className="btn btn-sm">Clear agent <X size={11} /></button>
              )}
            </div>
          </>
        }
      >
        <div className="overflow-x-auto max-h-[64vh] overflow-y-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0 z-10 surface-2 text-[10.5px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2 w-8">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-signal-500" />
                </th>
                <SortTh label="Time" active={sort.key === "timestamp"} dir={sort.dir} onClick={() => toggleSort("timestamp")} />
                <SortTh label="Severity" active={sort.key === "level"} dir={sort.dir} onClick={() => toggleSort("level")} />
                <th className="px-3 py-2">ID</th>
                <SortTh label="Rule" active={sort.key === "rule"} dir={sort.dir} onClick={() => toggleSort("rule")} />
                <SortTh label="Agent" active={sort.key === "agent"} dir={sort.dir} onClick={() => toggleSort("agent")} />
                <th className="px-3 py-2">MITRE</th>
                <th className="px-3 py-2">Decoder</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const acked = isAcked(a.id);
                return (
                  <tr key={a.id}
                      onClick={() => setDrawerAlert(a)}
                      className={cn(
                        "border-t border-soft hover:surface-2 cursor-pointer",
                        drawerAlert?.id === a.id && "surface-2",
                        acked && "opacity-70"
                      )}>
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleOne(a.id)} className="accent-signal-500" />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-primary font-mono text-[11.5px]">{formatTime(a.timestamp)}</div>
                      <div className="text-muted text-[10.5px]">{formatRelativeTime(a.timestamp)}</div>
                    </td>
                    <td className="px-3 py-2"><Badge tone={severityBucket(a.rule.level)} dot>{`${severityBucket(a.rule.level)} - ${a.rule.level}`}</Badge></td>
                    <td className="px-3 py-2 font-mono text-muted whitespace-nowrap">{a.id}</td>
                    <td className="px-3 py-2 max-w-[320px]">
                      <div className="truncate text-primary">{a.rule.description}</div>
                      <div className="text-[10.5px] text-muted font-mono">rule {a.rule.id} · {a.rule.groups.join(" / ")}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap" onClick={e => { e.stopPropagation(); setAgentFilter(a.agent.id); toasts.push({ variant: "info", title: `Filtered to ${a.agent.name}`, duration: 1500 }); }}>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const st = agents.find(x => x.id === a.agent.id)?.status ?? "active";
                          if (st === "active") return <span className="live-dot" title="active" />;
                          if (st === "pending") return <span className="live-dot live-dot-warn" title="pending" />;
                          return <span className="live-dot live-dot-down" title={st} />;
                        })()}
                        <span className="font-mono text-primary">{a.agent.name}</span>
                        {acked && <span className="chip !h-[18px] !text-[10px] bg-sev-low">acked</span>}
                      </div>
                      <div className="text-[10.5px] text-muted font-mono">{a.agent.ip}</div>
                    </td>
                    <td className="px-3 py-2">
                      {a.rule.mitre ? (
                        <button type="button"
                          onClick={e => { e.stopPropagation(); router.push(`/mitre`); }}
                          className="chip !h-[20px] !text-[10.5px] hover:!bg-signal-500/20 cursor-pointer"
                        >
                          {a.rule.mitre.id} · {a.rule.mitre.tactic}
                        </button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-muted whitespace-nowrap">{a.decoder?.name ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-muted whitespace-nowrap max-w-[180px] truncate" title={a.location}>{a.location}</td>
                    <td className="px-3 py-2 text-right" onClick={e => e.stopPropagation()}>
                      <RowMenu alertId={a.id} acknowledged={acked} onAck={() => { acknowledge([a.id]); toasts.push({ variant: "success", title: `Acknowledged ${a.id}` }); }} onArchive={() => { archive([a.id]); toasts.push({ variant: "info", title: `Archived ${a.id}` }); }} onView={() => setDrawerAlert(a)} />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-16 text-center">
                    <div className="inline-flex flex-col items-center gap-2 text-muted">
                      <Inbox size={20} />
                      <span>No alerts match the current filters.</span>
                      <button onClick={() => { setQ(""); setSevFilter(new Set()); setAgentFilter(null); setOnlyUnack(false); }} className="btn btn-sm mt-1">Reset filters</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {drawerAlert && (
        <AlertDrawer
          alert={drawerAlert}
          acknowledged={isAcked(drawerAlert.id)}
          onClose={() => setDrawerAlert(null)}
          onAck={() => { acknowledge([drawerAlert.id]); toasts.push({ variant: "success", title: `Acknowledged ${drawerAlert.id}` }); }}
          onArchive={() => { archive([drawerAlert.id]); toasts.push({ variant: "info", title: `Archived ${drawerAlert.id}` }); setDrawerAlert(null); }}
          onEscalate={() => toasts.push({ variant: "warn", title: `Escalated ${drawerAlert.id}`, description: "PagerDuty incident created" })}
          onOpenAgent={() => { setAgentFilter(drawerAlert.agent.id); setDrawerAlert(null); toasts.push({ variant: "info", title: `Filtered to ${drawerAlert.agent.name}`, duration: 1500 }); }}
        />
      )}

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title={`Archive ${selected.size} alert${selected.size > 1 ? "s" : ""}?`}
        body="Archived alerts can be restored from the archive view within 90 days."
        confirmLabel="Archive"
        onConfirm={() => { archive([...selected]); toasts.push({ variant: "info", title: `Archived ${selected.size} alert${selected.size > 1 ? "s" : ""}` }); setSelected(new Set()); }}
      />
      <ConfirmDialog
        open={confirmSuppress}
        onClose={() => setConfirmSuppress(false)}
        danger
        title={`Suppress ${selected.size} rule match${selected.size > 1 ? "es" : ""}?`}
        body="Future matching alerts will be hidden for 24 hours. You can undo from Settings → Suppressions."
        confirmLabel="Suppress"
        onConfirm={() => { toasts.push({ variant: "warn", title: "Suppression created", description: `${selected.size} alerts hidden for 24h` }); setSelected(new Set()); }}
      />
      <NewRuleModal open={newRuleOpen} onClose={() => setNewRuleOpen(false)} />
    </div>
  );
}

function severityName(level: number) {
  if (level >= 13) return "critical";
  if (level >= 10) return "high";
  if (level >= 7) return "medium";
  if (level >= 4) return "low";
  return "info";
}

function SortTh({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <th className="px-3 py-2 select-none">
      <button type="button" onClick={onClick} className={cn("flex items-center gap-1 hover:text-primary", active && "text-primary")}>
        {label}
        {active && <ChevronDown size={11} className={cn("transition-transform", dir === "asc" && "rotate-180")} />}
      </button>
    </th>
  );
}

function RowMenu({ alertId, acknowledged, onAck, onArchive, onView }: { alertId: string; acknowledged: boolean; onAck: () => void; onArchive: () => void; onView: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useState<any>()[0];
  return (
    <div className="relative inline-block" onMouseLeave={() => setOpen(false)}>
      <button onClick={() => setOpen(o => !o)} className="btn btn-sm btn-icon btn-ghost" aria-label="More"><MoreHorizontal size={12} /></button>
      {open && (
        <div className="absolute right-0 top-7 w-[180px] surface-1 border border-base rounded-md shadow-ops-lg z-30 text-left">
          <button onClick={() => { onView(); setOpen(false); }} className="w-full text-left px-3 h-8 text-[12px] text-secondary hover:surface-2">Inspect</button>
          {!acknowledged && <button onClick={() => { onAck(); setOpen(false); }} className="w-full text-left px-3 h-8 text-[12px] text-secondary hover:surface-2">Acknowledge</button>}
          <button onClick={() => { onArchive(); setOpen(false); }} className="w-full text-left px-3 h-8 text-[12px] text-secondary hover:surface-2">Archive</button>
          <button onClick={() => { navigator.clipboard?.writeText(alertId); setOpen(false); }} className="w-full text-left px-3 h-8 text-[12px] text-secondary hover:surface-2">Copy ID</button>
          <div className="border-t border-soft" />
          <button onClick={() => setOpen(false)} className="w-full text-left px-3 h-8 text-[12px] text-critical hover:bg-critical/10">Suppress rule</button>
        </div>
      )}
    </div>
  );
}

function AlertDrawer({ alert, acknowledged, onClose, onAck, onArchive, onEscalate, onOpenAgent }: {
  alert: Alert;
  acknowledged: boolean;
  onClose: () => void;
  onAck: () => void;
  onArchive: () => void;
  onEscalate: () => void;
  onOpenAgent: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const toasts = useToasts();
  const router = useRouter();

  const json = JSON.stringify({
    id: alert.id, timestamp: alert.timestamp,
    rule: alert.rule, agent: alert.agent,
    decoder: alert.decoder, location: alert.location, data: alert.data
  }, null, 2);

  function copyJSON() {
    navigator.clipboard?.writeText(json);
    setCopied(true);
    toasts.push({ variant: "success", title: "Payload copied to clipboard", duration: 1800 });
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[460px] surface-1 border-l border-base shadow-ops-lg flex flex-col animate-slide-in-right">
        <header className="flex items-center justify-between gap-2 h-12 px-4 border-b border-soft">
          <div className="flex items-center gap-2">
            <Badge tone={severityBucket(alert.rule.level)} dot>{`${severityBucket(alert.rule.level)} - ${alert.rule.level}`}</Badge>
            <span className="font-mono text-[12px] text-muted">{alert.id}</span>
            {acknowledged && <span className="chip !h-[18px] !text-[10px] bg-sev-low">acked</span>}
          </div>
          <button onClick={onClose} className="btn btn-icon btn-ghost" aria-label="Close"><X size={14} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-muted">Description</div>
            <div className="text-[14px] text-primary mt-1">{alert.rule.description}</div>
            <div className="text-[11.5px] text-muted mt-1 font-mono">rule {alert.rule.id} · groups {alert.rule.groups.join(" / ")}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Time" value={<span className="font-mono">{new Date(alert.timestamp).toLocaleString()}</span>} />
            <Field label="Decoder" value={<span className="font-mono">{alert.decoder?.name} <span className="text-muted">({alert.decoder?.parent})</span></span>} />
            <button type="button" onClick={onOpenAgent} className="panel p-3 text-left hover:border-base transition-colors">
              <div className="text-[10.5px] uppercase tracking-wider text-muted">Agent</div>
              <div className="text-[12.5px] text-primary mt-0.5 font-mono flex items-center gap-1">{alert.agent.name} <ExternalLink size={10} className="text-muted" /></div>
            </button>
            <Field label="Agent IP" value={<span className="font-mono">{alert.agent.ip}</span>} />
            <Field label="Location" value={<span className="font-mono text-[11.5px] break-all">{alert.location}</span>} />
            {alert.rule.mitre && (
              <button type="button"
                onClick={() => router.push("/mitre")}
                className="panel p-3 text-left hover:border-base transition-colors"
              >
                <div className="text-[10.5px] uppercase tracking-wider text-muted">MITRE</div>
                <div className="text-[12.5px] text-primary mt-0.5 font-mono flex items-center gap-1">{alert.rule.mitre.id} <ExternalLink size={10} className="text-muted" /></div>
              </button>
            )}
          </div>

          {alert.rule.mitre && (
            <div className="panel p-3">
              <div className="text-[10.5px] uppercase tracking-wider text-muted mb-2">ATT&CK technique</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12.5px] text-primary font-mono">{alert.rule.mitre.technique}</div>
                  <div className="text-[11.5px] text-muted">{alert.rule.mitre.tactic}</div>
                </div>
                <button onClick={() => router.push("/mitre")} className="btn btn-sm">Open in ATT&CK<ArrowUpRight size={11} /></button>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10.5px] uppercase tracking-wider text-muted">Full event payload</div>
              <button type="button" onClick={copyJSON} className="btn btn-sm">
                {copied ? <><CopyCheck size={11} className="text-low" /> Copied</> : <><Copy size={11} /> Copy JSON</>}
              </button>
            </div>
            <pre className="surface-2 border border-soft rounded-md p-3 text-[11.5px] font-mono text-secondary overflow-x-auto max-h-[260px]">
{json}
            </pre>
          </div>

          <div className="panel p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-semibold">Recommended actions</div>
              <span className="chip">AI · beta</span>
            </div>
            <ul className="text-[12px] text-secondary space-y-1.5 list-disc pl-4">
              <li>Verify <span className="font-mono text-primary">{alert.agent.name}</span> has current Wazuh agent (4.9.0).</li>
              <li>Check <span className="font-mono">{alert.location}</span> for related events in the last hour.</li>
              <li>If confirmed malicious, isolate host via endpoint integration.</li>
            </ul>
          </div>
        </div>

        <footer className="border-t border-soft p-3 flex items-center gap-2">
          {!acknowledged ? (
            <button onClick={onAck} className="btn btn-primary flex-1"><Check size={12} />Acknowledge</button>
          ) : (
            <span className="btn flex-1 !cursor-default bg-sev-low !border-low/30 text-low">Acknowledged</span>
          )}
          <button onClick={onArchive} className="btn"><Archive size={12} />Archive</button>
          <button onClick={onEscalate} className="btn btn-danger"><AlertTriangle size={12} />Escalate</button>
        </footer>
      </aside>
    </>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="panel p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-muted">{label}</div>
      <div className="text-[12.5px] text-primary mt-0.5">{value}</div>
    </div>
  );
}

function NewRuleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toasts = useToasts();
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("10");
  const [groups, setGroups] = useState("authentication,ssh");
  const [pattern, setPattern] = useState("sshd:.*Failed password.*for (.+) from");

  function save() {
    if (!description.trim()) { toasts.push({ variant: "error", title: "Description is required" }); return; }
    toasts.push({ variant: "success", title: "Rule created", description: `Rule queued for syntax validation (${description.slice(0, 40)}…)` });
    setDescription(""); setLevel("10"); setGroups("authentication,ssh"); setPattern("");
    onClose();
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title="New detection rule"
      subtitle="Author XML or use the simplified editor. Rules are validated and staged for review."
      size="lg"
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={() => toasts.push({ variant: "info", title: "Rule saved as draft" })}>Save draft</button>
          <button className="btn btn-primary" onClick={save}>Validate &amp; stage</button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <Label>Description</Label>
          <input className="input input-noicon" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. SSH brute force from single source" />
        </div>
        <div>
          <Label>Level</Label>
          <select className="input input-noicon" value={level} onChange={e => setLevel(e.target.value)}>
            <option value="3">3 · Low</option>
            <option value="7">7 · Medium</option>
            <option value="10">10 · High</option>
            <option value="13">13 · Critical</option>
          </select>
        </div>
        <div>
          <Label>Groups (comma separated)</Label>
          <input className="input input-noicon" value={groups} onChange={e => setGroups(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Match pattern (regex)</Label>
          <input className="input input-noicon font-mono" value={pattern} onChange={e => setPattern(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Preview</Label>
          <pre className="surface-2 border border-soft rounded-md p-3 text-[11.5px] font-mono text-secondary overflow-x-auto">{`<rule id="100200" level="${level}">
  <description>${description || "—"}</description>
  <match>${pattern || "—"}</match>
  <groups>${groups.split(",").map(g => g.trim()).filter(Boolean).join(",")}</groups>
</rule>`}</pre>
        </div>
      </div>
    </Modal>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10.5px] uppercase tracking-wider text-muted mb-1.5">{children}</div>;
}
