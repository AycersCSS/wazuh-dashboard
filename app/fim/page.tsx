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
    { key: "time", header: "Time", width: "140px", sortable: true, sortValue: f => new Date(f.timestamp).getTime(), cell: f => <span className="text-navy-600">{formatRelativeTime(f.timestamp)}</span> },
    { key: "action", header: "Action", width: "120px", cell: f => <Badge tone={f.action === "deleted" ? "critical" : f.action === "modified" ? "medium" : "info"} dot>{f.action}</Badge> },
    { key: "path", header: "Path", cell: f => <span className="font-mono text-sage truncate block max-w-[420px]">{f.path}</span> },
    { key: "agent", header: "Agent", cell: f => <span className="font-mono text-sage">{f.agent}</span> },
    { key: "user", header: "User", cell: f => <span className="font-mono text-sage">{f.user}</span> },
    { key: "size", header: "Size", cell: f => <span className="font-mono text-sage">{f.size.toLocaleString()} B</span> }
  ];

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Analyze" }, { label: "File Integrity" }]}
      icon={FileCheck2}
      title="File Integrity"
      description={`${fimEvents.length} events in last 24h`}
      actions={
        <div className="flex items-center bg-navy-200 rounded-lg p-0.5">
          <button type="button" onClick={() => setView("timeline")} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium ${view === "timeline" ? "bg-navy-100 text-cream shadow-sm" : "text-navy-600 hover:text-cream"}`}>
            <Clock size={12} /> Timeline
          </button>
          <button type="button" onClick={() => setView("table")} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium ${view === "table" ? "bg-navy-100 text-cream shadow-sm" : "text-navy-600 hover:text-cream"}`}>
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
                className={`h-7 px-2.5 rounded-md border text-xs font-medium ${action === a ? "bg-severity-info/15 border-severity-info/40 text-severity-info" : "bg-navy-100 border-navy-400 text-sage hover:bg-navy-100"}`}>
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
            <ul className="divide-y divide-navy-400/60">
              {filtered.map(f => (
                <li key={f.id} className="px-4 py-3 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${f.action === "deleted" ? "bg-severity-critical" : f.action === "modified" ? "bg-severity-medium" : "bg-severity-info"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-cream truncate">{f.path}</div>
                    <div className="text-[11px] text-navy-600 mt-0.5">
                      <span className="font-mono">{f.agent}</span> - <span className="font-mono">{f.user}</span> - {f.size.toLocaleString()} B
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge tone={f.action === "deleted" ? "critical" : f.action === "modified" ? "medium" : "info"} dot>{f.action}</Badge>
                    <div className="text-[11px] text-navy-600 mt-1">{formatRelativeTime(f.timestamp)}</div>
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
