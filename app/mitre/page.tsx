"use client";
import { useMemo, useState } from "react";
import { Boxes } from "lucide-react";
import { Page, Card, CardTitle, CardSubtitle, Badge, Button } from "@/components/ui";
import { alerts, mitreTactics } from "@/data/seed";
import { cn } from "@/lib/cn";

export default function MitrePage() {
  const [active, setActive] = useState<string | null>(null);

  // Compute count per (tactic, technique) from alerts
  const matrix = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    mitreTactics.forEach(t => m.set(t.id, new Map()));
    alerts.forEach(a => {
      const mi = a.rule.mitre;
      if (!mi) return;
      const cell = m.get(mi.id);
      if (cell) cell.set(mi.technique, (cell.get(mi.technique) ?? 0) + 1);
    });
    return m;
  }, []);

  const observedTactics = useMemo(() => {
    return mitreTactics
      .map(t => {
        const cell = matrix.get(t.id)!;
        const total = [...cell.values()].reduce((s, n) => s + n, 0);
        return { id: t.id, tactic: t.tactic, techniques: t.techniques, total };
      })
      .sort((a, b) => a.total - b.total);
  }, [matrix]);

  const max = Math.max(1, ...[...matrix.values()].flatMap(m => [...m.values()]));
  const activeTactic = active ? observedTactics.find(t => t.id === active) : null;

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Analyze" }, { label: "MITRE ATT&CK" }]}
      icon={Boxes}
      title="MITRE ATT&CK"
      description="12 tactics - alert volume by technique - click a cell to filter"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="lg:col-span-2" padded={false}>
          <div className="px-4 h-11 flex items-center justify-between border-b border-slate-200">
            <div>
              <CardTitle>Coverage heatmap</CardTitle>
              <CardSubtitle>Cell intensity = alert count in last 24h</CardSubtitle>
            </div>
            <div className="text-[10.5px] text-slate-500 flex items-center gap-1.5">
              <span>low</span>
              <span className="w-12 h-1.5 rounded-full bg-gradient-to-r from-indigo-100 to-indigo-700" />
              <span>high</span>
            </div>
          </div>
          <div className="p-4 space-y-1.5">
            {observedTactics.map(t => {
              const cell = matrix.get(t.id)!;
              const isActive = active === t.id;
              return (
                <div key={t.id} className={cn("grid items-center gap-2 py-1 px-2 rounded-md", isActive ? "bg-indigo-50" : "hover:bg-slate-50")} style={{ gridTemplateColumns: "200px 1fr 60px" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10.5px] font-mono text-slate-500">{t.id}</span>
                    <span className="text-sm text-slate-900 truncate">{t.tactic}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {t.techniques.map(tech => {
                      const count = cell.get(tech) ?? 0;
                      const intensity = count / max;
                      return (
                        <button
                          key={tech}
                          type="button"
                          onClick={() => setActive(t.id)}
                          title={`${tech} - ${count} alerts`}
                          aria-label={`${tech} - ${count} alerts`}
                          className="h-6 flex-1 rounded border border-slate-200"
                          style={{ background: `rgba(79, 70, 229, ${0.05 + intensity * 0.95})` }}
                        />
                      );
                    })}
                  </div>
                  <div className="text-right text-xs font-mono text-slate-700">{t.total}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card padded={false}>
          {activeTactic ? (
            <>
              <div className="px-4 h-11 flex items-center justify-between border-b border-slate-200">
                <div>
                  <CardTitle>{activeTactic.tactic}</CardTitle>
                  <CardSubtitle>{activeTactic.id}</CardSubtitle>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setActive(null)} aria-label="Clear tactic selection">Clear</Button>
              </div>
              <ul className="p-3 space-y-2">
                {activeTactic.techniques.map(tech => {
                  const count = matrix.get(activeTactic.id)?.get(tech) ?? 0;
                  return (
                    <li key={tech} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-slate-700">{tech}</span>
                      <span className="ml-auto font-mono text-slate-900">{count}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="p-4">
              <div className="text-sm font-semibold text-slate-900">Click any row</div>
              <p className="text-xs text-slate-500 mt-1">Select a tactic to see its observed techniques and counts.</p>
              <div className="mt-4 text-xs text-slate-500">Weakest 3 tactics:</div>
              <ul className="mt-2 space-y-1">
                {observedTactics.slice(0, 3).map(t => (
                  <li key={t.id} className="flex items-center gap-2 text-xs">
                    <Badge tone="medium" dot>{t.id}</Badge>
                    <span className="text-slate-700">{t.tactic}</span>
                    <span className="ml-auto font-mono text-slate-500">{t.total}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}
