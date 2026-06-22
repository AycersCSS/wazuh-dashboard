"use client";
import { useState } from "react";
import { ScrollText, Plus, Filter, Search, Edit3, Power, MoreHorizontal, Copy } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { severityBucket } from "@/types";
import { rules as seedRules } from "@/data/seed";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useToasts } from "@/hooks/useToasts";
import { useAlertsStore, useToggleRule, ruleStatus } from "@/hooks/useAlertsStore";
import { Modal } from "@/components/Modal";
import type { Rule } from "@/types";

export default function RulesPage() {
  const toasts = useToasts();
  useAlertsStore();
  const toggle = useToggleRule();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "enabled" | "disabled">("all");
  const [editing, setEditing] = useState<Rule | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const filtered = seedRules.filter(r => {
    const s = ruleStatus(r.id);
    return (status === "all" || s === status) &&
      (!q.trim() || r.id.includes(q) || r.description.toLowerCase().includes(q.toLowerCase()) || r.groups.join(" ").includes(q.toLowerCase()));
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted font-mono uppercase tracking-wider">
            <span className="text-signal-400">Configure</span><span>·</span><span>Rules</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">Detection rules</h1>
          <p className="text-[12.5px] text-muted">Manage the Wazuh rule library. Edit, version, and deploy with confidence.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => toasts.push({ variant: "info", title: "Opening rule filters" })}><Filter size={12} />Filters</button>
          <button onClick={() => setNewOpen(true)} className="btn btn-primary"><Plus size={12} />New rule</button>
        </div>
      </header>

      <Card padded={false}
        header={
          <>
            <div className="text-[12.5px] font-semibold text-primary truncate">Rule library</div>
            <div className="flex items-center gap-2">
              <div className="relative w-[260px]">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input className="input" placeholder="Search rules…" value={q} onChange={e => setQ(e.target.value)} />
              </div>
              <div className="flex gap-1.5">
                {(["all","enabled","disabled"] as const).map(s => (
                  <button key={s} onClick={() => setStatus(s)} className={cn("chip cursor-pointer capitalize", status === s && "!bg-signal-500/15 !border-signal-500/30 !text-signal-300")}>{s}</button>
                ))}
              </div>
            </div>
          </>
        }
      >
        <div className="overflow-x-auto max-h-[64vh] overflow-y-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0 z-10 surface-2 text-[10.5px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Groups</th>
                <th className="px-3 py-2">Hits 24h</th>
                <th className="px-3 py-2">Modified</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const s = ruleStatus(r.id);
                return (
                  <tr key={r.id} className="border-t border-soft hover:surface-2">
                    <td className="px-3 py-2 font-mono text-muted">{r.id}</td>
                    <td className="px-3 py-2 text-primary">{r.description}</td>
                    <td className="px-3 py-2"><Badge tone={severityBucket(r.level)} dot>{`${severityBucket(r.level)} - ${r.level}`}</Badge></td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.groups.map(g => <span key={g} className="chip">{g}</span>)}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-primary">{r.hits24h.toLocaleString()}</td>
                    <td className="px-3 py-2 text-muted">{formatRelativeTime(r.modified)}</td>
                    <td className="px-3 py-2">
                      <span className={`chip ${s === "enabled" ? "bg-sev-low" : "bg-sev-info"}`}>
                        <span className="chip-dot" style={{ background: s === "enabled" ? "#5BD0A0" : "#7AA2FF" }} />
                        {s}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => setEditing(r)} className="btn btn-sm btn-icon btn-ghost" aria-label="Edit"><Edit3 size={11} /></button>
                        <button type="button"
                          onClick={() => { toggle(r.id); toasts.push({ variant: "info", title: `Rule ${r.id} ${s === "enabled" ? "disabled" : "enabled"}` }); }}
                          className="btn btn-sm btn-icon btn-ghost" aria-label="Toggle"
                        >
                          <Power size={11} className={s === "disabled" ? "text-medium" : "text-low"} />
                        </button>
                        <button onClick={() => { navigator.clipboard?.writeText(r.id); toasts.push({ variant: "success", title: "Rule ID copied", duration: 1500 }); }} className="btn btn-sm btn-icon btn-ghost" aria-label="Copy ID"><Copy size={11} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <RuleEditor open={!!editing} rule={editing} onClose={() => setEditing(null)} />
      <RuleEditor open={newOpen} rule={null} onClose={() => setNewOpen(false)} />
    </div>
  );
}

function RuleEditor({ open, rule, onClose }: { open: boolean; rule: Rule | null; onClose: () => void }) {
  const toasts = useToasts();
  const [description, setDescription] = useState(rule?.description ?? "");
  const [level, setLevel] = useState(String(rule?.level ?? 10));
  const [groups, setGroups] = useState(rule?.groups.join(",") ?? "");

  // sync state when rule changes
  useState(() => {
    setDescription(rule?.description ?? "");
    setLevel(String(rule?.level ?? 10));
    setGroups(rule?.groups.join(",") ?? "");
  });

  function save() {
    toasts.push({ variant: "success", title: rule ? `Rule ${rule.id} updated` : "New rule created", description: description.slice(0, 50) });
    onClose();
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title={rule ? `Edit rule ${rule.id}` : "New rule"}
      subtitle={rule ? "Changes apply after deploy." : "Author XML or use the simplified editor."}
      size="md"
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save</button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>Description</Label>
          <input className="input input-noicon" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
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
            <Label>Groups</Label>
            <input className="input input-noicon" value={groups} onChange={e => setGroups(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Preview XML</Label>
          <pre className="surface-2 border border-soft rounded-md p-3 text-[11.5px] font-mono text-secondary overflow-x-auto">
{`<rule id="${rule?.id ?? "100200"}" level="${level}">
  <description>${description || "—"}</description>
  <groups>${groups.split(",").map(g => g.trim()).filter(Boolean).join(",")}</groups>
</rule>`}
          </pre>
        </div>
      </div>
    </Modal>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10.5px] uppercase tracking-wider text-muted mb-1.5">{children}</div>;
}
