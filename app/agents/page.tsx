"use client";
import { useMemo, useState } from "react";
import {
  Search, Plus, RefreshCcw, Download, ChevronDown, Server, Cpu,
  MoreHorizontal, Tag, Inbox, Copy, Power, ShieldOff, ScrollText, X
} from "lucide-react";
import { agents, alerts } from "@/data/seed";
import { Card } from "@/components/ui";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useToasts } from "@/hooks/useToasts";
import { Modal, ConfirmDialog } from "@/components/Modal";
import type { Agent } from "@/types";

export default function AgentsPage() {
  const toasts = useToasts();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "disconnected" | "pending" | "never_connected">("all");
  const [group, setGroup] = useState<string | null>(null);
  const [os, setOs] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [bulkGroup, setBulkGroup] = useState<string | null>(null);
  const [isolating, setIsolating] = useState<Agent | null>(null);
  const [restarting, setRestarting] = useState<Agent | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allGroups = useMemo(() => Array.from(new Set(agents.flatMap(a => a.group))).sort(), []);
  const allOs     = useMemo(() => Array.from(new Set(agents.map(a => a.os.name))).sort(), []);

  const counts = useMemo(() => ({
    all: agents.length,
    active: agents.filter(a => a.status === "active").length,
    disconnected: agents.filter(a => a.status === "disconnected").length,
    pending: agents.filter(a => a.status === "pending").length,
    never_connected: agents.filter(a => a.status === "never_connected").length
  }), []);

  const filtered = useMemo(() => {
    let list = agents;
    if (status !== "all") list = list.filter(a => a.status === status);
    if (group) list = list.filter(a => a.group.includes(group));
    if (os) list = list.filter(a => a.os.name === os);
    if (q.trim()) {
      const n = q.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(n) ||
        a.ip.includes(n) ||
        a.os.name.toLowerCase().includes(n) ||
        a.region.toLowerCase().includes(n)
      );
    }
    return list;
  }, [q, status, group, os]);

  function handleSync() {
    if (syncing) return;
    setSyncing(true);
    toasts.push({ variant: "info", title: "Syncing agents", description: "Pinging all 64 endpoints…" });
    setTimeout(() => {
      setSyncing(false);
      toasts.push({ variant: "success", title: "Sync complete", description: "60 reachable · 4 unreachable" });
    }, 1100);
  }

  function exportCSV() {
    const rows = [
      ["id","name","ip","os","version","group","status","last_keep_alive","region","manager"],
      ...filtered.map(a => [a.id, a.name, a.ip, `${a.os.name} ${a.os.version}`, a.version, a.group.join("|"), a.status, a.lastKeepAlive, a.region, a.manager])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const el = document.createElement("a");
    el.href = url; el.download = `agents-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.csv`;
    el.click(); URL.revokeObjectURL(url);
    toasts.push({ variant: "success", title: `Exported ${filtered.length} agents` });
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(a => a.id)));
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted font-mono uppercase tracking-wider">
            <span className="text-signal-400">Endpoints</span>
            <span>·</span>
            <span>Agents</span>
            <span>·</span>
            <span>{filtered.length} of {agents.length}</span>
            {selected.size > 0 && <><span>·</span><span><span className="font-mono text-primary">{selected.size}</span> selected</span></>}
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">Managed agents</h1>
          <p className="text-[12.5px] text-muted">Inventory, health, and grouping across every endpoint reporting in.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={exportCSV}><Download size={12} />Export</button>
          <button type="button" className="btn" onClick={handleSync} disabled={syncing}>
            <RefreshCcw size={12} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Sync"}
          </button>
          <button onClick={() => setDeployOpen(true)} className="btn btn-primary"><Plus size={12} />Deploy agent</button>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatusCard label="Total" value={counts.all} dotClass="bg-signal-500" active={status === "all"} onClick={() => setStatus("all")} />
        <StatusCard label="Active" value={counts.active} dotClass="bg-low live-dot" active={status === "active"} onClick={() => setStatus("active")} />
        <StatusCard label="Disconnected" value={counts.disconnected} dotClass="bg-critical live-dot-down" active={status === "disconnected"} onClick={() => setStatus("disconnected")} />
        <StatusCard label="Pending" value={counts.pending} dotClass="bg-medium live-dot-warn" active={status === "pending"} onClick={() => setStatus("pending")} />
        <StatusCard label="Never connected" value={counts.never_connected} dotClass="bg-muted" active={status === "never_connected"} onClick={() => setStatus("never_connected")} />
      </section>

      <Card padded={false}
        header={
          <>
            <div className="text-[12.5px] font-semibold text-primary truncate">Filters</div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <>
                  <button onClick={() => setBulkGroup(allGroups[0])} className="btn btn-sm"><Tag size={11} />Add to group</button>
                  <button onClick={() => toasts.push({ variant: "warn", title: `Restart queued for ${selected.size} agents` })} className="btn btn-sm"><Power size={11} />Restart</button>
                  <button onClick={() => setSelected(new Set())} className="btn btn-sm btn-ghost"><X size={11} />Clear</button>
                </>
              )}
              <span className="text-[11px] text-muted"><span className="font-mono text-primary">{filtered.length}</span> agents</span>
            </div>
          </>
        }
      >
        <div className="p-3 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
          <div className="relative lg:col-span-5">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input" placeholder="Search by name, IP, OS, region…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="lg:col-span-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] uppercase tracking-wider text-muted mr-1">OS</span>
            <FilterPill label="All" active={os === null} onClick={() => setOs(null)} />
            {allOs.map(o => <FilterPill key={o} label={o} active={os === o} onClick={() => setOs(o)} />)}
          </div>
          <div className="lg:col-span-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] uppercase tracking-wider text-muted mr-1">Group</span>
            <FilterPill label="All" active={group === null} onClick={() => setGroup(null)} />
            {allGroups.slice(0, 4).map(g => <FilterPill key={g} label={g} active={group === g} onClick={() => setGroup(g)} />)}
          </div>
        </div>
      </Card>

      <Card padded={false} header={
        <>
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-primary truncate">Agents</div>
            <div className="text-[11px] text-muted truncate">Sortable inventory</div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span>Group:</span>
            <button onClick={() => toasts.push({ variant: "info", title: "Group filter active: default" })} className="chip"><Tag size={10} />default<ChevronDown size={10} /></button>
          </div>
        </>
      }>
        <div className="overflow-x-auto max-h-[64vh] overflow-y-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0 z-10 surface-2 text-[10.5px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2 w-8">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="accent-signal-500" />
                </th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">IP</th>
                <th className="px-3 py-2">OS</th>
                <th className="px-3 py-2">Groups</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Last keep-alive</th>
                <th className="px-3 py-2">Alerts 24h</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const ac = alerts.filter(x => x.agent.id === a.id).length;
                return (
                  <tr key={a.id} className="border-t border-soft hover:surface-2">
                    <td className="px-3 py-2"><input type="checkbox" checked={selected.has(a.id)} onChange={() => {
                      const s = new Set(selected); if (s.has(a.id)) s.delete(a.id); else s.add(a.id); setSelected(s);
                    }} className="accent-signal-500" /></td>
                    <td className="px-3 py-2 font-mono text-muted">{a.id}</td>
                    <td className="px-3 py-2 font-mono text-primary">{a.name}</td>
                    <td className="px-3 py-2 font-mono text-muted">{a.ip}</td>
                    <td className="px-3 py-2">
                      <span className="text-primary">{a.os.name} {a.os.version}</span>
                      <span className="text-muted font-mono text-[10.5px] ml-1">· {a.os.arch}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {a.group.map(g => <span key={g} className="chip">{g}</span>)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted">{a.region}</td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5 text-[12px] capitalize">
                        {a.status === "active" ? (
                          <span className="live-dot" title="active" />
                        ) : a.status === "pending" ? (
                          <span className="live-dot live-dot-warn" title="pending" />
                        ) : (
                          <span className="live-dot live-dot-down" title={a.status} />
                        )}
                        {a.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted">{formatRelativeTime(a.lastKeepAlive)}</td>
                    <td className="px-3 py-2 font-mono text-primary">{ac}</td>
                    <td className="px-3 py-2 text-right">
                      <AgentMenu
                        agent={a}
                        onRestart={() => setRestarting(a)}
                        onIsolate={() => setIsolating(a)}
                        onCopy={() => { navigator.clipboard?.writeText(a.name); toasts.push({ variant: "success", title: "Agent name copied", duration: 1500 }); }}
                        onLogs={() => toasts.push({ variant: "info", title: `Opening logs for ${a.name}` })}
                      />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="px-3 py-16 text-center text-muted">
                  <div className="inline-flex flex-col items-center gap-2">
                    <Inbox size={20} />
                    No agents match the current filters.
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <DeployAgentModal open={deployOpen} onClose={() => setDeployOpen(false)} />
      <ConfirmDialog
        open={!!isolating}
        onClose={() => setIsolating(null)}
        danger
        title={`Isolate ${isolating?.name}?`}
        body="The host will be network-isolated via your EDR integration. All other agent actions will be queued until you restore."
        confirmLabel="Isolate host"
        onConfirm={() => toasts.push({ variant: "warn", title: `Host isolated`, description: `${isolating?.name} · network policy applied` })}
      />
      <ConfirmDialog
        open={!!restarting}
        onClose={() => setRestarting(null)}
        title={`Restart agent on ${restarting?.name}?`}
        body="The Wazuh agent process will be restarted. Detection gap expected: ~5 seconds."
        confirmLabel="Restart agent"
        onConfirm={() => toasts.push({ variant: "info", title: `Restart queued for ${restarting?.name}` })}
      />
    </div>
  );
}

function StatusCard({ label, value, dotClass, active, onClick }: { label: string; value: number; dotClass: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button"
      onClick={onClick}
      className={cn("panel p-3.5 text-left transition-colors", active ? "border-signal-500/50" : "hover:border-base")}
    >
      <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-wider text-muted font-semibold">
        <span className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
        {label}
      </div>
      <div className="text-[22px] font-semibold num tracking-tight mt-1">{value}</div>
    </button>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("chip cursor-pointer", active && "!bg-signal-500/15 !border-signal-500/30 !text-signal-300")}>
      {label}
    </button>
  );
}

function AgentMenu({ agent, onRestart, onIsolate, onCopy, onLogs }: {
  agent: Agent; onRestart: () => void; onIsolate: () => void; onCopy: () => void; onLogs: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block" onMouseLeave={() => setOpen(false)}>
      <button onClick={() => setOpen(o => !o)} className="btn btn-sm btn-icon btn-ghost"><MoreHorizontal size={12} /></button>
      {open && (
        <div className="absolute right-0 top-7 w-[200px] surface-1 border border-base rounded-md shadow-ops-lg z-30 text-left">
          <button onClick={() => { onLogs(); setOpen(false); }} className="w-full text-left px-3 h-8 text-[12px] text-secondary hover:surface-2 flex items-center gap-2"><ScrollText size={11} />View logs</button>
          <button onClick={() => { onRestart(); setOpen(false); }} className="w-full text-left px-3 h-8 text-[12px] text-secondary hover:surface-2 flex items-center gap-2"><Power size={11} />Restart agent</button>
          <button onClick={() => { onCopy(); setOpen(false); }} className="w-full text-left px-3 h-8 text-[12px] text-secondary hover:surface-2 flex items-center gap-2"><Copy size={11} />Copy name</button>
          <div className="border-t border-soft" />
          <button onClick={() => { onIsolate(); setOpen(false); }} className="w-full text-left px-3 h-8 text-[12px] text-critical hover:bg-critical/10 flex items-center gap-2"><ShieldOff size={11} />Isolate host</button>
        </div>
      )}
    </div>
  );
}

function DeployAgentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toasts = useToasts();
  const [os, setOs] = useState<"linux" | "windows" | "macos">("linux");
  const [arch, setArch] = useState<"x86_64" | "arm64">("x86_64");
  const [address, setAddress] = useState("manager.sentinelstack.io");
  const [group, setGroup] = useState("default");
  const [busy, setBusy] = useState(false);

  function deploy() {
    setBusy(true);
    toasts.push({ variant: "info", title: "Generating install command", description: `Target: ${os}/${arch}, group: ${group}` });
    setTimeout(() => {
      setBusy(false);
      toasts.push({ variant: "success", title: "Install command generated", description: "Copied to clipboard" });
      navigator.clipboard?.writeText(`curl -so wazuh-agent.deb https://${address}/install && sudo dpkg -i wazuh-agent.deb`);
      onClose();
    }, 900);
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title="Deploy new agent"
      subtitle="Generate the install command for the target host."
      size="md"
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={deploy} disabled={busy}>
            {busy ? "Working…" : "Generate install command"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Target OS</Label>
          <select className="input input-noicon" value={os} onChange={e => setOs(e.target.value as any)}>
            <option value="linux">Linux (deb / rpm)</option>
            <option value="windows">Windows</option>
            <option value="macos">macOS</option>
          </select>
        </div>
        <div>
          <Label>Architecture</Label>
          <select className="input input-noicon" value={arch} onChange={e => setArch(e.target.value as any)}>
            <option value="x86_64">x86_64</option>
            <option value="arm64">arm64</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <Label>Manager address</Label>
          <input className="input input-noicon font-mono" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Agent group</Label>
          <input className="input input-noicon" value={group} onChange={e => setGroup(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Preview</Label>
          <pre className="surface-2 border border-soft rounded-md p-3 text-[11.5px] font-mono text-secondary overflow-x-auto">
{`# ${os} · ${arch} · group=${group}
curl -so wazuh-agent.pkg https://${address}/install
sudo WAZUH_MANAGER=${address} dpkg -i wazuh-agent.pkg
sudo systemctl enable --now wazuh-agent`}
          </pre>
        </div>
      </div>
    </Modal>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10.5px] uppercase tracking-wider text-muted mb-1.5">{children}</div>;
}
