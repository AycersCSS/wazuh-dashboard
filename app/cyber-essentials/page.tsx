"use client";
import Link from "next/link";
import { FileCheck2, ArrowUpRight, ShieldAlert, RefreshCcw, ScrollText, ListChecks } from "lucide-react";
import { Page, Card, CardTitle, CardSubtitle, StatCard, Badge, Button, Table, type Column } from "@/components/ui";
import { getIntegration } from "@/data/integrations";
import { useToasts } from "@/hooks/useToasts";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const integration = getIntegration("cyber-essentials")!;

const kpis = [
  { label: "Score (5 controls)",   value: "82%",    delta: "+3",    dir: "up" as const,  hint: "weighted across controls",  accent: "low" as const },
  { label: "Failing controls",     value: "1",      delta: "-1",    dir: "down" as const, hint: "boundary firewalls",       accent: "medium" as const },
  { label: "Evidence collected",   value: "1,284",  delta: "+94",   dir: "up" as const,  hint: "last 24h",                 accent: "info" as const },
  { label: "Next assessment",      value: "in 41d", delta: "Aug 14", dir: "up" as const,  hint: "3 of 4 tenants ready",     accent: "low" as const }
];

const controls = [
  { id: "ce-1", control: "Boundary firewalls",      status: "pass", pct: 96 },
  { id: "ce-2", control: "Secure configuration",    status: "pass", pct: 91 },
  { id: "ce-3", control: "Access control",          status: "pass", pct: 88 },
  { id: "ce-4", control: "Malware protection",      status: "pass", pct: 100 },
  { id: "ce-5", control: "Patch management",        status: "warn", pct: 64 }
];

type Rec = { id: string; time: string; sev: "critical" | "high" | "medium" | "low" | "info"; tenant: string; control: string; desc: string; wazuh: string };

const recent: Rec[] = [
  { id: "CE-031", time: "5m",  sev: "high",     tenant: "Acme Corp",  control: "CE-5 Patch",   desc: "12 endpoints missing Sep 2024 cumulative",  wazuh: "rule 93012" },
  { id: "CE-030", time: "32m", sev: "medium",   tenant: "Globex",     control: "CE-1 Boundary", desc: "Open port 3389 detected on host globex-rds-007", wazuh: "rule 93014" },
  { id: "CE-029", time: "1h",  sev: "low",      tenant: "Initech",    control: "CE-3 Access",   desc: "Stale local admin account > 90 days",          wazuh: "rule 93021" },
  { id: "CE-028", time: "4h",  sev: "info",     tenant: "Stark Industries", control: "CE-2 Config", desc: "Evidence snapshot captured (1,284 controls)", wazuh: "rule 93000" }
];

const columns: Column<Rec>[] = [
  { key: "time", header: "Time", width: "90px", cell: r => <span className="text-navy-600">{r.time}</span> },
  { key: "sev",  header: "Severity", width: "120px", cell: r => <Badge tone={r.sev} dot>{r.sev}</Badge> },
  { key: "tenant", header: "Tenant", width: "140px", cell: r => <span className="text-cream">{r.tenant}</span> },
  { key: "control", header: "Control", width: "160px", cell: r => <span className="font-mono text-sage">{r.control}</span> },
  { key: "desc", header: "Event", cell: r => <span className="text-cream">{r.desc}</span> },
  { key: "wazuh", header: "Wazuh", width: "120px", cell: r => <Link href="/alerts" className="inline-flex items-center gap-1 text-emerald-400 hover:brightness-110 text-[12px]"><ArrowUpRight size={12} /> {r.wazuh}</Link> }
];

export default function CyberEssentialsPage() {
  const toasts = useToasts();
  function refresh() {
    toasts.push({ variant: "info", title: "Refreshing Cyber Essentials", description: "Re-collecting evidence from Wazuh..." });
  }
  return (
    <Page
      breadcrumb={[{ href: "/", label: "MergeIT" }, { label: "Report" }, { label: "Cyber Essentials" }]}
      icon={FileCheck2}
      title="Cyber Essentials"
      description="One evidence pack per tenant, auto-built from Wazuh. CE Plus ready."
      actions={
        <>
          <Button variant="secondary" icon={<RefreshCcw size={14} />} onClick={refresh}>Refresh</Button>
          <Link href="/compliance"><Button variant="primary" icon={<ArrowUpRight size={14} />}>Open compliance</Button></Link>
        </>
      }
    >
      <section>
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-400/15 border border-emerald-400/40 grid place-items-center shrink-0">
              <ListChecks size={18} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-[15px] text-sage font-normal font-oswald">Audit-ready evidence, collected nightly</div>
              <p className="text-[11px] text-navy-600 mt-1.5 leading-relaxed max-w-3xl">
                {integration.description} The five CE Plus controls map directly to
                Wazuh data sources - patches to vulnerability scans, access control to compliance checks, malware protection to EDR detections, and so on.
                No spreadsheet wrangling before the assessor arrives.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => <StatCard key={k.label} {...k} />)}
      </section>

      <section className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 lg:col-span-6" padded={false}
          header={
            <>
              <div>
                <CardTitle>Integration status</CardTitle>
                <CardSubtitle>{integration.vendor} - last sync {formatRelativeTime(integration.lastSyncAt)}</CardSubtitle>
              </div>
              <Badge tone={integration.status === "Connected" ? "low" : integration.status === "Degraded" ? "medium" : "critical"} dot>{integration.status}</Badge>
            </>
          }>
          <ul className="divide-y divide-navy-400/60">
            {integration.healthMetrics.map(m => (
              <li key={m.label} className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-[12px] text-sage">{m.label}</span>
                <span className={cn(
                  "font-mono text-[12px]",
                  m.tone === "ok" ? "text-emerald-400" : m.tone === "warn" ? "text-severity-medium" : "text-severity-critical"
                )}>{m.value}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="col-span-12 lg:col-span-6" padded={false}
          header={
            <>
              <div>
                <CardTitle>5 controls - current score</CardTitle>
                <CardSubtitle>Weighted across the MergeIT fleet</CardSubtitle>
              </div>
            </>
          }>
          <ul className="divide-y divide-navy-400/60">
            {controls.map(c => (
              <li key={c.id} className="px-4 py-2.5 flex items-center gap-3">
                <Badge tone={c.status === "pass" ? "low" : c.status === "warn" ? "medium" : "critical"} dot>{c.status}</Badge>
                <span className="flex-1 text-[12px] text-sage">{c.control}</span>
                <div className="w-32 h-1.5 bg-navy-200 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full", c.pct >= 90 ? "bg-emerald-400" : c.pct >= 75 ? "bg-severity-medium" : "bg-severity-high")}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
                <span className="font-mono text-[12px] text-cream w-10 text-right">{c.pct}%</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <Card className="col-span-12 lg:col-span-12" padded={false}
        header={
          <>
            <div>
              <CardTitle>How this maps to Wazuh</CardTitle>
              <CardSubtitle>Underlying data sources feeding this view</CardSubtitle>
            </div>
          </>
        }>
        <div className="grid grid-cols-12 gap-5 p-4">
          <ul className="col-span-12 lg:col-span-8 space-y-1.5">
            {integration.wazuhMapping.map(m => (
              <li key={m.label} className="flex items-center gap-2 text-[12px]">
                <ShieldAlert size={12} className="text-emerald-400 shrink-0" />
                <span className="text-sage flex-1">{m.label}</span>
                <Link href={m.href} className="inline-flex items-center gap-1 text-emerald-400 hover:brightness-110 text-[11px]">
                  Open <ArrowUpRight size={11} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="col-span-12 lg:col-span-4 text-[11px] text-navy-600 flex items-start gap-2 lg:border-l lg:border-navy-400 lg:pl-5">
            <ScrollText size={11} className="mt-0.5" /> Custom rule family <span className="font-mono text-sage">93000-93099</span> - managed by MergeIT.
          </div>
        </div>
      </Card>

      <Card padded={false}
        header={
          <>
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardSubtitle>Last 24h - Cyber Essentials evidence - click an event to investigate in Wazuh</CardSubtitle>
            </div>
            <Link href="/compliance"><Button size="sm" variant="secondary" icon={<ArrowUpRight size={12} />}>All controls</Button></Link>
          </>
        }>
        <Table columns={columns} rows={recent} rowKey={r => r.id} />
      </Card>
    </Page>
  );
}
