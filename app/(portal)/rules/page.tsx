"use client";
import { useMemo } from "react";
import { Page, Card, DataGrid, Badge, Button, EmptyState, type Column } from "@/components/ui";
import { useResource, usePortalAction } from "@/hooks/usePortalApi";
import type { Rule, Severity } from "@/lib/wazuh/types";

const SEV_TONE: Record<Severity, "critical" | "high" | "medium" | "low" | "info"> = {
  critical: "critical", high: "high", medium: "medium", low: "low", info: "info"
};

export default function RulesPage() {
  const { data, loading, error, refresh } = useResource<Rule[]>("/api/wazuh/rules");
  const action = usePortalAction();

  const columns: Column<Rule>[] = useMemo(() => [
    { key: "id",   header: "Rule",     cell: r => <span className="font-mono text-[11.5px] text-sage">{r.id}</span> },
    { key: "desc", header: "Description", cell: r => <span className="text-[12.5px] text-cream truncate block max-w-[420px]">{r.description}</span> },
    { key: "lvl",  header: "Level",    width: "5rem", cell: r => <Badge tone={SEV_TONE[r.level]} dot>{r.level}</Badge> },
    { key: "grp",  header: "Groups",   cell: r => <span className="font-mono text-[11px] text-navy-600">{r.group.join(", ")}</span> },
    { key: "en",   header: "Status",   width: "8rem",
      cell: r => (
        <Button
          size="sm"
          variant={r.enabled ? "secondary" : "primary"}
          onClick={async () => { if (await action("toggleRule", r.id)) refresh(); }}
        >
          {r.enabled ? "Enabled" : "Disabled"}
        </Button>
      )
    }
  ], [action, refresh]);

  return (
    <Page
      breadcrumb={[{ label: "Analyze" }, { label: "Rules" }]}
      title="Detection rules"
      description="Custom detection rules in use for this tenant."
    >
      <Card padded={false}>
        {loading && <div className="p-5 text-navy-600 text-sm">Loading...</div>}
        {error   && <div className="p-5 text-severity-critical text-sm">Failed: {error}</div>}
        {data && data.length === 0 && <EmptyState title="No rules" description="No rules are configured for this tenant." />}
        {data && data.length > 0 && (
          <DataGrid columns={columns} rows={data} rowKey={r => r.id} />
        )}
      </Card>
    </Page>
  );
}
