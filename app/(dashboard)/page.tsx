"use client";
import Link from "next/link";
import { Page, Card, CardTitle, CardSubtitle, Badge, Button } from "@/components/ui";
import { integrations } from "@/data/integrations";
import { useConnectorStats } from "@/lib/connector/useConnectorStats";
import { useConnectorAlerts } from "@/lib/connector/useConnectorAlerts";
import { ConnectionBanner } from "@/components/connector/ConnectionBanner";
import { tenants as fallbackTenants } from "@/data/tenants";
import { displayNameFor, tierFor } from "@/lib/tenantDisplay";
import { cn } from "@/lib/cn";

const useCaseRoutes: Record<string, { href: string; tag?: "new" | "beta" }> = {
  "microsoft-365":  { href: "/microsoft-365" },
  "ninjaone":       { href: "/ninjaone" },
  "bitdefender":    { href: "/bitdefender" },
  "cyber-essentials": { href: "/cyber-essentials" },
  "customer-portal":  { href: "/customer-portal", tag: "beta" }
};

const useCaseOneLiner: Record<string, string> = {
  "microsoft-365":   "Identity, sign-in, and OAuth posture for every tenant in the fleet.",
  "ninjaone":        "Reconcile RMM device inventory with Wazuh agent coverage.",
  "bitdefender":     "Correlate GravityZone EDR detections with Wazuh alerts.",
  "cyber-essentials":"Audit-ready evidence pack, auto-built from Wazuh data.",
  "customer-portal": "Per-tenant security snapshot for the future MergeIT portal."
};

export default function OverviewPage() {
  const { status, lastFetchedAt, tenants: liveTenants, totalAgents } = useConnectorStats();
  const tenants = liveTenants.length > 0
    ? liveTenants.map((id) => ({
        id,
        name: displayNameFor(id),
        tier: tierFor(id) ?? "Silver",
        securityScore: 75,
        openIncidents: 0,
        lastSyncAt: new Date().toISOString(),
        alerts24h: 0,
        cveCount: 0
      }))
    : fallbackTenants;

  const totalAgentsKpi = totalAgents ?? 152;

  return (
    <Page
      breadcrumb={[{ label: "SOC" }, { label: "Overview" }]}
      title="Overview"
      description={`${tenants.length} tenants - ${totalAgentsKpi} endpoints - fleet health nominal`}
      actions={
        <>
          <ConnectionBanner status={status} lastFetchedAt={lastFetchedAt} />
          <Link href="/alerts"><Button variant="primary">Open alert queue</Button></Link>
        </>
      }
    >
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {integrations.map(i => {
          const route = useCaseRoutes[i.id];
          const oneLiner = useCaseOneLiner[i.id];
          const tone = i.status === "Connected" ? "low" : i.status === "Degraded" ? "medium" : "critical";
          return (
            <Link
              key={i.id}
              href={route?.href ?? "/"}
              className="group"
            >
              <Card className="h-full transition-colors group-hover:border-navy-500">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-400/15 border border-emerald-400/40 grid place-items-center text-[10px] font-mono text-emerald-400">
                    {i.id.slice(0, 3).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {route?.tag && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 h-[18px] grid place-items-center rounded bg-emerald-400/20 text-emerald-400">
                        {route.tag}
                      </span>
                    )}
                    <Badge tone={tone} dot>{i.status}</Badge>
                  </div>
                </div>
                <div className="text-[15px] font-oswald font-medium text-sage">{i.name}</div>
                <p className="text-[11.5px] text-slate-300 mt-1.5 leading-relaxed min-h-[44px]">{oneLiner}</p>
                <div className="mt-4 pt-3 border-t border-navy-400 flex items-center justify-between">
                  <span className="text-[10.5px] text-slate-400 font-mono">{i.vendor}</span>
                  <span className="inline-flex items-center gap-1 text-[11.5px] text-emerald-400 group-hover:brightness-110">
                    View &gt;
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2" padded={false}
          header={
            <>
              <div>
                <CardTitle>MSP fleet</CardTitle>
                <CardSubtitle>Tenants currently managed by MergeIT SOC</CardSubtitle>
              </div>
              <Link href="/customer-portal"><Button size="sm" variant="secondary">All tenants</Button></Link>
            </>
          }>
          <ul className="divide-y divide-navy-400/60">
            {tenants.map(t => (
              <TenantRow key={t.id} tenantId={t.id} name={t.name} tier={t.tier} />
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <CardTitle>Fleet at a glance</CardTitle>
          </div>
          <ul className="space-y-3 text-[12px]">
            <li className="flex items-center justify-between">
              <span className="text-sage">Total tenants</span>
              <span className="font-mono text-cream">{tenants.length}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sage">Total agents</span>
              <span className="font-mono text-cream">{totalAgentsKpi}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sage">Endpoints (RMM)</span>
              <span className="font-mono text-cream">152</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sage">Avg security score</span>
              <span className="font-mono text-emerald-400">75</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sage">Open incidents</span>
              <span className="font-mono text-severity-medium">0</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sage">CE Plus ready</span>
              <span className="font-mono text-emerald-400">3 / 4</span>
            </li>
            <li className="flex items-center justify-between border-t border-navy-400/50 pt-2.5">
              <span className="text-sage flex items-center gap-1">
                Avg MTTR (SLA)
                <span className="text-[9px] text-slate-400 bg-navy-200 px-1 py-0.5 rounded">Goal &lt;15m</span>
              </span>
              <span className="font-mono font-semibold text-emerald-400">12.8m</span>
            </li>
          </ul>
          <div className="mt-4 pt-3 border-t border-navy-400 text-[11px] text-slate-400">
            Data refreshes every 30 seconds from the MergeIT Connector.
          </div>
        </Card>
      </section>
    </Page>
  );
}

function TenantRow({ tenantId, name, tier }: { tenantId: string; name: string; tier: string }) {
  const { alerts } = useConnectorAlerts(tenantId);
  return (
    <li className="px-4 py-3.5 flex items-center justify-between hover:bg-navy-200/20 transition-colors">
      <div className="flex items-center gap-3 min-w-[200px]">
        <div className="w-8 h-8 rounded-md bg-navy-200 border border-navy-500 grid place-items-center text-[10px] font-mono text-sage">
          {name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div className="text-[13px] text-cream">{name}</div>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-mono">
        <span className="text-severity-high">{alerts.critical}C</span>
        <span className="text-severity-high">{alerts.high}H</span>
        <span className="text-sage">{alerts.warning}W</span>
      </div>
      <Badge tone={tier === "Platinum" ? "low" : tier === "Gold" ? "medium" : "info"} dot>{tier}</Badge>
    </li>
  );
}
