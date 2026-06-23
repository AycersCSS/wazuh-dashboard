"use client";
import Link from "next/link";
import { Monitor, ArrowUpRight, ShieldAlert, Server, Wrench, RefreshCcw, ScrollText } from "lucide-react";
import { Page, Card, CardTitle, CardSubtitle, StatCard, Badge, Button, Table, type Column } from "@/components/ui";
import { getIntegration } from "@/data/integrations";
import { useToasts } from "@/hooks/useToasts";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const integration = getIntegration("ninjaone")!;

const kpis = [
  { label: "Devices in Wazuh vs NinjaOne", value: "146 / 152", delta: "96%",  dir: "flat" as const, hint: "6 endpoints not reporting to Wazuh", accent: "medium" as const },
  { label: "Drift alerts",                  value: "8",          delta: "+3",  dir: "up" as const,   hint: "config + policy mismatch",          accent: "high" as const },
  { label: "Patching overdue",              value: "21",         delta: "-4",  dir: "down" as const, hint: "across 4 tenants",                  accent: "critical" as const },
  { label: "Endpoint health",               value: "94%",        delta: "+1.2", dir: "up" as const,   hint: "rolling 7d",                        accent: "low" as const }
];

type Rec = { id: string; time: string; sev: "critical" | "high" | "medium" | "low" | "info"; tenant: string; device: string; desc: string; wazuh: string };

const recent: Rec[] = [
  { id: "NJ-014", time: "8m",  sev: "critical", tenant: "Acme Corp",        device: "acme-laptop-218",      desc: "Endpoint reports to NinjaOne but not Wazuh",   wazuh: "rule 92101" },
  { id: "NJ-013", time: "22m", sev: "high",     tenant: "Stark Industries", device: "stark-wks-031",        desc: "Patching overdue (14d) on Windows 11 fleet",   wazuh: "rule 92105" },
  { id: "NJ-012", time: "1h",  sev: "medium",   tenant: "Globex",           device: "globex-rds-007",       desc: "RMM policy drift: BitLocker disabled",         wazuh: "rule 92112" },
  { id: "NJ-011", time: "2h",  sev: "low",      tenant: "Initech",          device: "initech-mac-014",      desc: "Disk encryption health re-checked (pass)",     wazuh: "rule 92110" },
  { id: "NJ-010", time: "4h",  sev: "info",     tenant: "Acme Corp",        device: "acme-srv-002",         desc: "Inventory snapshot completed",                 wazuh: "rule 92100" }
];

const columns: Column<Rec>[] = [
  { key: "time", header: "Time", width: "90px", cell: r => <span className="text-navy-600">{r.time}</span> },
  { key: "sev",  header: "Severity", width: "120px", cell: r => <Badge tone={r.sev} dot>{r.sev}</Badge> },
  { key: "tenant", header: "Tenant", width: "140px", cell: r => <span className="text-cream">{r.tenant}</span> },
  { key: "device", header: "Device", cell: r => <span className="font-mono text-sage">{r.device}</span> },
  { key: "desc", header: "Event", cell: r => <span className="text-cream">{r.desc}</span> },
  { key: "wazuh", header: "Wazuh", width: "120px", cell: r => <Link href="/alerts" className="inline-flex items-center gap-1 text-emerald-400 hover:brightness-110 text-[12px]"><ArrowUpRight size={12} /> {r.wazuh}</Link> }
];

export default function NinjaOnePage() {
  const toasts = useToasts();
  function refresh() {
    toasts.push({ variant: "info", title: "Refreshing NinjaOne", description: "Reconciling device inventories..." });
  }
  return (
    <Page
      breadcrumb={[{ href: "/", label: "MergeIT" }, { label: "Operate" }, { label: "NinjaOne" }]}
      icon={Monitor}
      title="NinjaOne"
      description="Reconcile RMM device inventory with Wazuh agent coverage. Catch shadow endpoints."
      actions={
        <>
          <Button variant="secondary" icon={<RefreshCcw size={14} />} onClick={refresh}>Refresh</Button>
          <Link href="/agents"><Button variant="primary" icon={<ArrowUpRight size={14} />}>Open agent inventory</Button></Link>
        </>
      }
    >
      <section>
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-400/15 border border-emerald-400/40 grid place-items-center shrink-0">
              <Monitor size={18} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-[15px] text-sage font-normal font-oswald">One inventory, two systems of record</div>
              <p className="text-[11px] text-navy-600 mt-1.5 leading-relaxed max-w-3xl">
                {integration.description} Account managers see at a glance which tenants are
                fully covered, which need Wazuh agents installed, and which endpoints are drifting from the MSP baseline (patches, BitLocker, AV).
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
            <ScrollText size={11} /> Custom rule family <span className="font-mono text-sage">92100-92199</span> - managed by MergeIT.
          </div>
        </Card>
      </section>

      <Card padded={false}
        header={
          <>
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardSubtitle>Last 24h - NinjaOne sync - click an event to investigate in Wazuh</CardSubtitle>
            </div>
            <Link href="/agents"><Button size="sm" variant="secondary" icon={<ArrowUpRight size={12} />}>All devices</Button></Link>
          </>
        }>
        <Table columns={columns} rows={recent} rowKey={r => r.id} />
      </Card>
    </Page>
  );
}
