"use client";
import Link from "next/link";
import { Page, Card, CardTitle, CardSubtitle, StatCard, Badge, Button, Table, type Column } from "@/components/ui";
import { useToasts } from "@/hooks/useToasts";
import { useIntegrationHealth } from "@/lib/wazuh";
import { useTimeRange } from "@/hooks/useTimeRange";
import { IntegrationStatusBanner } from "@/components/IntegrationStatusBanner";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

// TODO(replace-when-endpoint-ready): GET /integrations/bitdefender
type Rec = { id: string; time: string; sev: "critical" | "high" | "medium" | "low" | "info"; tenant: string; endpoint: string; desc: string; wazuh: string };

const WAZUH_MAPPING: { label: string; href: string }[] = [
  { label: "EDR detection -> Alerts",                 href: "/alerts" },
  { label: "Quarantine event -> FIM (file hash)",     href: "/fim" },
  { label: "Threat intel IOC -> Threat Intel",        href: "/threat-intel" },
  { label: "Engine status -> Compliance (control 7)", href: "/compliance" }
];

const INTEGRATION_DESCRIPTION =
  "Correlates Bitdefender GravityZone endpoint detections with Wazuh alerts. Joins process, file, and network telemetry from both sides so the SOC sees one timeline per incident. Engine-out-of-date endpoints are flagged for the MSP patching queue.";

const columns: Column<Rec>[] = [
  { key: "time", header: "Time", width: "90px", cell: r => <span className="text-navy-600">{r.time}</span> },
  { key: "sev",  header: "Severity", width: "120px", cell: r => <Badge tone={r.sev} dot>{r.sev}</Badge> },
  { key: "tenant", header: "Tenant", width: "140px", cell: r => <span className="text-cream">{r.tenant}</span> },
  { key: "endpoint", header: "Endpoint", cell: r => <span className="font-mono text-sage">{r.endpoint}</span> },
  { key: "desc", header: "Detection", cell: r => <span className="text-cream">{r.desc}</span> },
  { key: "wazuh", header: "Wazuh", width: "120px", cell: r => <Link href="/alerts" className="text-emerald-400 hover:brightness-110 text-[12px]">{r.wazuh}</Link> }
];

export default function BitdefenderPage() {
  const toasts = useToasts();
  const { range } = useTimeRange();
  const { live, state, errorMessage, isLoading, refetch } = useIntegrationHealth("bitdefender");

  const showData = state === "CONNECTED" || state === "DEGRADED";

  const recent: Rec[] = (live?.recent ?? []).map((e) => ({
    id: e.id,
    time: e.time,
    sev: e.severity,
    tenant: e.tenant,
    endpoint: e.primary,
    desc: e.description,
    wazuh: `rule ${e.wazuhRuleId}`
  }));

  function refresh() {
    refetch();
    toasts.push({ variant: "info", title: "Refreshing Bitdefender", description: "Re-querying the integration endpoint..." });
  }

  return (
    <Page
      breadcrumb={[{ href: "/", label: "MergeIT" }, { label: "Operate" }, { label: "Bitdefender" }]}
      title="Bitdefender"
      description={showData && live ? `Connected to ${live.vendor} - last sync ${formatRelativeTime(live.lastSyncAt)}` : "Correlate GravityZone endpoint detections with Wazuh. One timeline per incident."}
      actions={
        <>
          <Button variant="secondary" onClick={refresh}>Refresh</Button>
          <Link href="/alerts"><Button variant="primary">Open alert queue</Button></Link>
        </>
      }
    >
      <IntegrationStatusBanner
        state={state}
        errorMessage={errorMessage}
        integrationName="Bitdefender"
        onRetry={refresh}
      />

      {showData && live ? (
        <>
          <section>
            <Card>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-severity-critical/15 border border-severity-critical/40 grid place-items-center shrink-0 text-[10px] font-mono text-severity-critical">
                  BD
                </div>
                <div>
                  <div className="text-[15px] text-sage font-normal font-oswald">EDR + SIEM, joined on the same incident</div>
                  <p className="text-[11px] text-navy-600 mt-1.5 leading-relaxed max-w-3xl">
                    {INTEGRATION_DESCRIPTION} The MSP account manager no longer has to chase
                    evidence across GravityZone and Wazuh; every detection lands as a single Wazuh alert enriched with the EDR's process tree.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {live.kpis.length > 0
              ? live.kpis.map(k => <StatCard key={k.label} label={k.label} value={k.value} delta="—" dir="flat" hint={`${range.label} - live`} accent="info" />)
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
                Custom rule family <span className="font-mono text-sage">92500-92599</span> - managed by MergeIT.
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
                <Link href="/alerts"><Button size="sm" variant="secondary">All events</Button></Link>
              </>
            }>
            {recent.length > 0
              ? <Table columns={columns} rows={recent} rowKey={r => r.id} />
              : <div className="p-6 text-center text-[12px] text-navy-600">No recent Bitdefender activity in this window.</div>}
          </Card>
        </>
      ) : !isLoading ? (
        <Card>
          <div className="p-6 text-center">
            <div className="text-sm text-cream">No Bitdefender data to display</div>
            <p className="text-[12px] text-navy-600 mt-2 max-w-md mx-auto">
              The data sections on this page only appear once the Bitdefender integration is connected and reporting.
            </p>
          </div>
        </Card>
      ) : null}
    </Page>
  );
}
