"use client";
import { useMemo, useState } from "react";
import { Page, Card, DataGrid, Badge, Button, Drawer, EmptyState, type Column } from "@/components/ui";
import { useResource, usePortalAction } from "@/hooks/usePortalApi";
import type { FimEvent, FimReviewState } from "@/lib/wazuh/types";

const ACTION_TONE = { added: "low", modified: "medium", deleted: "high" } as const;
const REVIEW_TONE: Record<FimReviewState, "neutral" | "medium" | "low"> = {
  unreviewed: "medium",
  in_review:  "neutral",
  reviewed:   "low"
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

export default function FimPage() {
  const { data, loading, error, refresh } = useResource<FimEvent[]>("/api/wazuh/fim");
  const action = usePortalAction();
  const [selected, setSelected] = useState<FimEvent | null>(null);

  const columns: Column<FimEvent>[] = useMemo(() => [
    { key: "time",  header: "Time", width: "9rem",  cell: e => <span className="font-mono text-[11px] text-navy-600">{relativeTime(e.timestamp)}</span>, sortValue: e => Date.parse(e.timestamp) },
    { key: "agent", header: "Agent", width: "8rem", cell: e => <span className="font-mono text-[12px] text-sage">{e.agentName}</span> },
    { key: "file",  header: "File", cell: e => <span className="font-mono text-[11.5px] text-cream truncate block max-w-md">{e.file}</span> },
    { key: "act",   header: "Action", width: "6rem", cell: e => <Badge tone={ACTION_TONE[e.action]} dot>{e.action}</Badge> },
    { key: "rev",   header: "Review", width: "7rem", cell: e => <Badge tone={REVIEW_TONE[e.review]}>{e.review}</Badge> }
  ], []);

  return (
    <Page
      breadcrumb={[{ label: "Monitor" }, { label: "File integrity" }]}
      title="File integrity"
      description="File system changes detected on tenant endpoints."
    >
      <Card padded={false}>
        {loading && <div className="p-5 text-navy-600 text-sm">Loading...</div>}
        {error   && <div className="p-5 text-severity-critical text-sm">Failed: {error}</div>}
        {data && data.length === 0 && <EmptyState title="No events" description="No file integrity events for this tenant." />}
        {data && data.length > 0 && (
          <DataGrid columns={columns} rows={data} rowKey={e => e.id} onRowClick={setSelected} />
        )}
      </Card>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        width="lg"
        title={selected ? (
          <div className="flex items-center gap-2 min-w-0">
            <Badge tone={ACTION_TONE[selected.action]} dot>{selected.action}</Badge>
            <span className="font-mono text-xs text-navy-600 truncate">{selected.id}</span>
          </div>
        ) : ""}
        actions={selected && selected.review !== "reviewed" && (
          <Button size="sm" variant="primary"
            onClick={async () => { if (await action("markFimReviewed", selected.id)) { setSelected({ ...selected, review: "reviewed" }); refresh(); } }}>
            Mark reviewed
          </Button>
        )}
      >
        {selected && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <KV label="Time"   value={<span className="font-mono">{new Date(selected.timestamp).toLocaleString()}</span>} />
              <KV label="Agent"  value={<span className="font-mono">{selected.agentName}</span>} />
              <KV label="Action" value={<Badge tone={ACTION_TONE[selected.action]} dot>{selected.action}</Badge>} />
              <KV label="Review" value={<Badge tone={REVIEW_TONE[selected.review]}>{selected.review}</Badge>} />
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-navy-600 font-semibold mb-1">File</div>
              <pre className="text-xs font-mono bg-navy border border-navy-400 rounded-lg p-3 overflow-x-auto text-cream whitespace-pre-wrap break-all">{selected.file}</pre>
            </div>
          </div>
        )}
      </Drawer>
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
