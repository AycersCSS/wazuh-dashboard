"use client";
import Link from "next/link";
import { Page, Card, CardTitle, CardSubtitle, StatCard, Badge, Button, Table, type Column } from "@/components/ui";
import { useToasts } from "@/hooks/useToasts";
import { useIntegrationHealth } from "@/lib/wazuh";
import { useTimeRange } from "@/hooks/useTimeRange";
import { IntegrationStatusBanner } from "@/components/IntegrationStatusBanner";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

// TODO(replace-when-endpoint-ready): GET /integrations/ninjaone
type Rec = { id: string; time: string; sev: "critical" | "high" | "medium" | "low" | "info"; tenant: string; device: string; desc: string; wazuh: string };

const WAZUH_MAPPING: { label: string; href: string }[] = [
  { label: "Endpoint inventory -> Agents",            href: "/agents" },
  { label: "Patch overdue -> Vulnerabilities",        href: "/vulnerabilities" },
  { label: "Config drift -> File Integrity (rules)",  href: "/fim" },
  { label: "Agent offline -> Alerts (custom 921xx)",  href: "/alerts" }
];

const INTEGRATION_DESCRIPTION =
  "Compares NinjaOne's RMM device inventory with Wazuh's agent list. Highlights endpoints reporting to NinjaOne but not Wazuh (coverage gap) and vice versa (shadow agent). Flags patching overdue and agent drift across the fleet.";

const columns: Column<Rec>[] = [
  { key: "time", header: "Time", width: "90px", cell: r => <span className="text-navy-600">{r.time}</span> },
  { key: "sev",  header: "Severity", width: "120px", cell: r => <Badge tone={r.sev} dot>{r.sev}</Badge> },
  { key: "tenant", header: "Tenant", width: "140px", cell: r => <span className="text-cream">{r.tenant}</span> },
  { key: "device", header: "Device", cell: r => <span className="font-mono text-sage">{r.device}</span> },
  { key: "desc", header: "Event", cell: r => <span className="text-cream">{r.desc}</span> },
  { key: "wazuh", header: "Wazuh", width: "120px", cell: r => <Link href="/agents" className="text-emerald-400 hover:brightness-110 text-[12px]">{r.wazuh}</Link> }
];

export default function NinjaOnePage() {
  const toasts = useToasts();
  const { range } = useTimeRange();
  const { live, state, errorMessage, isLoading, refetch } = useIntegrationHealth("ninjaone");

  const showData = state === "CONNECTED" || state === "DEGRADED";

  const recent: Rec[] = (live?.recent ?? []).map((e) => ({
    id: e.id,
    time: e.time,
    sev: e.severity,
    tenant: e.tenant,
    device: e.primary,
    desc: e.description,
    wazuh: `rule ${e.wazuhRuleId}`
  }));

  function refresh() {
    refetch();
    toasts.push({ variant: "info", title: "Refreshing NinjaOne", description: "Re-querying the integration endpoint..." });
  }

  return (
    <Page
      breadcrumb={[{ href: "/", label: "MergeIT" }, { label: "Operate" }, { label: "NinjaOne" }]}
      title="NinjaOne"
      description={showData && live ? `Connected to ${live.vendor} - last sync ${formatRelativeTime(live.lastSyncAt)}` : "Reconcile RMM device inventory with Wazuh agent coverage. Catch shadow endpoints."}
      actions={
        <>
          <Button variant="secondary" onClick={refresh}>Refresh</Button>
          <Link href="/agents"><Button variant="primary">Open agent inventory</Button></Link>
        </>
      }
    >
      <IntegrationStatusBanner
        state={state}
        errorMessage={errorMessage}
        integrationName="NinjaOne"
        onRetry={refresh}
      />

      {showData && live ? (
        <>
          <section>
            <Card>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-400/15 border border-emerald-400/40 grid place-items-center shrink-0 text-[10px] font-mono text-emerald-400">
                  NJ
                </div>
                <div>
                  <div className="text-[15px] text-sage font-normal font-oswald">One inventory, two systems of record</div>
                  <p className="text-[11px] text-navy-600 mt-1.5 leading-relaxed max-w-3xl">
                    {INTEGRATION_DESCRIPTION} Account managers see at a glance which tenants are
                    fully covered, which need Wazuh agents installed, and which endpoints are drifting from the MSP baseline (patches, BitLocker, AV).
                  </p>
                </div>
              </div>
            </Card>
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(live.kpis ?? []).length > 0
              ? (live.kpis ?? []).map(k => <StatCard key={k.label} label={k.label} value={k.value} delta="—" dir="flat" hint={`${range.label} - live`} accent="info" />)
              : [<StatCard key="p" label="No data" value="—" delta="—" dir="flat" hint={`Connected, but no KPIs reported in ${range.label}`} accent="info" />]}
          </section>

          <section className="grid grid-cols-12 gap-5">
            <Card className="col-span-12 lg:col-span-6" padded={false}
              header={
                <>
                  <div>
                    <CardTitle>Integration status</CardTitle>
                    <CardSubtitle>{live.vendor} - last sync {formatRelativeTime(live.lastSyncAt)}</CardSubtitle>
                  </div>
                  <Badge tone={live.status === "Connected" ? "low" : live.status === "Degraded" ? "medium" : "critical"} dot>{live.status}</Badge>
                </>
              }>
              {live.healthMetrics && live.healthMetrics.length > 0 ? (
                <ul className="divide-y divide-navy-400/60">
                  {live.healthMetrics.map(m => (
                    <li key={m.label} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[12px] text-sage">{m.label}</span>
                      <span className={cn("font-mono text-[12px]", "text-cream")}>{m.value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-[12px] text-navy-600">No health metrics reported.</div>
              )}
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
                {WAZUH_MAPPING.map(m => (
                  <li key={m.label} className="flex items-center gap-2 text-[12px]">
                    <span className="text-emerald-400 shrink-0 text-[10px] font-mono">WAZ</span>
                    <span className="text-sage flex-1">{m.label}</span>
                    <Link href={m.href} className="text-emerald-400 hover:brightness-110 text-[11px]">Open</Link>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-3 border-t border-navy-400/60 text-[11px] text-navy-600">
                Custom rule family <span className="font-mono text-sage">92100-92199</span> - managed by MergeIT.
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
                <Link href="/agents"><Button size="sm" variant="secondary">All devices</Button></Link>
              </>
            }>
            {recent.length > 0
              ? <Table columns={columns} rows={recent} rowKey={r => r.id} />
              : <div className="p-6 text-center text-[12px] text-navy-600">No recent NinjaOne activity in this window.</div>}
          </Card>
        </>
      ) : !isLoading ? (
        <Card>
          <div className="p-6 text-center">
            <div className="text-sm text-cream">No NinjaOne data to display</div>
            <p className="text-[12px] text-navy-600 mt-2 max-w-md mx-auto">
              The data sections on this page only appear once the NinjaOne integration is connected and reporting.
            </p>
          </div>
        </Card>
      ) : null}
    </Page>
  );
}
