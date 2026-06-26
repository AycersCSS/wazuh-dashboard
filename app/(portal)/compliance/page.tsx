"use client";
import { useMemo } from "react";
import { Page, Card, CardTitle, CardSubtitle, Badge, EmptyState } from "@/components/ui";
import { useResource } from "@/hooks/usePortalApi";
import type { ComplianceControl } from "@/lib/wazuh/types";
import { cn } from "@/lib/cn";

const STATUS_TONE = { pass: "low", fail: "high", unknown: "neutral" } as const;

export default function CompliancePage() {
  const { data, loading, error } = useResource<ComplianceControl[]>("/api/wazuh/compliance");

  const grouped = useMemo(() => {
    const map = new Map<string, ComplianceControl[]>();
    for (const c of data ?? []) {
      const list = map.get(c.framework) ?? [];
      list.push(c);
      map.set(c.framework, list);
    }
    return Array.from(map.entries());
  }, [data]);

  return (
    <Page
      breadcrumb={[{ label: "Analyze" }, { label: "Compliance" }]}
      title="Compliance"
      description="Framework coverage and evidence counts for this tenant."
    >
      {loading && <Card><div className="text-navy-600 text-sm">Loading...</div></Card>}
      {error   && <Card><div className="text-severity-critical text-sm">Failed: {error}</div></Card>}
      {!loading && !error && grouped.length === 0 && (
        <Card><EmptyState title="No controls" description="No compliance data for this tenant." /></Card>
      )}
      <div className="space-y-4">
        {grouped.map(([framework, controls]) => {
          const pass = controls.filter(c => c.status === "pass").length;
          const total = controls.length;
          const pct = total ? Math.round((pass / total) * 100) : 0;
          return (
            <Card key={framework}
              header={
                <>
                  <div>
                    <CardTitle>{framework}</CardTitle>
                    <CardSubtitle>{pass} of {total} controls passing</CardSubtitle>
                  </div>
                  <Badge tone={pct >= 80 ? "low" : pct >= 50 ? "medium" : "high"}>{pct}%</Badge>
                </>
              }
            >
              <div className="h-1.5 w-full bg-navy-400 rounded overflow-hidden mb-3">
                <div className={cn(
                  "h-full",
                  pct >= 80 ? "bg-emerald-400" : pct >= 50 ? "bg-severity-medium" : "bg-severity-high"
                )} style={{ width: `${pct}%` }} />
              </div>
              <ul className="divide-y divide-navy-400/60">
                {controls.map(c => (
                  <li key={c.id} className="py-2 flex items-center gap-3 text-[12.5px]">
                    <Badge tone={STATUS_TONE[c.status]} dot>{c.status}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-cream truncate">{c.control}</div>
                      <div className="text-[10.5px] text-navy-600 truncate">{c.description}</div>
                    </div>
                    <span className="font-mono text-[11px] text-navy-600 shrink-0">{c.evidence} evidence</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}
