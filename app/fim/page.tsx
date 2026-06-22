"use client";
import { useState } from "react";
import { FileCheck2, Search, Filter, Plus, Minus, Edit3, RefreshCcw, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui";
import { fimEvents } from "@/data/seed";
import { formatRelativeTime, formatTime } from "@/lib/format";
import { useToasts } from "@/hooks/useToasts";
import { ConfirmDialog, Modal } from "@/components/Modal";

const actionMeta = {
  modified: { icon: Edit3, color: "text-medium" },
  added:    { icon: Plus,  color: "text-low"    },
  deleted:  { icon: Minus, color: "text-critical" }
};

export default function FimPage() {
  const toasts = useToasts();
  const [q, setQ] = useState("");
  const [action, setAction] = useState<"all" | "modified" | "added" | "deleted">("all");
  const [rebaseline, setRebaseline] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [path, setPath] = useState("/etc/");
  const [recursive, setRecursive] = useState(true);

  const filtered = fimEvents.filter(e =>
    (action === "all" || e.action === action) &&
    (!q.trim() ||
      e.agent.toLowerCase().includes(q.toLowerCase()) ||
      e.path.toLowerCase().includes(q.toLowerCase()) ||
      e.user.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted font-mono uppercase tracking-wider">
            <span className="text-signal-400">Analyze</span><span>·</span><span>File Integrity Monitoring</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">File integrity monitoring</h1>
          <p className="text-[12.5px] text-muted">Real-time view of changes to monitored files across the fleet.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => setRebaseline(true)}><RefreshCcw size={12} />Re-baseline</button>
          <button className="btn" onClick={() => setAddOpen(true)}><Filter size={12} />Add monitor</button>
          <button type="button" className="btn btn-primary" onClick={() => toasts.push({ variant: "info", title: "Opening FIM configuration", description: "syscheck · /var/ossec/etc/ossec.conf" })}>
            <FileCheck2 size={12} />Configure FIM
          </button>
        </div>
      </header>

      <Card padded={false}
        header={
          <>
            <div className="text-[12.5px] font-semibold text-primary truncate">Events</div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                {(["all","modified","added","deleted"] as const).map(a => (
                  <button type="button" key={a} onClick={() => setAction(a)} className={`chip cursor-pointer capitalize ${action === a ? "!bg-signal-500/15 !border-signal-500/30 !text-signal-300" : ""}`}>
                    {a}
                  </button>
                ))}
              </div>
              <div className="relative w-[260px]">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input className="input" placeholder="Filter by path, agent, user…" value={q} onChange={e => setQ(e.target.value)} />
              </div>
            </div>
          </>
        }
      >
        <div className="overflow-x-auto max-h-[64vh] overflow-y-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0 z-10 surface-2 text-[10.5px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Agent</th>
                <th className="px-3 py-2">Path</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Event ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const Meta = actionMeta[e.action];
                const Icon = Meta.icon;
                return (
                  <tr key={e.id} className="border-t border-soft hover:surface-2">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-primary font-mono text-[11.5px]">{formatTime(e.timestamp)}</div>
                      <div className="text-[10.5px] text-muted">{formatRelativeTime(e.timestamp)}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`flex items-center gap-1.5 text-[12px] ${Meta.color}`}>
                        <Icon size={12} /> {e.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-primary">{e.agent}</td>
                    <td className="px-3 py-2 font-mono text-muted truncate max-w-[380px]" title={e.path}>{e.path}</td>
                    <td className="px-3 py-2 font-mono text-secondary">{e.user}</td>
                    <td className="px-3 py-2 font-mono">{e.size.toLocaleString()} B</td>
                    <td className="px-3 py-2 font-mono text-muted">{e.id}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        open={rebaseline}
        onClose={() => setRebaseline(false)}
        title="Re-baseline FIM database?"
        body="This will overwrite the current integrity baseline. Any unauthorized changes will be lost from the baseline. FIM will continue logging deltas."
        confirmLabel="Re-baseline"
        onConfirm={() => toasts.push({ variant: "warn", title: "FIM re-baseline started", description: "64 agents · estimated 8 minutes" })}
      />

      <Modal
        open={addOpen} onClose={() => setAddOpen(false)}
        title="Add FIM monitor"
        subtitle="Watch a path on every agent in the selected group."
        size="md"
        footer={
          <>
            <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => { toasts.push({ variant: "success", title: "Monitor added", description: `Watching ${path} (${recursive ? "recursive" : "single file"})` }); setAddOpen(false); }}>
              <ShieldAlert size={12} />Watch
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Path</Label>
            <input className="input input-noicon font-mono" value={path} onChange={e => setPath(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-[12.5px] text-secondary">
            <input type="checkbox" checked={recursive} onChange={e => setRecursive(e.target.checked)} className="accent-signal-500" />
            Watch recursively
          </label>
          <div className="panel p-3 text-[12px] text-muted">
            <div className="text-[10.5px] uppercase tracking-wider text-muted mb-1.5">Coverage</div>
            <div>64 agents will begin monitoring within 60 seconds. Initial checksums will be computed at next agent sync.</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10.5px] uppercase tracking-wider text-muted mb-1.5">{children}</div>;
}
