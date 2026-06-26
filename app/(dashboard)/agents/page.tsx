"use client";
import { useState, useMemo } from "react";
import { Page, DataGrid, type Column, Card, EmptyState, Badge } from "@/components/ui";
import { agents, alerts } from "@/data/seed";
import { AgentCard } from "./AgentCard";
import { AgentDrawer } from "./AgentDrawer";
import { AgentFiltersBar, type AgentFilters } from "./AgentFilters";
import { formatRelativeTime } from "@/lib/format";
import type { Agent } from "@/types";

// Hoisted: agents and alerts are module constants, so alert counts never change.
const alertCountByAgent = new Map<string, number>();
for (const a of alerts) alertCountByAgent.set(a.agent.id, (alertCountByAgent.get(a.agent.id) ?? 0) + 1);
const activeCount = agents.reduce((n, a) => a.status === "active" ? n + 1 : n, 0);
const disconnCount = agents.reduce((n, a) => a.status === "disconnected" ? n + 1 : n, 0);

export default function AgentsPage() {
  const [view, setView] = useState<"grid" | "table">("grid");
  const [filters, setFilters] = useState<AgentFilters>({ search: "", status: "all", os: "all" });
  const [active, setActive] = useState<Agent | null>(null);

  const osOptions = useMemo(() => {
    const set = new Set(agents.map(a => a.os.name));
    return [...set].map(n => ({ value: n, label: n }));
  }, []);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return agents.filter(a => {
      if (filters.status !== "all" && a.status !== filters.status) return false;
      if (filters.os !== "all" && a.os.name !== filters.os) return false;
      if (q && !(a.name.toLowerCase().includes(q) || a.ip.includes(q) || a.os.name.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [filters]);

  const columns: Column<Agent>[] = [
    { key: "name", header: "Name", sortable: true, sortValue: a => a.name, cell: a => <span className="font-mono text-cream">{a.name}</span> },
    { key: "ip", header: "IP", cell: a => <span className="font-mono text-sage">{a.ip}</span> },
    { key: "os", header: "OS", cell: a => <span className="text-sage">{a.os.name} {a.os.version}</span> },
    { key: "status", header: "Status", cell: a => <Badge tone={a.status === "active" ? "low" : a.status === "disconnected" ? "neutral" : a.status === "pending" ? "medium" : "critical"} dot>{a.status.replace("_", " ")}</Badge> },
    { key: "group", header: "Group", cell: a => <span className="text-sage">{a.group.join(", ")}</span> },
    { key: "last", header: "Last seen", sortable: true, sortValue: a => new Date(a.lastKeepAlive).getTime(), cell: a => <span className="text-navy-600">{formatRelativeTime(a.lastKeepAlive)}</span> },
    { key: "alerts", header: "Alerts", cell: a => <span className="font-mono text-cream">{alertCountByAgent.get(a.id) ?? 0}</span> }
  ];

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Operate" }, { label: "Agents" }]}
      title="Agents"
      description={`${agents.length} endpoints - ${activeCount} active - ${disconnCount} disconnected`}
      actions={
        <div className="flex items-center bg-navy-200 rounded-lg p-0.5">
          <button type="button" onClick={() => setView("grid")} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium ${view === "grid" ? "bg-navy-100 text-cream shadow-sm" : "text-navy-600 hover:text-cream"}`}>
            Grid
          </button>
          <button type="button" onClick={() => setView("table")} className={`inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium ${view === "table" ? "bg-navy-100 text-cream shadow-sm" : "text-navy-600 hover:text-cream"}`}>
            Table
          </button>
        </div>
      }
    >
      <AgentFiltersBar value={filters} onChange={setFilters} osOptions={osOptions} />

      {filtered.length === 0 ? (
        <Card padded={false}>
          <EmptyState title="No agents match" description="Try removing filters." />
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(a => (
            <AgentCard key={a.id} agent={a} alertCount={alertCountByAgent.get(a.id) ?? 0} onClick={() => setActive(a)} />
          ))}
        </div>
      ) : (
        <DataGrid columns={columns} rows={filtered} rowKey={a => a.id} onRowClick={a => setActive(a)} />
      )}

      <AgentDrawer agent={active} open={!!active} onClose={() => setActive(null)} />
    </Page>
  );
}
