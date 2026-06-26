"use client";
import { Page, Card, EmptyState } from "@/components/ui";
import { useResource } from "@/hooks/usePortalApi";
import type { MitreTactic } from "@/lib/wazuh/types";
import { cn } from "@/lib/cn";

export default function MitrePage() {
  const { data, loading, error } = useResource<MitreTactic[]>("/api/wazuh/mitre");
  return (
    <Page
      breadcrumb={[{ label: "Analyze" }, { label: "MITRE ATT&CK" }]}
      title="MITRE ATT&CK"
      description="Detections mapped to the ATT&CK framework."
    >
      {loading && <Card><div className="text-navy-600 text-sm">Loading...</div></Card>}
      {error   && <Card><div className="text-severity-critical text-sm">Failed: {error}</div></Card>}
      {data && data.length === 0 && <Card><EmptyState title="No data" /></Card>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {data?.map(t => {
          const pct = t.total ? Math.round((t.detected / t.total) * 100) : 0;
          return (
            <Card key={t.id} className="!p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-sm font-semibold text-cream truncate">{t.name}</div>
                <span className="text-[10.5px] font-mono text-navy-600 shrink-0 ml-2">{t.detected}/{t.total}</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-navy-600 font-semibold">{t.id}</div>
              <div className="h-1 w-full bg-navy-400 rounded mt-2 overflow-hidden">
                <div className={cn(
                  "h-full",
                  pct >= 50 ? "bg-emerald-400" : pct >= 20 ? "bg-severity-medium" : "bg-severity-high"
                )} style={{ width: `${pct}%` }} />
              </div>
              <ul className="mt-2 space-y-0.5">
                {t.techniques.map(tech => (
                  <li key={tech.id} className="text-[10.5px] flex items-center gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full", tech.detected ? "bg-severity-high" : "bg-navy-400")} />
                    <span className={cn("font-mono", tech.detected ? "text-cream" : "text-navy-600")}>{tech.id}</span>
                    <span className={tech.detected ? "text-sage" : "text-navy-600"}>- {tech.name}</span>
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
