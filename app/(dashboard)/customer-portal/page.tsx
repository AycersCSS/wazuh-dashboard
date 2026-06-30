"use client";
import Link from "next/link";
import { useState } from "react";
import { Page, Card, CardTitle, CardSubtitle, StatCard, Badge, Button, DataGrid, type Column } from "@/components/ui";
import { useToasts } from "@/hooks/useToasts";
import { formatRelativeTime } from "@/lib/format";
import { useConnectorStats } from "@/lib/connector/useConnectorStats";
import { useIntegrationHealth } from "@/lib/wazuh";
import { useTimeRange } from "@/hooks/useTimeRange";
import { IntegrationStatusBanner } from "@/components/IntegrationStatusBanner";
import { displayNameFor, tierFor } from "@/lib/tenantDisplay";
import { cn } from "@/lib/cn";

// TODO(replace-when-endpoint-ready): GET /integrations/customer-portal —
// the live record carries real `kpis`, `recent`, and `healthMetrics`
// arrays. Until that endpoint lands the page renders the live tenant
// list (from the Wazuh connector) for the table, with no security-score /
// incidents / CVE-count values (those need a per-tenant snapshot endpoint).

const tierTone: Record<string, "low" | "medium" | "high" | "critical" | "info" | "neutral"> = {
  Bronze:   "neutral",
  Silver:   "info",
  Gold:     "medium",
  Platinum: "low"
};

function scoreTone(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-severity-medium";
  return "text-severity-high";
}

type TenantRow = {
  id: string;
  name: string;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  securityScore: number | null;
  openIncidents: number | null;
  lastSyncAt: string | null;
};

const WAZUH_MAPPING: { label: string; href: string }[] = [
  { label: "Tenant score -> Compliance",              href: "/compliance" },
  { label: "Open incidents -> Alerts",                href: "/alerts" },
  { label: "Top findings -> Vulnerabilities",         href: "/vulnerabilities" },
  { label: "MSSP overview -> Overview (raw)",         href: "/" }
];

const columns: Column<TenantRow>[] = [
  { key: "name", header: "Tenant", cell: t => <span className="text-cream font-medium">{t.name}</span> },
  { key: "tier", header: "Tier", width: "120px", cell: t => <Badge tone={tierTone[t.tier]} dot>{t.tier}</Badge> },
  { key: "score", header: "Security score", width: "220px", cell: t => (
    t.securityScore === null ? <span className="text-navy-600 text-[12px]">—</span> : (
      <div className="flex items-center gap-2">
        <div className="w-24 h-1.5 bg-navy-200 rounded-full overflow-hidden">
          <div
            className={cn("h-full", t.securityScore >= 85 ? "bg-emerald-400" : t.securityScore >= 70 ? "bg-severity-medium" : "bg-severity-high")}
            style={{ width: `${t.securityScore}%` }}
          />
        </div>
        <span className={cn("font-mono text-[12px]", scoreTone(t.securityScore))}>{t.securityScore}</span>
      </div>
    )
  ) },
  { key: "incidents", header: "Open incidents", width: "130px", cell: t => (
    t.openIncidents === null ? <span className="text-navy-600 text-[12px]">—</span> : (
      <span className={cn("font-mono text-[12px]", t.openIncidents === 0 ? "text-emerald-400" : t.openIncidents < 5 ? "text-severity-medium" : "text-severity-critical")}>{t.openIncidents}</span>
    )
  ) },
  { key: "sync", header: "Last sync", width: "140px", cell: t => (
    t.lastSyncAt ? <span className="text-navy-600 text-[12px]">{formatRelativeTime(t.lastSyncAt)}</span> : <span className="text-navy-600 text-[12px]">—</span>
  ) }
];

function PreviewButton({ tenantName }: { tenantName: string }) {
  const toasts = useToasts();
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={(e) => {
        e.stopPropagation();
        toasts.push({
          variant: "info",
          title: `Portal preview - ${tenantName}`,
          description: "Customer portal launches Q3. API contract below is the data shape it will consume.",
          duration: 4000
        });
      }}
    >
      Preview as tenant
    </Button>
  );
}

export default function CustomerPortalPage() {
  const toasts = useToasts();
  const { range } = useTimeRange();
  const { tenants: liveTenantIds } = useConnectorStats();
  const { live, state, errorMessage, isLoading, refetch } = useIntegrationHealth("customer-portal");

  const showData = state === "CONNECTED" || state === "DEGRADED";

  // Tenant list: live connector IDs only. No seeded `tenants` array.
  // Per-tenant security score / incidents / cveCount come from a future
  // per-tenant snapshot endpoint — until then we render nulls (the column
  // shows "—").
  const tenants: TenantRow[] = liveTenantIds.map((id) => ({
    id,
    name: displayNameFor(id),
    tier: tierFor(id) ?? "Silver",
    securityScore: null,
    openIncidents: null,
    lastSyncAt: null
  }));

  function refresh() {
    refetch();
    toasts.push({ variant: "info", title: "Refreshing portal data", description: "Re-querying the integration endpoint..." });
  }

  return (
    <Page
      breadcrumb={[{ href: "/", label: "MergeIT" }, { label: "Report" }, { label: "Customer Portal" }]}
      title="Customer Portal"
      description={showData && live ? `Connected to ${live.vendor} - last sync ${formatRelativeTime(live.lastSyncAt)}` : "Per-tenant security snapshot - feeds the future MergeIT customer portal (Q3)."}
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
        integrationName="Customer Portal"
        onRetry={refresh}
      />

      {showData && live ? (
        <>
          <section>
            <Card>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-400/15 border border-emerald-400/40 grid place-items-center shrink-0 text-[10px] font-mono text-emerald-400">
                  CP
                </div>
                <div>
                  <div className="text-[15px] text-sage font-normal font-oswald">Proof-of-concept for the future customer portal</div>
                  <p className="text-[11px] text-navy-600 mt-1.5 leading-relaxed max-w-3xl">
                    This page renders the same data shape the portal will consume via a read-only API. Account managers use it to demo a tenant's view before the portal ships.
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
                      <span className="font-mono text-[12px] text-cream">{m.value}</span>
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
            </Card>
          </section>

          <Card padded={false}
            header={
              <>
                <div>
                  <CardTitle>Tenants</CardTitle>
                  <CardSubtitle>All tenants the portal can serve - per-tenant score/incidents land when the snapshot endpoint is built</CardSubtitle>
                </div>
                <span className="text-[10.5px] text-navy-600">{tenants.length} tenants</span>
              </>
            }>
            {tenants.length > 0
              ? <DataGrid columns={columns} rows={tenants} rowKey={t => t.id} />
              : <div className="p-6 text-center text-[12px] text-navy-600">No tenants are reporting. The connector is reachable but no tenants are linked to this dashboard yet.</div>}
          </Card>

          <Card padded={false}
            header={
              <>
                <div>
                  <CardTitle>API contract</CardTitle>
                  <CardSubtitle>The JSON shape the customer portal will consume per tenant</CardSubtitle>
                </div>
                <Badge tone="info" dot>beta</Badge>
              </>
            }>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2 text-[11px] text-navy-600">
                <span className="font-mono">GET /api/v1/tenants/:id/snapshot</span>
                <span className="text-severity-medium">— TODO(replace-when-endpoint-ready): not yet implemented</span>
              </div>
              <pre className="bg-navy border border-navy-500 rounded-lg p-4 text-[12px] leading-relaxed overflow-x-auto text-sage">
{`// Contract is illustrative. The endpoint will aggregate Wazuh compliance,
// alerts, and vulnerabilities per tenant. Will land alongside the customer
// portal beta — see mergeit-portal backlog.`}
              </pre>
              <div className="mt-3 text-[11px] text-navy-600">
                Backed by the Wazuh compliance, alerts, and vulnerabilities tables via internal aggregation. Stable from MergeIT SOC v1.0.
              </div>
            </div>
          </Card>
        </>
      ) : !isLoading ? (
        <Card>
          <div className="p-6 text-center">
            <div className="text-sm text-cream">No Customer Portal data to display</div>
            <p className="text-[12px] text-navy-600 mt-2 max-w-md mx-auto">
              The data sections on this page only appear once the Customer Portal integration is connected and reporting.
            </p>
          </div>
        </Card>
      ) : null}
    </Page>
  );
}
