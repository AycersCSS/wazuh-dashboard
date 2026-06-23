"use client";
import { useState, useMemo } from "react";
import { ScrollText } from "lucide-react";
import { Page, DataGrid, type Column, Card, EmptyState, SearchInput, Badge } from "@/components/ui";
import { rules } from "@/data/seed";
import { ruleStatus, useToggleRule, useAlertsStore } from "@/hooks/useAlertsStore";
import { useToasts } from "@/hooks/useToasts";
import { formatRelativeTime } from "@/lib/format";
import type { Rule } from "@/types";

export default function RulesPage() {
  useAlertsStore();
  const toasts = useToasts();
  const toggle = useToggleRule();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter(r => {
      if (q && !(r.id.includes(q) || r.description.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [search]);

  const columns: Column<Rule>[] = [
    { key: "id", header: "ID", width: "120px", cell: r => <span className="font-mono text-slate-900">{r.id}</span> },
    { key: "desc", header: "Description", sortable: true, sortValue: r => r.description, cell: r => <span className="text-slate-700 truncate block max-w-[420px]">{r.description}</span> },
    { key: "level", header: "Level", width: "80px", sortable: true, sortValue: r => r.level, cell: r => <Badge tone={r.level >= 13 ? "critical" : r.level >= 10 ? "high" : r.level >= 7 ? "medium" : "low"} dot>{r.level}</Badge> },
    { key: "groups", header: "Groups", cell: r => <div className="flex flex-wrap gap-1">{r.groups.map(g => <span key={g} className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] bg-slate-100 text-slate-600 border border-slate-200">{g}</span>)}</div> },
    { key: "hits", header: "Hits 24h", width: "120px", sortable: true, sortValue: r => r.hits24h, cell: r => <span className="font-mono text-slate-900">{r.hits24h.toLocaleString()}</span> },
    { key: "mod", header: "Modified", width: "160px", cell: r => <span className="text-slate-500">{formatRelativeTime(r.modified)}</span> },
    { key: "status", header: "Status", width: "120px", cell: r => {
      const s = ruleStatus(r.id);
      return (
        <button
          type="button"
          onClick={() => { toggle(r.id); toasts.push({ variant: "info", title: `Rule ${r.id} ${s === "enabled" ? "disabled" : "enabled"}` }); }}
          className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-xs font-medium ${s === "enabled" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-500"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s === "enabled" ? "bg-emerald-500" : "bg-slate-400"}`} />
          {s}
        </button>
      );
    }}
  ];

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Configure" }, { label: "Rules" }]}
      icon={ScrollText}
      title="Rules"
      description={`${rules.length} rules in library - click status to toggle`}
    >
      <Card padded={false}>
        <div className="p-3">
          <div className="max-w-md"><SearchInput value={search} onChange={setSearch} placeholder="Search by ID or description..." /></div>
        </div>
      </Card>
      <DataGrid
        columns={columns}
        rows={filtered}
        rowKey={r => r.id}
        emptyState={<EmptyState icon={ScrollText} title="No rules match" description="Try clearing the search." />}
      />
    </Page>
  );
}
