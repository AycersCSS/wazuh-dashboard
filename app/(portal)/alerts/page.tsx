"use client";
import { useMemo, useState } from "react";
import { Page, Card, DataGrid, Badge, Button, Drawer, EmptyState, type Column } from "@/components/ui";
import { useResource, usePortalAction } from "@/hooks/usePortalApi";
import { useToasts } from "@/components/providers/ToastProvider";
import type { Alert, Severity } from "@/lib/wazuh/types";

const SEVERITY_TONE: Record<Severity, "critical" | "high" | "medium" | "low" | "info"> = {
  critical: "critical", high: "high", medium: "medium", low: "low", info: "info"
};

function relativeTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AlertsPage() {
  const { data, loading, error, refresh } = useResource<Alert[]>("/api/wazuh/alerts");
  const action = usePortalAction();
  const toasts = useToasts();
  const [selected, setSelected] = useState<Alert | null>(null);

  const columns: Column<Alert>[] = useMemo(() => [
    {
      key: "time",  header: "Time", width: "9rem", sortable: true,
      sortValue: a => Date.parse(a.timestamp),
      cell: a => <span className="text-sage font-mono text-[11px]" title={a.timestamp}>{relativeTime(a.timestamp)}</span>
    },
    {
      key: "level", header: "Severity", width: "9rem",
      cell: a => <Badge tone={SEVERITY_TONE[a.level]} dot>{a.level}</Badge>,
      sortValue: a => a.level
    },
    {
      key: "rule",  header: "Rule", width: "8rem",
      cell: a => <span className="font-mono text-sage text-[11.5px]">{a.ruleId}</span>
    },
    {
      key: "desc",  header: "Description",
      cell: a => <span className="text-cream truncate block max-w-[420px]">{a.ruleDescription}</span>
    },
    {
      key: "agent", header: "Agent", width: "8rem",
      cell: a => <span className="font-mono text-sage text-[12px]">{a.agentName}</span>
    },
    {
      key: "status", header: "", width: "4rem",
      cell: a => a.acknowledged
        ? <span title="Acknowledged" className="text-emerald-400 font-mono text-[10px]">ACK</span>
        : a.archived
          ? <span className="text-navy-600 font-mono text-[10px]">ARC</span>
          : <span className="text-navy-600/70">-</span>
    }
  ], []);

  return (
    <Page
      breadcrumb={[{ label: "Monitor" }, { label: "Alerts" }]}
      title="Alerts"
      description={`${data?.length ?? 0} events`}
      actions={
        <Button variant="secondary" size="md" onClick={() => toasts.push({ variant: "info", title: "Export started", description: "JSON download queued" })}>
          Export
        </Button>
      }
    >
      <Card padded={false}>
        {loading && <div className="p-5 text-navy-600 text-sm">Loading...</div>}
        {error   && <div className="p-5 text-severity-critical text-sm">Failed: {error}</div>}
        {data && data.length === 0 && <EmptyState title="No alerts" description="Nothing has been detected for this tenant." />}
        {data && data.length > 0 && (
          <DataGrid columns={columns} rows={data} rowKey={a => a.id} onRowClick={setSelected} />
        )}
      </Card>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        width="lg"
        title={selected ? (
          <div className="flex items-center gap-2 min-w-0">
            <Badge tone={SEVERITY_TONE[selected.level]} dot>{selected.level}</Badge>
            <span className="font-mono text-xs text-navy-600 truncate">{selected.id}</span>
          </div>
        ) : ""}
        actions={selected && (
          <>
            {!selected.acknowledged && (
              <Button size="sm" variant="primary"
                onClick={async () => { if (await action("acknowledgeAlert", selected.id)) { setSelected({ ...selected, acknowledged: true }); refresh(); } }}>
                Acknowledge
              </Button>
            )}
            <Button size="sm" variant="secondary"
              onClick={async () => { if (await action("escalateAlert", selected.id)) refresh(); }}>
              Escalate
            </Button>
            {!selected.archived && (
              <Button size="sm" variant="ghost"
                onClick={async () => { if (await action("archiveAlert", selected.id)) { setSelected({ ...selected, archived: true }); refresh(); } }}>
                Archive
              </Button>
            )}
          </>
        )}
      >
        {selected && (
          <div className="space-y-3">
            <Field label="Description" value={selected.ruleDescription} />
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Field label="Time"     value={<span className="font-mono">{new Date(selected.timestamp).toLocaleString()}</span>} />
              <Field label="Rule ID"  value={<span className="font-mono">{selected.ruleId}</span>} />
              <Field label="Agent"    value={<span className="font-mono">{selected.agentName}</span>} />
              <Field label="Status" value={
                <span className="flex items-center gap-1.5">
                  <Badge tone={selected.acknowledged ? "low" : "info"} dot>{selected.acknowledged ? "ack" : "open"}</Badge>
                  {selected.archived && <Badge tone="neutral">archived</Badge>}
                </span>
              } />
            </div>
            {selected.mitre && (
              <Field label="MITRE" value={<span className="font-mono">{selected.mitre.tactic} - {selected.mitre.technique}</span>} />
            )}
            <div>
              <div className="text-xs text-navy-600 mb-1">Raw event</div>
              <pre className="text-xs bg-navy border border-navy-400 rounded-lg p-3 overflow-x-auto text-sage font-mono">
{JSON.stringify({
  id: selected.id,
  timestamp: selected.timestamp,
  rule: { id: selected.ruleId, description: selected.ruleDescription },
  agent: { id: selected.agentId, name: selected.agentName },
  mitre: selected.mitre
}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </Page>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-navy-600 font-semibold mb-1">{label}</div>
      <div className="text-sm text-cream">{value}</div>
    </div>
  );
}
