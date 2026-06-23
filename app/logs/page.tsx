"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FileText, Pause, Play } from "lucide-react";
import { Page, Card, Badge, SearchInput, Select, Button } from "@/components/ui";
import { fimEvents } from "@/data/seed";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Row { id: string; ts: string; source: string; agent: string; severity: "low" | "medium" | "high" | "critical" | "info"; message: string; }

const seedRows: Row[] = Array.from({ length: 400 }, (_, i) => {
  const f = fimEvents[i % fimEvents.length];
  return {
    id: `L-${(1_000_000 + i).toString(16).toUpperCase()}`,
    ts: new Date(Date.now() - i * 1500).toISOString(),
    source: ["sshd", "auditd", "nginx", "kubelet", "wazuh-modulesd"][i % 5],
    agent: f.agent,
    severity: (["low","medium","high","critical","info"] as const)[i % 5],
    message: f.path
  };
});

export default function LogsPage() {
  const [rows, setRows] = useState<Row[]>(seedRows);
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [active, setActive] = useState<Row | null>(null);

  // live tail
  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => {
      setRows(prev => [{
        id: `L-${Date.now().toString(16).toUpperCase()}`,
        ts: new Date().toISOString(),
        source: ["sshd","auditd","nginx","kubelet","wazuh-modulesd"][Math.floor(Math.random()*5)],
        agent: seedRows[Math.floor(Math.random()*seedRows.length)].agent,
        severity: (["low","medium","high","critical","info"] as const)[Math.floor(Math.random()*5)],
        message: `event tick ${prev.length}`
      }, ...prev].slice(0, 800));
    }, 2000);
    return () => window.clearInterval(t);
  }, [paused]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (source !== "all" && r.source !== source) return false;
      if (severity !== "all" && r.severity !== severity) return false;
      if (q && !(r.id.toLowerCase().includes(q) || r.message.toLowerCase().includes(q) || r.agent.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, search, source, severity]);

  const parentRef = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({ count: filtered.length, getScrollElement: () => parentRef.current, estimateSize: () => 36, overscan: 12 });

  const sources = useMemo(() => Array.from(new Set(rows.map(r => r.source))).sort(), [rows]);

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Configure" }, { label: "Logs" }]}
      icon={FileText}
      title="Logs"
      description={`${rows.length} events - ${paused ? "paused" : "live"}`}
      actions={<Button variant="secondary" onClick={() => setPaused(p => !p)} icon={paused ? <Play size={14} /> : <Pause size={14} />}>{paused ? "Resume" : "Pause"}</Button>}
    >
      <Card padded={false}>
        <div className="p-3 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px] max-w-md"><SearchInput value={search} onChange={setSearch} placeholder="Search message, agent, id..." /></div>
          <Select value={source} onChange={e => setSource(e.target.value)} options={[{ value: "all", label: "All sources" }, ...sources.map(s => ({ value: s, label: s }))]} />
          <Select value={severity} onChange={e => setSeverity(e.target.value)} options={[
            { value: "all", label: "All severities" },
            { value: "critical", label: "Critical" }, { value: "high", label: "High" },
            { value: "medium", label: "Medium" }, { value: "low", label: "Low" }, { value: "info", label: "Info" }
          ]} />
        </div>
      </Card>

      <Card padded={false}>
        <div className="grid grid-cols-12 px-3 h-9 items-center text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
          <div className="col-span-2">Time</div>
          <div className="col-span-2">Source</div>
          <div className="col-span-2">Severity</div>
          <div className="col-span-2">Agent</div>
          <div className="col-span-4">Message</div>
        </div>
        <div ref={parentRef} className="h-[60vh] overflow-auto">
          <div style={{ height: v.getTotalSize(), position: "relative" }}>
            {v.getVirtualItems().map(vi => {
              const r = filtered[vi.index];
              return (
                <button key={r.id}
                  type="button"
                  onClick={() => setActive(r)}
                  className={cn("grid grid-cols-12 px-3 h-9 items-center text-xs border-b border-slate-100 hover:bg-slate-50 cursor-pointer absolute top-0 left-0 right-0 text-left")}
                  style={{ transform: `translateY(${vi.start}px)` }}>
                  <div className="col-span-2 text-slate-500 font-mono">{formatRelativeTime(r.ts)}</div>
                  <div className="col-span-2 text-slate-700 font-mono">{r.source}</div>
                  <div className="col-span-2"><Badge tone={r.severity} dot>{r.severity}</Badge></div>
                  <div className="col-span-2 text-slate-600 font-mono truncate">{r.agent}</div>
                  <div className="col-span-4 text-slate-700 truncate font-mono">{r.message}</div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {active && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close event detail" onClick={() => setActive(null)} className="absolute inset-0 bg-slate-900/40" />
          <div onClick={e => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-drawer p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-900">Event {active.id}</div>
              <button type="button" onClick={() => setActive(null)} className="text-xs text-slate-500 hover:text-slate-900">Close</button>
            </div>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto text-slate-700">
{JSON.stringify(active, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </Page>
  );
}
