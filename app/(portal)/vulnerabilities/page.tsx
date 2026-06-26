"use client";
import { useMemo, useState } from "react";
import { Page, Card, DataGrid, Badge, Button, Drawer, EmptyState, type Column } from "@/components/ui";
import { useResource, usePortalAction } from "@/hooks/usePortalApi";
import type { Vulnerability, Severity, VulnState } from "@/lib/wazuh/types";

const SEV_TONE: Record<Severity, "critical" | "high" | "medium" | "low" | "info"> = {
  critical: "critical", high: "high", medium: "medium", low: "low", info: "info"
};

const NEXT: Record<VulnState, VulnState | null> = {
  open:        "in_progress",
  in_progress: "patched",
  patched:     null,
  wont_fix:    null
};

const STATE_TONE: Record<VulnState, "critical" | "medium" | "low" | "neutral"> = {
  open:        "critical",
  in_progress: "medium",
  patched:     "low",
  wont_fix:    "neutral"
};

export default function VulnerabilitiesPage() {
  const { data, loading, error, refresh } = useResource<Vulnerability[]>("/api/wazuh/vulnerabilities");
  const action = usePortalAction();
  const [selected, setSelected] = useState<Vulnerability | null>(null);

  const columns: Column<Vulnerability>[] = useMemo(() => [
    { key: "cve",   header: "CVE", width: "9rem", cell: v => <span className="font-mono text-[11.5px] text-sage">{v.cveId}</span> },
    { key: "sev",   header: "Severity", width: "9rem", cell: v => <Badge tone={SEV_TONE[v.severity]} dot>{v.severity}</Badge>, sortValue: v => v.cvss },
    { key: "title", header: "Title", cell: v => <span className="text-[12.5px] text-cream truncate block max-w-[420px]">{v.title}</span> },
    { key: "pkg",   header: "Package", width: "8rem", cell: v => <span className="font-mono text-[11.5px] text-navy-600">{v.package}</span> },
    { key: "agent", header: "Agent", width: "8rem", cell: v => <span className="font-mono text-[11.5px] text-sage">{v.agentName}</span> },
    { key: "state", header: "Status", width: "8rem", cell: v => <Badge tone={STATE_TONE[v.status]}>{v.status}</Badge> }
  ], []);

  return (
    <Page
      breadcrumb={[{ label: "Monitor" }, { label: "Vulnerabilities" }]}
      title="Vulnerabilities"
      description={`${data?.length ?? 0} CVEs across the fleet`}
    >
      <Card padded={false}>
        {loading && <div className="p-5 text-navy-600 text-sm">Loading...</div>}
        {error   && <div className="p-5 text-severity-critical text-sm">Failed: {error}</div>}
        {data && data.length === 0 && <EmptyState title="No CVEs" description="No vulnerabilities reported for this tenant." />}
        {data && data.length > 0 && (
          <DataGrid columns={columns} rows={data} rowKey={v => v.id} onRowClick={setSelected} />
        )}
      </Card>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        width="lg"
        title={selected ? (
          <div className="flex items-center gap-2 min-w-0">
            <Badge tone={SEV_TONE[selected.severity]} dot>{selected.severity}</Badge>
            <span className="font-mono text-xs text-sage truncate">{selected.cveId}</span>
          </div>
        ) : ""}
        actions={selected && (
          <>
            {NEXT[selected.status] && (
              <Button size="sm" variant="primary"
                onClick={async () => {
                  const next = NEXT[selected.status]!;
                  if (await action("setVulnStatus", selected.id, { status: next })) {
                    setSelected({ ...selected, status: next });
                    refresh();
                  }
                }}
              >
                Mark {NEXT[selected.status]!.replace("_", " ")}
              </Button>
            )}
            {selected.status !== "wont_fix" && (
              <Button size="sm" variant="ghost"
                onClick={async () => {
                  if (await action("setVulnStatus", selected.id, { status: "wont_fix" })) {
                    setSelected({ ...selected, status: "wont_fix" });
                    refresh();
                  }
                }}
              >
                Won&apos;t fix
              </Button>
            )}
          </>
        )}
      >
        {selected && (
          <div className="space-y-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-navy-600 font-semibold mb-1">Title</div>
              <div className="text-sm text-cream">{selected.title}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <KV label="CVSS"    value={<span className="font-mono">{selected.cvss.toFixed(1)}</span>} />
              <KV label="Package" value={<span className="font-mono">{selected.package}</span>} />
              <KV label="Agent"   value={<span className="font-mono">{selected.agentName}</span>} />
              <KV label="Status"  value={<Badge tone={STATE_TONE[selected.status]}>{selected.status}</Badge>} />
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-navy-600 font-semibold mb-1">Published</div>
              <div className="text-sm text-sage font-mono">{new Date(selected.publishedAt).toLocaleDateString()}</div>
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
