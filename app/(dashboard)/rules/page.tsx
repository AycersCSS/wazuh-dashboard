"use client";
import { useState, useMemo, useEffect } from "react";
import { Page, DataGrid, type Column, Card, EmptyState, SearchInput, Badge } from "@/components/ui";
import { ruleStatus, useToggleRule, useAlertsStore, useHydrateFromLive } from "@/hooks/useAlertsStore";
import { useToasts } from "@/hooks/useToasts";
import { useAudit } from "@/hooks/useAudit";
import { formatRelativeTime } from "@/lib/format";
import { useWazuhResource, buildPath } from "@/lib/wazuh";
import type { Rule } from "@/types";

export default function RulesPage() {
  useAlertsStore();
  const toasts = useToasts();
  const toggle = useToggleRule();
  const audit = useAudit();
  const hydrate = useHydrateFromLive();
  const [search, setSearch] = useState("");

  // TODO(replace-when-endpoint-ready): GET /rules
  const { data } = useWazuhResource<{ rules: Rule[]; total: number }>(
    buildPath("/api/wazuh/rules", { limit: 500 })
  );
  const rules = data?.rules ?? [];

  useEffect(() => {
    if (data?.rules) hydrate({ rules: data.rules });
  }, [data, hydrate]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter(r => {
      if (q && !(r.id.includes(q) || r.description.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rules, search]);

  const columns: Column<Rule>[] = [
    { key: "id", header: "ID", width: "120px", cell: r => <span className="font-mono text-cream">{r.id}</span> },
    { key: "desc", header: "Description", sortable: true, sortValue: r => r.description, cell: r => <span className="text-sage truncate block max-w-[420px]">{r.description}</span> },
    { key: "level", header: "Level", width: "80px", sortable: true, sortValue: r => r.level, cell: r => <Badge tone={r.level >= 13 ? "critical" : r.level >= 10 ? "high" : r.level >= 7 ? "medium" : "low"} dot>{r.level}</Badge> },
    { key: "groups", header: "Groups", cell: r => <div className="flex flex-wrap gap-1">{r.groups.map(g => <span key={g} className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] bg-navy-200 text-sage border border-navy-400">{g}</span>)}</div> },
    { key: "hits", header: "Hits 24h", width: "120px", sortable: true, sortValue: r => r.hits24h, cell: r => <span className="font-mono text-cream">{r.hits24h.toLocaleString()}</span> },
    { key: "mod", header: "Modified", width: "160px", cell: r => <span className="text-navy-600">{formatRelativeTime(r.modified)}</span> },
    { key: "status", header: "Status", width: "120px", cell: r => {
      const s = ruleStatus(r.id);
      return (
        <button
          type="button"
          onClick={() => { audit.record({ scope: "rule", type: "rule.toggle", summary: `Rule ${r.id}: ${s} → ${s === "enabled" ? "disabled" : "enabled"}`, outcome: "success", target: { kind: "rule", id: r.id }, meta: { from: s, to: s === "enabled" ? "disabled" : "enabled", level: r.level, description: r.description } }); toggle(r.id); toasts.push({ variant: "info", title: `Rule ${r.id} ${s === "enabled" ? "disabled" : "enabled"}` }); }}
          className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-xs font-medium ${s === "enabled" ? "bg-emerald-400/15 border-emerald-400/40 text-emerald-400" : "bg-navy-200 border-navy-400 text-navy-600"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s === "enabled" ? "bg-emerald-400" : "bg-navy-600"}`} />
          {s}
        </button>
      );
    }}
  ];

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Configure" }, { label: "Rules" }]}
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
        emptyState={<EmptyState title="No rules match" description="Try clearing the search." />}
      />
    </Page>
  );
}
