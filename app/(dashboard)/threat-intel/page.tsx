"use client";
import { Page, Card, CardTitle, CardSubtitle, Badge } from "@/components/ui";
import { useWazuhResource, buildPath } from "@/lib/wazuh";
import type { WazuhThreatActor } from "@/lib/wazuh";
import { mitreTactics } from "@/data/seed";

export default function ThreatIntelPage() {
  const techToTactic = new Map<string, string>();
  mitreTactics.forEach(t => t.techniques.forEach(tech => techToTactic.set(tech, t.tactic)));

  // TODO(replace-when-endpoint-ready): GET /threat-intel/actors
  const { data } = useWazuhResource<{ actors: WazuhThreatActor[]; total: number }>(
    buildPath("/api/wazuh/threat-actors", { limit: 100 })
  );
  const threatActors = data?.actors ?? [];
  const totalSightings = threatActors.reduce((s, a) => s + a.observed24h, 0);

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Operate" }, { label: "Threat Intel" }]}
      title="Threat Intel"
      description={`${threatActors.length} actors tracked - ${totalSightings} sightings in last 24h`}
    >
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {threatActors.map(a => (
          <Card key={a.id} className="hover:border-navy-500 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-cream">{a.name}</div>
                <div className="text-xs text-navy-600">{a.id} - {a.origin}</div>
              </div>
              {a.observed24h > 0 && <Badge tone={a.observed24h > 8 ? "high" : "medium"} dot>{a.observed24h} sightings</Badge>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {a.targetSectors.map(s => <span key={s} className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] bg-navy-200 text-sage border border-navy-400">{s}</span>)}
            </div>
            <div className="mt-3">
              <div className="text-[10.5px] uppercase tracking-wider text-navy-600 font-semibold mb-1.5">TTPs</div>
              <div className="flex flex-wrap gap-1">
                {a.ttps.map(t => (
                  <span key={t} className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] bg-severity-info/15 text-severity-info border border-severity-info/40">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </section>

      <Card padded={false}>
        <div className="px-4 h-11 flex items-center border-b border-navy-400">
          <div>
            <CardTitle>All tracked techniques</CardTitle>
            <CardSubtitle>Click a chip to filter the coverage map</CardSubtitle>
          </div>
        </div>
        <div className="p-4 flex flex-wrap gap-1.5">
          {Array.from(new Set(threatActors.flatMap(a => a.ttps))).map(t => (
            <span key={t} className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs bg-navy-200 text-sage border border-navy-400">
              {t} <span className="text-navy-600">- {techToTactic.get(t) ?? "?"}</span>
            </span>
          ))}
        </div>
      </Card>
    </Page>
  );
}
