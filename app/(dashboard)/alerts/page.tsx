"use client";
import { useState, useMemo } from "react";
import { Page, DataGrid, type Column, Button, Card, EmptyState, Badge } from "@/components/ui";
import { alerts } from "@/data/seed";
import { useTimeRange } from "@/hooks/useTimeRange";
import { useToasts } from "@/hooks/useToasts";
import { useAcknowledge, useAlertsStore } from "@/hooks/useAlertsStore";
import { useAudit } from "@/hooks/useAudit";
import { severityBucket, severityLabel } from "@/types";
import { formatRelativeTime } from "@/lib/format";
import { AlertDrawer } from "./AlertDrawer";
import { AlertFiltersBar, type AlertFilters } from "./AlertFilters";
import type { Alert } from "@/types";

// Hoisted: alerts is a module constant, so this count never changes at runtime.
const criticalAlertCount = alerts.reduce((n, a) => a.rule.level >= 13 ? n + 1 : n, 0);

export default function AlertsPage() {
  const toasts = useToasts();
  const { range } = useTimeRange();
  const ack = useAcknowledge();
  const store = useAlertsStore();
  const audit = useAudit();
  const [filters, setFilters] = useState<AlertFilters>({ severities: new Set(), search: "", showAcked: true });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Alert | null>(null);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return alerts.filter(a => {
      const tone = severityBucket(a.rule.level);
      if (filters.severities.size && !filters.severities.has(tone)) return false;
      if (!filters.showAcked && store.alertMap[a.id]?.acknowledged) return false;
      if (q && !(a.id.toLowerCase().includes(q) || a.rule.description.toLowerCase().includes(q) || a.agent.name.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [filters, store]);

  const visibleIds = filtered.map(a => a.id);
  const columns: Column<Alert>[] = [
    {
      key: "time", header: "Time", width: "140px", sortable: true,
      sortValue: a => new Date(a.timestamp).getTime(),
      cell: a => <span className="text-sage" title={a.timestamp}>{formatRelativeTime(a.timestamp)}</span>
    },
    {
      key: "sev", header: "Severity", width: "150px",
      cell: a => <Badge tone={severityBucket(a.rule.level)} dot>{severityLabel(a.rule.level)} - {a.rule.level}</Badge>
    },
    {
      key: "rule", header: "Rule", width: "120px",
      cell: a => <span className="font-mono text-sage">{a.rule.id}</span>
    },
    {
      key: "desc", header: "Description", sortable: true,
      sortValue: a => a.rule.description,
      cell: a => <span className="text-cream truncate block max-w-[420px]">{a.rule.description}</span>
    },
    {
      key: "agent", header: "Agent", width: "180px",
      cell: a => <span className="font-mono text-sage">{a.agent.name}</span>
    },
    {
      key: "mitre", header: "MITRE", width: "180px",
      cell: a => a.rule.mitre ? <Badge tone="info">{a.rule.mitre.id} - {a.rule.mitre.tactic}</Badge> : <span className="text-navy-600/70">-</span>
    },
    {
      key: "ack", header: "", width: "40px",
      cell: a => store.alertMap[a.id]?.acknowledged
        ? <span title="Acknowledged" className="text-emerald-600 font-mono text-[10px]">ACK</span>
        : <span className="text-navy-600/70">-</span>
    }
  ];

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Operate" }, { label: "Alerts" }]}
      title="Alerts"
      description={`${alerts.length} events - ${criticalAlertCount} critical - ${range.label}`}
      actions={
        <>
          <Button variant="secondary" onClick={() => { audit.record({ scope: "alert", type: "alert.export_requested", summary: `Export requested for ${visibleIds.length} visible alerts`, meta: { count: visibleIds.length } }); toasts.push({ variant: "info", title: "Export started", description: "JSON download queued" }); }}>Export</Button>
          <Button variant="primary" onClick={() => { audit.record({ scope: "alert", type: "alert.bulk_ack_visible", summary: `Acknowledged all ${visibleIds.length} visible alerts`, outcome: "success", meta: { count: visibleIds.length, filterSeverities: [...filters.severities] } }); ack(visibleIds); toasts.push({ variant: "success", title: `Acknowledged ${visibleIds.length} alerts` }); }}>Acknowledge all visible</Button>
        </>
      }
    >
      <AlertFiltersBar value={filters} onChange={setFilters} />

      {selected.size > 0 && (
        <Card padded={false}>
          <div className="px-4 py-2 flex items-center justify-between border-b border-navy-400">
            <span className="text-xs text-sage">{selected.size} selected</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="primary" onClick={() => { audit.record({ scope: "alert", type: "alert.bulk_ack_selected", summary: `Acknowledged ${selected.size} selected alerts`, outcome: "success", meta: { count: selected.size, alertIds: [...selected] } }); ack([...selected]); toasts.push({ variant: "success", title: `Acknowledged ${selected.size}` }); setSelected(new Set()); }}>Acknowledge</Button>
              <Button size="sm" variant="secondary" onClick={() => { audit.record({ scope: "alert", type: "alert.bulk_escalate", summary: `Escalated ${selected.size} selected alerts to L2`, outcome: "requested", meta: { count: selected.size, alertIds: [...selected] } }); toasts.push({ variant: "warn", title: `Escalated ${selected.size}`, description: "PagerDuty incident created" }); }}>Escalate to L2</Button>
              <Button size="sm" variant="ghost" onClick={() => { audit.record({ scope: "alert", type: "alert.selection_clear", summary: `Cleared ${selected.size} selected alerts` }); setSelected(new Set()); }}>Clear</Button>
            </div>
          </div>
        </Card>
      )}

      <DataGrid
        columns={columns}
        rows={filtered}
        rowKey={a => a.id}
        onRowClick={a => setActive(a)}
        selectable
        selected={selected}
        onSelectionChange={setSelected}
        emptyState={
          <EmptyState
            title="No alerts match"
            description="Try removing severity filters or clearing the search."
            action={<Button variant="secondary" onClick={() => setFilters({ severities: new Set(), search: "", showAcked: true })}>Clear filters</Button>}
          />
        }
      />

      <AlertDrawer alert={active} open={!!active} onClose={() => setActive(null)} />
    </Page>
  );
}
