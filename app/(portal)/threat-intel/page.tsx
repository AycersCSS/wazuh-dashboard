"use client";
import { Page, Card, CardTitle, CardSubtitle, Badge, EmptyState } from "@/components/ui";
import { useResource } from "@/hooks/usePortalApi";
import type { ThreatActor, Severity } from "@/lib/wazuh/types";

const SEV_TONE: Record<Severity, "critical" | "high" | "medium" | "low" | "info"> = {
  critical: "critical", high: "high", medium: "medium", low: "low", info: "info"
};

export default function ThreatIntelPage() {
  const { data, loading, error } = useResource<ThreatActor[]>("/api/wazuh/threat-intel");
  return (
    <Page
      breadcrumb={[{ label: "Analyze" }, { label: "Threat intel" }]}
      title="Threat intelligence"
      description="Actors currently relevant to your sector."
    >
      {loading && <Card><div className="text-navy-600 text-sm">Loading...</div></Card>}
      {error   && <Card><div className="text-severity-critical text-sm">Failed: {error}</div></Card>}
      {data && data.length === 0 && <Card><EmptyState title="No actors" /></Card>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data?.map(a => (
          <Card key={a.id}
            header={
              <>
                <div className="min-w-0">
                  <CardTitle>{a.name}</CardTitle>
                  <CardSubtitle>{a.origin}</CardSubtitle>
                </div>
                <Badge tone={SEV_TONE[a.severity]} dot>{a.severity}</Badge>
              </>
            }
          >
            <p className="text-[12px] text-sage leading-relaxed">{a.description}</p>
            <div className="text-[10.5px] text-navy-600 mt-3 pt-3 border-t border-navy-400">
              <div>Targets: {a.targets.join(", ")}</div>
              <div className="font-mono mt-0.5">Last seen {new Date(a.lastSeen).toLocaleDateString()}</div>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}
