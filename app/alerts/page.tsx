"use client";
import { useState, useMemo } from "react";
import { Page, DataGrid, type Column, Button, Card, EmptyState } from "@/components/ui";
import { ShieldCheck, Download, ShieldAlert } from "lucide-react";
import { alerts } from "@/data/seed";
import { useTimeRange } from "@/hooks/useTimeRange";
import { useToasts } from "@/hooks/useToasts";
import { useAcknowledge, useAlertsStore } from "@/hooks/useAlertsStore";
import { severityBucket, severityLabel } from "@/types";
import { formatRelativeTime } from "@/lib/format";
import { Badge } from "@/components/ui";
import { AlertDrawer } from "./AlertDrawer";
import { AlertFiltersBar, type AlertFilters } from "./AlertFilters";
import type { Alert } from "@/types";

const TONE: Record<string, "critical" | "high" | "medium" | "low" | "info"> = {
  critical: "critical", high: "high", medium: "medium", low: "low", info: "info"
};

export default function AlertsPage() {
  const toasts = useToasts();
  const { range } = useTimeRange();
  const ack = useAcknowledge();
  const store = useAlertsStore();
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
      cell: a => <span className="text-slate-600" title={a.timestamp}>{formatRelativeTime(a.timestamp)}</span>
    },
    {
      key: "sev", header: "Severity", width: "150px",
      cell: a => <Badge tone={TONE[severityBucket(a.rule.level)]} dot>{severityLabel(a.rule.level)} - {a.rule.level}</Badge>
    },
    {
      key: "rule", header: "Rule", width: "120px",
      cell: a => <span className="font-mono text-slate-600">{a.rule.id}</span>
    },
    {
      key: "desc", header: "Description", sortable: true,
      sortValue: a => a.rule.description,
      cell: a => <span className="text-slate-900 truncate block max-w-[420px]">{a.rule.description}</span>
    },
    {
      key: "agent", header: "Agent", width: "180px",
      cell: a => <span className="font-mono text-slate-600">{a.agent.name}</span>
    },
    {
      key: "mitre", header: "MITRE", width: "180px",
      cell: a => a.rule.mitre ? <Badge tone="info">{a.rule.mitre.id} - {a.rule.mitre.tactic}</Badge> : <span className="text-slate-300">-</span>
    },
    {
      key: "ack", header: "", width: "40px",
      cell: a => store.alertMap[a.id]?.acknowledged
        ? <span title="Acknowledged" className="inline-flex items-center text-emerald-600"><ShieldCheck size={14} /></span>
        : <span className="text-slate-300">-</span>
    }
  ];

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Operate" }, { label: "Alerts" }]}
      icon={ShieldAlert}
      title="Alerts"
      description={`${alerts.length} events - ${alerts.filter(a => a.rule.level >= 13).length} critical - ${range.label}`}
      actions={
        <>
          <Button variant="secondary" icon={<Download size={14} />} onClick={() => toasts.push({ variant: "info", title: "Export started", description: "JSON download queued" })}>Export</Button>
          <Button variant="primary" onClick={() => { ack(visibleIds); toasts.push({ variant: "success", title: `Acknowledged ${visibleIds.length} alerts` }); }}>Acknowledge all visible</Button>
        </>
      }
    >
      <AlertFiltersBar value={filters} onChange={setFilters} />

      {selected.size > 0 && (
        <Card padded={false}>
          <div className="px-4 py-2 flex items-center justify-between border-b border-slate-200">
            <span className="text-xs text-slate-600">{selected.size} selected</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="primary" onClick={() => { ack([...selected]); toasts.push({ variant: "success", title: `Acknowledged ${selected.size}` }); setSelected(new Set()); }}>Acknowledge</Button>
              <Button size="sm" variant="secondary" onClick={() => toasts.push({ variant: "warn", title: `Escalated ${selected.size}`, description: "PagerDuty incident created" })}>Escalate to L2</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
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
            icon={ShieldAlert}
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
