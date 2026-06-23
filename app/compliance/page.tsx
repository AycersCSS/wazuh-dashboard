"use client";
import { useState, useMemo } from "react";
import { GitBranch, ChevronDown, ChevronRight } from "lucide-react";
import { Page, Card, CardTitle, CardSubtitle, Badge, EmptyState } from "@/components/ui";
import { compliance } from "@/data/seed";
import type { ComplianceControl } from "@/types";

const frameworkOrder: ComplianceControl["framework"][] = ["PCI DSS", "HIPAA", "GDPR", "NIST 800-53", "ISO 27001"];

function pct(pass: number, total: number) { return total ? Math.round((pass / total) * 100) : 0; }

export default function CompliancePage() {
  const [open, setOpen] = useState<Record<string, boolean>>({ "PCI DSS": true, "HIPAA": true });

  const groups = useMemo(() => {
    const m = new Map<ComplianceControl["framework"], ComplianceControl[]>();
    frameworkOrder.forEach(f => m.set(f, []));
    compliance.forEach(c => m.get(c.framework)!.push(c));
    return m;
  }, []);

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Analyze" }, { label: "Compliance" }]}
      icon={GitBranch}
      title="Compliance"
      description="Weighted across PCI DSS, HIPAA, GDPR, NIST 800-53, and ISO 27001"
    >
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[...groups.entries()].slice(0, 4).map(([fw, ctrls]) => {
          const pass = ctrls.reduce((s, c) => s + c.pass, 0);
          const total = ctrls.reduce((s, c) => s + c.total, 0);
          const p = pct(pass, total);
          return (
            <Card key={fw}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">{fw}</div>
                <Badge tone={p >= 90 ? "low" : p >= 75 ? "medium" : "high"} dot>{p}%</Badge>
              </div>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${p >= 90 ? "bg-emerald-500" : p >= 75 ? "bg-amber-500" : "bg-orange-500"}`} style={{ width: `${p}%` }} />
              </div>
              <div className="mt-2 text-xs text-slate-500">{ctrls.length} controls - {pass}/{total} checks pass</div>
            </Card>
          );
        })}
      </section>

      <Card padded={false}>
        {[...groups.entries()].map(([fw, ctrls]) => {
          const isOpen = open[fw] ?? false;
          return (
            <div key={fw}>
              <button
                type="button"
                onClick={() => setOpen(o => ({ ...o, [fw]: !o[fw] }))}
                className="w-full flex items-center justify-between gap-3 px-4 h-12 border-b border-slate-200 hover:bg-slate-50">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {fw}
                </div>
                <div className="text-xs text-slate-500">{ctrls.length} controls</div>
              </button>
              {isOpen && (
                <ul className="divide-y divide-slate-100">
                  {ctrls.map(c => {
                    const p = pct(c.pass, c.total);
                    return (
                      <li key={c.control} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-mono text-slate-900">{c.control}</div>
                            <div className="text-xs text-slate-600 mt-0.5">{c.title}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-mono text-slate-900">{p}%</div>
                            <div className="text-[11px] text-slate-500">{c.pass}/{c.total} pass</div>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${p}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </Card>
    </Page>
  );
}
