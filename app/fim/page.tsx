"use client";
import { useState, useMemo } from "react";
import { FileCheck2, Clock, List } from "lucide-react";
import { Page, DataGrid, type Column, Card, EmptyState, SearchInput, Button, Badge } from "@/components/ui";
import { fimEvents } from "@/data/seed";
import { formatRelativeTime } from "@/lib/format";
import type { FimEvent } from "@/types";

export default function FimPage() {
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const [action, setAction] = useState<"all" | "modified" | "added" | "deleted">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fimEvents.filter(f => {
      if (action !== "all" && f.action !== action) return false;
      if (q && !(f.path.toLowerCase().includes(q) || f.agent.toLowerCase().includes(q) || f.user.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [action, search]);

  const columns: Column<FimEvent>[] = [
    { key: "time", header: "Time", width: "140px", sortable: true, sortValue: f => new Date(f.timestamp).getTime(), cell: f => <span className="text-slate-500">{formatRelativeTime(f.timestamp)}</span> },
    { key: "action", header: "Action", width: "120px", cell: f => <Badge tone={f.action === "deleted" ? "critical" : f.action === "modified" ? "medium" : "info"} dot>{f.action}</Badge> },
    { key: "path", header: "Path", cell: f => <span className="font-mono text-slate-700 truncate block max-w-[420px]">{f.path}</span> },
    { key: "agent", header: "Agent", cell: f => <span className="font-mono text-slate-600">{f.agent}</span> },
    { key: "user", header: "User", cell: f => <span className="font-mono text-slate-600">{f.user}</span> },
    { key: "size", header: "Size", cell: f => <span className="font-mono text-slate-600">{f.size.toLocaleString()} B</span> }
  ];

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Analyze" }, { label: "File Integrity" }]}
      icon={FileCheck2}
      title="File Integrity"
      description={`${fimEvents.length} events in last 24h`}
      actions={
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button type="button" onClick={() => setView("timeline")} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium ${view === "timeline" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
            <Clock size={12} /> Timeline
          </button>
          <button type="button" onClick={() => setView("table")} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium ${view === "table" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
            <List size={12} /> Table
          </button>
        </div>
      }
    >
      <Card padded={false}>
        <div className="p-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            {(["all","modified","added","deleted"] as const).map(a => (
              <button key={a} type="button" onClick={() => setAction(a)}
                className={`h-7 px-2.5 rounded-md border text-xs font-medium ${action === a ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {a === "all" ? "All actions" : a}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[200px] max-w-md"><SearchInput value={search} onChange={setSearch} placeholder="Search path, agent, user..." /></div>
        </div>
      </Card>

      {view === "table" ? (
        <DataGrid columns={columns} rows={filtered} rowKey={f => f.id}
          emptyState={<EmptyState icon={FileCheck2} title="No FIM events" description="Try adjusting filters." />} />
      ) : (
        <Card padded={false}>
          {filtered.length === 0 ? (
            <EmptyState icon={FileCheck2} title="No FIM events" description="Try adjusting filters." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map(f => (
                <li key={f.id} className="px-4 py-3 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${f.action === "deleted" ? "bg-rose-500" : f.action === "modified" ? "bg-amber-500" : "bg-sky-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-slate-900 truncate">{f.path}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      <span className="font-mono">{f.agent}</span> - <span className="font-mono">{f.user}</span> - {f.size.toLocaleString()} B
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge tone={f.action === "deleted" ? "critical" : f.action === "modified" ? "medium" : "info"} dot>{f.action}</Badge>
                    <div className="text-[11px] text-slate-500 mt-1">{formatRelativeTime(f.timestamp)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </Page>
  );
}
