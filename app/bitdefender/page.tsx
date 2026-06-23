"use client";
import Link from "next/link";
import { Bug, ArrowUpRight, ShieldAlert, RefreshCcw, ScrollText, AlertOctagon } from "lucide-react";
import { Page, Card, CardTitle, CardSubtitle, StatCard, Badge, Button, Table, type Column } from "@/components/ui";
import { getIntegration } from "@/data/integrations";
import { useToasts } from "@/hooks/useToasts";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const integration = getIntegration("bitdefender")!;

const kpis = [
  { label: "Active threats",          value: "2",        delta: "+1",   dir: "up" as const,  hint: "Quarantine pending review",  accent: "critical" as const },
  { label: "Threats blocked (24h)",   value: "1,284",    delta: "+8.2%", dir: "up" as const, hint: "across 4 tenants",           accent: "low" as const },
  { label: "Endpoints reporting",     value: "146",      delta: "-3",   dir: "down" as const, hint: "of 152 expected",           accent: "medium" as const },
  { label: "Engines out of date",     value: "9",        delta: "+2",   dir: "up" as const,  hint: "patching queue",             accent: "high" as const }
];

type Rec = { id: string; time: string; sev: "critical" | "high" | "medium" | "low" | "info"; tenant: string; endpoint: string; desc: string; wazuh: string };

const recent: Rec[] = [
  { id: "BD-204", time: "4m",  sev: "critical", tenant: "Acme Corp",  endpoint: "acme-fs-001",   desc: "Ransomware-like behaviour detected (mass file rename)", wazuh: "rule 92501" },
  { id: "BD-203", time: "11m", sev: "high",     tenant: "Globex",     endpoint: "globex-wks-119", desc: "PowerShell encoded payload dropped from Office macro",   wazuh: "rule 92510" },
  { id: "BD-202", time: "27m", sev: "high",     tenant: "Stark Industries", endpoint: "stark-rds-004", desc: "EICAR test file quarantined (false positive - user test)", wazuh: "rule 92504" },
  { id: "BD-201", time: "1h",  sev: "medium",   tenant: "Initech",    endpoint: "initech-wks-008", desc: "Suspicious outbound DNS to DGA family",                  wazuh: "rule 92512" },
  { id: "BD-200", time: "3h",  sev: "low",      tenant: "Acme Corp",  endpoint: "acme-wks-002",  desc: "AV signature update deployed (auto)",                     wazuh: "rule 92500" }
];

const columns: Column<Rec>[] = [
  { key: "time", header: "Time", width: "90px", cell: r => <span className="text-navy-600">{r.time}</span> },
  { key: "sev",  header: "Severity", width: "120px", cell: r => <Badge tone={r.sev} dot>{r.sev}</Badge> },
  { key: "tenant", header: "Tenant", width: "140px", cell: r => <span className="text-cream">{r.tenant}</span> },
  { key: "endpoint", header: "Endpoint", cell: r => <span className="font-mono text-sage">{r.endpoint}</span> },
  { key: "desc", header: "Detection", cell: r => <span className="text-cream">{r.desc}</span> },
  { key: "wazuh", header: "Wazuh", width: "120px", cell: r => <Link href="/alerts" className="inline-flex items-center gap-1 text-emerald-400 hover:brightness-110 text-[12px]"><ArrowUpRight size={12} /> {r.wazuh}</Link> }
];

export default function BitdefenderPage() {
  const toasts = useToasts();
  function refresh() {
    toasts.push({ variant: "info", title: "Refreshing Bitdefender", description: "Pulling GravityZone detections..." });
  }
  return (
    <Page
      breadcrumb={[{ href: "/", label: "MergeIT" }, { label: "Operate" }, { label: "Bitdefender" }]}
      icon={Bug}
      title="Bitdefender"
      description="Correlate GravityZone endpoint detections with Wazuh. One timeline per incident."
      actions={
        <>
          <Button variant="secondary" icon={<RefreshCcw size={14} />} onClick={refresh}>Refresh</Button>
          <Link href="/alerts"><Button variant="primary" icon={<ArrowUpRight size={14} />}>Open alert queue</Button></Link>
        </>
      }
    >
      <section>
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-severity-critical/15 border border-severity-critical/40 grid place-items-center shrink-0">
              <AlertOctagon size={18} className="text-severity-critical" />
            </div>
            <div>
              <div className="text-[15px] text-sage font-normal font-oswald">EDR + SIEM, joined on the same incident</div>
              <p className="text-[11px] text-navy-600 mt-1.5 leading-relaxed max-w-3xl">
                {integration.description} The MSP account manager no longer has to chase
                evidence across GravityZone and Wazuh; every detection lands as a single Wazuh alert enriched with the EDR's process tree.
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
                <CardTitle>How this maps to Wazuh</CardTitle>
                <CardSubtitle>Underlying data sources feeding this view</CardSubtitle>
              </div>
            </>
          }>
          <ul className="px-4 py-2 space-y-1.5">
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
          <div className="px-4 py-3 border-t border-navy-400/60 text-[11px] text-navy-600 flex items-center gap-2">
            <ScrollText size={11} /> Custom rule family <span className="font-mono text-sage">92500-92599</span> - managed by MergeIT.
          </div>
        </Card>
      </section>

      <Card padded={false}
        header={
          <>
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardSubtitle>Last 24h - Bitdefender detections - click an event to investigate in Wazuh</CardSubtitle>
            </div>
            <Link href="/alerts"><Button size="sm" variant="secondary" icon={<ArrowUpRight size={12} />}>All events</Button></Link>
          </>
        }>
        <Table columns={columns} rows={recent} rowKey={r => r.id} />
      </Card>
    </Page>
  );
}
