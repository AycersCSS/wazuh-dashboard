"use client";
import { useMemo, useState } from "react";
import { Page, Card, DataGrid, Badge, Button, Drawer, ConfirmDialog, EmptyState, type Column } from "@/components/ui";
import { useResource, usePortalAction } from "@/hooks/usePortalApi";
import { useToasts } from "@/components/providers/ToastProvider";
import type { Agent, AgentStatus } from "@/lib/wazuh/types";

const STATUS_TONE: Record<AgentStatus, "low" | "medium" | "high" | "info" | "neutral"> = {
  active: "low", disconnected: "medium", pending: "info", isolated: "high"
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

export default function AgentsPage() {
  const { data, loading, error, refresh } = useResource<Agent[]>("/api/wazuh/agents");
  const action = usePortalAction();
  const toasts = useToasts();
  const [selected, setSelected] = useState<Agent | null>(null);
  const [confirmIsolate, setConfirmIsolate] = useState<Agent | null>(null);
  const [confirmRestart, setConfirmRestart] = useState<Agent | null>(null);

  const columns: Column<Agent>[] = useMemo(() => [
    { key: "name", header: "Name", cell: a => <span className="font-mono text-[12.5px] text-cream">{a.name}</span> },
    { key: "ip",   header: "IP",   cell: a => <span className="font-mono text-[11.5px] text-sage">{a.ip}</span> },
    { key: "os",   header: "OS",   cell: a => <span className="text-[12.5px] text-sage">{a.os}</span> },
    { key: "ver",  header: "Version", cell: a => <span className="font-mono text-[11.5px] text-navy-600">{a.version}</span> },
    { key: "seen", header: "Last seen", cell: a => <span className="font-mono text-[11px] text-navy-600">{relativeTime(a.lastSeenAt)}</span> },
    { key: "stat", header: "Status", width: "8rem",
      cell: a => <Badge tone={STATUS_TONE[a.status]} dot>{a.status}</Badge>,
      sortValue: a => a.status
    }
  ], []);

  return (
    <Page
      breadcrumb={[{ label: "Monitor" }, { label: "Agents" }]}
      title="Agents"
      description={`${data?.length ?? 0} endpoints under management`}
    >
      <Card padded={false}>
        {loading && <div className="p-5 text-navy-600 text-sm">Loading...</div>}
        {error   && <div className="p-5 text-severity-critical text-sm">Failed: {error}</div>}
        {data && data.length === 0 && <EmptyState title="No agents" description="No endpoints are registered for this tenant." />}
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
            <div className="w-8 h-8 rounded-lg bg-navy-200 border border-navy-400 grid place-items-center text-[10px] font-mono text-sage">
              {selected.os.split(" ")[0]!.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-mono text-cream truncate">{selected.name}</div>
              <div className="text-[11px] font-mono text-navy-600 truncate">{selected.ip} - {selected.os}</div>
            </div>
          </div>
        ) : ""}
        actions={selected && (
          <>
            {selected.status === "isolated" ? (
              <Button size="sm" variant="primary" onClick={async () => { if (await action("unisolateAgent", selected.id)) { setSelected({ ...selected, status: "active" }); refresh(); } }}>
                Unisolate
              </Button>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setConfirmIsolate(selected)}>
                Isolate
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setConfirmRestart(selected)}>
              Restart
            </Button>
          </>
        )}
      >
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <KV label="Status"   value={<Badge tone={STATUS_TONE[selected.status]} dot>{selected.status}</Badge>} />
              <KV label="Last seen" value={<span className="font-mono">{new Date(selected.lastSeenAt).toLocaleString()}</span>} />
              <KV label="Version"  value={<span className="font-mono">{selected.version}</span>} />
              <KV label="IP"       value={<span className="font-mono">{selected.ip}</span>} />
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!confirmIsolate}
        onClose={() => setConfirmIsolate(null)}
        onConfirm={async () => {
          if (!confirmIsolate) return;
          if (await action("isolateAgent", confirmIsolate.id)) {
            setSelected(prev => prev && prev.id === confirmIsolate.id ? { ...prev, status: "isolated" } : prev);
            setConfirmIsolate(null);
            refresh();
            toasts.push({ variant: "warn", title: "Agent isolated", description: confirmIsolate.name });
          }
        }}
        title={`Isolate ${confirmIsolate?.name ?? ""}?`}
        body="This will block all network traffic to and from the agent. The action is logged and auditable."
        confirmLabel="Isolate"
        danger
      />

      <ConfirmDialog
        open={!!confirmRestart}
        onClose={() => setConfirmRestart(null)}
        onConfirm={async () => {
          if (!confirmRestart) return;
          if (await action("restartAgent", confirmRestart.id)) {
            setConfirmRestart(null);
            refresh();
            toasts.push({ variant: "info", title: "Restart requested", description: `${confirmRestart.name} - will report in ~60s` });
          }
        }}
        title={`Restart ${confirmRestart?.name ?? ""}?`}
        body="The Wazuh agent process will be asked to restart. Connectivity may briefly drop."
        confirmLabel="Restart"
      />
    </Page>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-navy-600 font-semibold mb-1">{label}</div>
      <div className="text-sm text-cream">{value}</div>
    </div>
  );
}
