"use client";
import { Bug, Shield } from "lucide-react";
import { Page, Card, CardTitle, CardSubtitle, Badge } from "@/components/ui";
import { threatActors, mitreTactics } from "@/data/seed";

export default function ThreatIntelPage() {
  // Build a map of technique ID -> tactic
  const techToTactic = new Map<string, string>();
  mitreTactics.forEach(t => t.techniques.forEach(tech => techToTactic.set(tech, t.tactic)));

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Operate" }, { label: "Threat Intel" }]}
      icon={Bug}
      title="Threat Intel"
      description={`${threatActors.length} actors tracked - ${threatActors.reduce((s, a) => s + a.observed24h, 0)} sightings in last 24h`}
    >
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {threatActors.map(a => (
          <Card key={a.id} className="hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">{a.name}</div>
                <div className="text-xs text-slate-500">{a.id} - {a.origin}</div>
              </div>
              {a.observed24h > 0 && <Badge tone={a.observed24h > 8 ? "high" : "medium"} dot>{a.observed24h} sightings</Badge>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {a.targetSectors.map(s => <span key={s} className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] bg-slate-100 text-slate-600 border border-slate-200">{s}</span>)}
            </div>
            <div className="mt-3">
              <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">TTPs</div>
              <div className="flex flex-wrap gap-1">
                {a.ttps.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 h-5 px-1.5 rounded text-[10.5px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Shield size={10} /> {t}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </section>

      <Card padded={false}>
        <div className="px-4 h-11 flex items-center border-b border-slate-200">
          <div>
            <CardTitle>All tracked techniques</CardTitle>
            <CardSubtitle>Click a chip to filter the coverage map</CardSubtitle>
          </div>
        </div>
        <div className="p-4 flex flex-wrap gap-1.5">
          {Array.from(new Set(threatActors.flatMap(a => a.ttps))).map(t => (
            <span key={t} className="inline-flex items-center gap-1 h-6 px-2 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
              {t} <span className="text-slate-500">- {techToTactic.get(t) ?? "?"}</span>
            </span>
          ))}
        </div>
      </Card>
    </Page>
  );
}
