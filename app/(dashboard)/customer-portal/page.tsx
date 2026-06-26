"use client";
import Link from "next/link";
import { useState } from "react";
import { Page, Card, CardTitle, CardSubtitle, StatCard, Badge, Button, DataGrid, type Column } from "@/components/ui";
import { getIntegration } from "@/data/integrations";
import { useToasts } from "@/hooks/useToasts";
import { formatRelativeTime } from "@/lib/format";
import { tenants, type Tenant } from "@/data/tenants";
import { cn } from "@/lib/cn";

const integration = getIntegration("customer-portal")!;

const kpis = [
  { label: "Tenants onboarded", value: "4 / 4",  delta: "+0",  dir: "flat" as const, hint: "All linked to API",     accent: "low" as const },
  { label: "Active API keys",   value: "7",      delta: "+1",  dir: "up" as const,  hint: "rotated this week",     accent: "info" as const },
  { label: "API calls (24h)",   value: "12,408", delta: "+8%", dir: "up" as const,  hint: "p95 84ms",              accent: "low" as const },
  { label: "Last data sync",    value: "1m",     delta: "-30s",dir: "down" as const, hint: "all tenants in sync",   accent: "low" as const }
];

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

const columns: Column<Tenant>[] = [
  { key: "name", header: "Tenant", sortable: true, sortValue: t => t.name, cell: t => <span className="text-cream font-medium">{t.name}</span> },
  { key: "tier", header: "Tier", width: "120px", cell: t => <Badge tone={tierTone[t.tier]} dot>{t.tier}</Badge> },
  { key: "score", header: "Security score", width: "220px", sortable: true, sortValue: t => t.securityScore, cell: t => (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-navy-200 rounded-full overflow-hidden">
        <div
          className={cn("h-full", t.securityScore >= 85 ? "bg-emerald-400" : t.securityScore >= 70 ? "bg-severity-medium" : "bg-severity-high")}
          style={{ width: `${t.securityScore}%` }}
        />
      </div>
      <span className={cn("font-mono text-[12px]", scoreTone(t.securityScore))}>{t.securityScore}</span>
    </div>
  ) },
  { key: "incidents", header: "Open incidents", width: "130px", sortable: true, sortValue: t => t.openIncidents, cell: t => (
    <span className={cn("font-mono text-[12px]", t.openIncidents === 0 ? "text-emerald-400" : t.openIncidents < 5 ? "text-severity-medium" : "text-severity-critical")}>{t.openIncidents}</span>
  ) },
  { key: "sync", header: "Last sync", width: "140px", cell: t => <span className="text-navy-600 text-[12px]">{formatRelativeTime(t.lastSyncAt)}</span> },
  { key: "act", header: "", width: "180px", cell: t => (
    <PreviewButton tenantName={t.name} />
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

const apiContract = `{
  "tenantId": "acme",
  "asOf": "2026-06-23T14:32:11Z",
  "securityScore": 87,
  "openIncidents": 3,
  "alerts24h": 412,
  "topFindings": [
    { "cve": "CVE-2024-3094", "severity": "critical", "agentCount": 5 },
    { "cve": "CVE-2024-6387", "severity": "high",     "agentCount": 12 }
  ],
  "compliance": { "cePlus": "pass", "pciDss": "n/a" }
}`;

export default function CustomerPortalPage() {
  const toasts = useToasts();

  function refresh() {
    toasts.push({ variant: "info", title: "Refreshing portal data", description: "Re-pulling tenant metrics from API..." });
  }

  return (
    <Page
      breadcrumb={[{ href: "/", label: "MergeIT" }, { label: "Report" }, { label: "Customer Portal" }]}
      title="Customer Portal"
      description="Per-tenant security snapshot - feeds the future MergeIT customer portal (Q3)."
      actions={
        <>
          <Button variant="secondary" onClick={refresh}>Refresh</Button>
          <Link href="/alerts"><Button variant="primary">Open alert queue</Button></Link>
        </>
      }
    >
      <section>
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-400/15 border border-emerald-400/40 grid place-items-center shrink-0 text-[10px] font-mono text-emerald-400">
              CP
            </div>
            <div>
              <div className="text-[15px] text-sage font-normal font-oswald">Proof-of-concept for the future customer portal</div>
              <p className="text-[11px] text-navy-600 mt-1.5 leading-relaxed max-w-3xl">
                {integration.description} This page renders the same data shape the portal
                will consume via a read-only API. Account managers use it to demo a tenant's view before the portal ships.
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
                <span className="text-emerald-400 shrink-0 text-[10px] font-mono">WAZ</span>
                <span className="text-sage flex-1">{m.label}</span>
                <Link href={m.href} className="text-emerald-400 hover:brightness-110 text-[11px]">
                  Open
                </Link>
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
              <CardSubtitle>All tenants the portal can serve - click &quot;Preview as tenant&quot; for the data shape</CardSubtitle>
            </div>
            <span className="text-[10.5px] text-navy-600">{tenants.length} tenants</span>
          </>
        }>
        <DataGrid columns={columns} rows={tenants} rowKey={t => t.id} />
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
          </div>
          <pre className="bg-navy border border-navy-500 rounded-lg p-4 text-[12px] leading-relaxed overflow-x-auto">
            <code className="text-cream font-mono whitespace-pre">{apiContract}</code>
          </pre>
          <div className="mt-3 text-[11px] text-navy-600">
            Backed by the Wazuh compliance, alerts, and vulnerabilities tables via internal aggregation. Stable from MergeIT SOC v1.0.
          </div>
        </div>
      </Card>
    </Page>
  );
}
