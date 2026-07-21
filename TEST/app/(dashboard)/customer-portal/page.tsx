"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Page, Card, CardTitle, CardSubtitle, StatCard, Badge, Button } from "@/components/ui";
import { useConnectorStats } from "@/lib/connector/useConnectorStats";
import { useConnectorAlerts } from "@/lib/connector/useConnectorAlerts";
import { displayNameFor, tierFor } from "@/lib/tenantDisplay";
import { useWazuhResource, buildPath } from "@/lib/wazuh";
import type { WazuhAgentStatusCount } from "@/lib/wazuh";
import { formatRelativeTime } from "@/lib/format";

/**
 * CUSTOMER PORTAL — single-company view.
 * Scoped to one tenant (from ?tenant= or first available). Not the admin fleet overview.
 */
export default function CustomerPortalPage() {
  const searchParams = useSearchParams();
  const { tenants: liveTenantIds, totalAgents, status } = useConnectorStats();
  const { data: agentStatus } = useWazuhResource<WazuhAgentStatusCount>(
    buildPath("/api/wazuh/agents/status-count")
  );

  const tenantId = useMemo(() => {
    const q = searchParams.get("tenant");
    if (q && liveTenantIds.includes(q)) return q;
    if (q) return q;
    return liveTenantIds[0] ?? "acme-corp";
  }, [searchParams, liveTenantIds]);

  const companyName = displayNameFor(tenantId);
  const tier = tierFor(tenantId) ?? "Silver";
  const { alerts } = useConnectorAlerts(tenantId);

  const agentsForCompany =
    typeof totalAgents === "number" && liveTenantIds.length > 0
      ? Math.max(1, Math.round(totalAgents / Math.max(liveTenantIds.length, 1)))
      : agentStatus
        ? Math.max(1, Math.round((agentStatus.active + agentStatus.disconnected) / Math.max(liveTenantIds.length || 1, 1)))
        : null;

  return (
    <Page
      breadcrumb={[{ href: "/", label: "SOC" }, { label: "Customer portal" }, { label: companyName }]}
      title={companyName}
      description={`Customer portal · single company · ${tenantId} · ${tier} tier`}
      actions={
        <>
          <Link href="/admin"><Button variant="secondary" size="sm">Admin fleet</Button></Link>
          <Link href="/alerts"><Button variant="primary" size="sm">Alerts</Button></Link>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="info" dot>Customer view</Badge>
        <Badge tone={tier === "Platinum" ? "low" : tier === "Gold" ? "medium" : "info"} dot>{tier}</Badge>
        <span className="text-[11px] font-mono text-slate-400">
          {status === "CONNECTED" ? "Live from connector" : "Connecting…"}
          {" · "}
          last refresh {formatRelativeTime(new Date().toISOString())}
        </span>
      </div>

      {liveTenantIds.length > 1 && (
        <Card className="mb-5">
          <CardTitle>Your company</CardTitle>
          <CardSubtitle>This portal shows one company only. Switch company (demo):</CardSubtitle>
          <div className="mt-3 flex flex-wrap gap-2">
            {liveTenantIds.map((id) => (
              <Link key={id} href={`/customer-portal?tenant=${encodeURIComponent(id)}`}>
                <Button size="sm" variant={id === tenantId ? "primary" : "secondary"}>
                  {displayNameFor(id)}
                </Button>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Company agents" value={agentsForCompany ?? "—"} accent="info" hint="Endpoints for this company" />
        <StatCard label="Critical alerts" value={alerts.critical} accent="critical" hint="This company" />
        <StatCard label="High alerts" value={alerts.high} accent="high" hint="This company" />
        <StatCard label="Warnings" value={alerts.warning} accent="medium" hint="This company" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <Card>
          <CardTitle>Company snapshot</CardTitle>
          <CardSubtitle>Scoped to {companyName} — not fleet-wide</CardSubtitle>
          <ul className="mt-4 space-y-3 text-[12px]">
            <li className="flex justify-between"><span className="text-sage">Tenant ID</span><span className="font-mono text-cream">{tenantId}</span></li>
            <li className="flex justify-between"><span className="text-sage">Display name</span><span className="text-cream">{companyName}</span></li>
            <li className="flex justify-between"><span className="text-sage">Service tier</span><Badge tone="info" dot>{tier}</Badge></li>
            <li className="flex justify-between"><span className="text-sage">Alert total</span><span className="font-mono text-cream">{alerts.total}</span></li>
            <li className="flex justify-between border-t border-navy-400/50 pt-2.5">
              <span className="text-sage">Active agents (fleet share)</span>
              <span className="font-mono text-cream">{agentStatus?.active ?? "—"}</span>
            </li>
          </ul>
        </Card>

        <Card>
          <CardTitle>Security posture</CardTitle>
          <CardSubtitle>What this company sees in their portal</CardSubtitle>
          <ul className="mt-4 space-y-2 text-[12px]">
            <li className="flex items-center justify-between rounded-lg border border-navy-400/50 px-3 py-2">
              <span className="text-sage">Open critical</span>
              <span className="font-mono text-severity-high">{alerts.critical}</span>
            </li>
            <li className="flex items-center justify-between rounded-lg border border-navy-400/50 px-3 py-2">
              <span className="text-sage">Open high</span>
              <span className="font-mono text-severity-high">{alerts.high}</span>
            </li>
            <li className="flex items-center justify-between rounded-lg border border-navy-400/50 px-3 py-2">
              <span className="text-sage">Warnings</span>
              <span className="font-mono text-cream">{alerts.warning}</span>
            </li>
          </ul>
          <div className="mt-4 flex gap-2">
            <Link href="/alerts"><Button size="sm" variant="primary">View company alerts</Button></Link>
            <Link href="/agents"><Button size="sm" variant="secondary">View agents</Button></Link>
          </div>
        </Card>
      </section>

      <Card className="mt-5">
        <CardTitle>Admin vs customer</CardTitle>
        <CardSubtitle>
          Admin panel lists every company and can register users. This portal is for one company only.
        </CardSubtitle>
        <div className="mt-3">
          <Link href="/admin"><Button variant="secondary" size="sm">Go to admin (all tenants)</Button></Link>
        </div>
      </Card>
    </Page>
  );
}
