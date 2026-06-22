"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { CheckCircle2, XCircle, FileText, Download } from "lucide-react";
import { Card, StatCard } from "@/components/ui";
import { compliance } from "@/data/seed";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useToasts } from "@/hooks/useToasts";
import { Modal } from "@/components/Modal";

const frameworks = ["All", "PCI DSS", "HIPAA", "GDPR", "NIST 800-53", "ISO 27001"] as const;
type Fw = typeof frameworks[number];

export default function CompliancePage() {
  const toasts = useToasts();
  const [fw, setFw] = useState<Fw>("All");
  const [generating, setGenerating] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const filtered = fw === "All" ? compliance : compliance.filter(c => c.framework === fw);
  const summary = filtered.reduce(
    (s, c) => ({ pass: s.pass + c.pass, fail: s.fail + c.fail, total: s.total + c.total }),
    { pass: 0, fail: 0, total: 0 }
  );
  const score = summary.total ? (summary.pass / summary.total) * 100 : 0;
  const chartData = filtered.map(c => ({
    name: c.control,
    title: c.title,
    framework: c.framework,
    pass: c.pass,
    fail: c.fail,
    pct: (c.pass / c.total) * 100
  }));

  function generateReport(format: "pdf" | "csv") {
    setGenerating(true);
    toasts.push({ variant: "info", title: `Generating ${format.toUpperCase()} report`, description: `${fw} · ${summary.total} controls` });
    setTimeout(() => {
      setGenerating(false);
      setReportOpen(false);
      toasts.push({ variant: "success", title: "Report ready", description: `compliance-${fw.toLowerCase().replace(/\s+/g,"-")}.${format} sent to your email` });
    }, 1200);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted font-mono uppercase tracking-wider">
            <span className="text-signal-400">Analyze</span><span>·</span><span>Compliance</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">Compliance posture</h1>
          <p className="text-[12.5px] text-muted">Continuous control evaluation across major security frameworks.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setReportOpen(true)} className="btn"><FileText size={12} />Generate report</button>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Score" value={`${score.toFixed(1)}%`} delta="+0.4" dir="up" hint={`${summary.total} controls`} accent="low" />
        <StatCard label="Passing" value={summary.pass} hint={`${score.toFixed(1)}% of controls`} />
        <StatCard label="Failing" value={summary.fail} hint="action required" accent="high" />
        <StatCard label="Frameworks" value={fw === "All" ? 5 : 1} hint={fw} accent="info" />
      </section>

      <section className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 xl:col-span-4" header={
          <>
            <div className="text-[12.5px] font-semibold text-primary truncate">Framework</div>
            <div className="flex flex-wrap gap-1.5">
              {frameworks.map(f => (
                <button key={f} onClick={() => setFw(f)} className={cn("chip cursor-pointer", fw === f && "!bg-signal-500/15 !border-signal-500/30 !text-signal-300")}>{f}</button>
              ))}
            </div>
          </>
        }>
          <div className="p-3 space-y-3">
            {filtered.map(c => {
              const pct = (c.pass / c.total) * 100;
              return (
                <div key={`${c.framework}-${c.control}`} className="panel p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10.5px] font-mono text-muted">{c.framework} · {c.control}</div>
                      <div className="text-[12.5px] text-primary">{c.title}</div>
                    </div>
                    <div className={`text-[12.5px] font-mono ${pct >= 95 ? "text-low" : pct >= 80 ? "text-medium" : "text-critical"}`}>{pct.toFixed(0)}%</div>
                  </div>
                  <div className="mt-2 h-1.5 surface-3 rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, background: pct >= 95 ? "#5BD0A0" : pct >= 80 ? "#F5C04A" : "#FF3D5A" }} />
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
                    <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-low" />{c.pass} pass</span>
                    <span className="flex items-center gap-1"><XCircle size={11} className="text-critical" />{c.fail} fail</span>
                    <span>{c.total} total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-8" header={
          <>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-primary truncate">Pass rate by control</div>
              <div className="text-[11px] text-muted truncate">{`${fw} — last evaluated 14m ago`}</div>
            </div>
            <div />
          </>
        }>
          <div className="h-[420px] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 30 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#9AA6B8", fontSize: 10.5 }} axisLine={false} tickLine={false} interval={0} angle={-15} dy={10} height={40} />
                <YAxis tick={{ fill: "#9AA6B8", fontSize: 10.5 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#10151D", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="pct" radius={[4,4,0,0]} barSize={22}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.pct >= 95 ? "#5BD0A0" : d.pct >= 80 ? "#F5C04A" : "#FF3D5A"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <Modal
        open={reportOpen} onClose={() => setReportOpen(false)}
        title="Generate compliance report"
        subtitle={`${fw} · ${summary.total} controls`}
        footer={
          <>
            <button className="btn" onClick={() => setReportOpen(false)}>Cancel</button>
            <button className="btn" onClick={() => generateReport("csv")} disabled={generating}><Download size={12} />CSV</button>
            <button type="button" className="btn btn-primary" onClick={() => generateReport("pdf")} disabled={generating}>
              {generating ? "Generating…" : "Generate PDF"}
            </button>
          </>
        }
      >
        <div className="space-y-3 text-[12.5px] text-secondary">
          <p>The report will include the selected framework, every control evaluated, pass/fail evidence, and an executive summary suitable for auditors.</p>
          <div className="panel p-3 space-y-1.5 text-[12px]">
            <div className="flex items-center justify-between"><span className="text-muted">Framework</span><span className="text-primary font-mono">{fw}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted">Controls evaluated</span><span className="text-primary font-mono">{summary.total}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted">Pass rate</span><span className="text-low font-mono">{score.toFixed(1)}%</span></div>
            <div className="flex items-center justify-between"><span className="text-muted">Estimated size</span><span className="text-primary font-mono">~ {(summary.total * 0.3).toFixed(0)} pages</span></div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
