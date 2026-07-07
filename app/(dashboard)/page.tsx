"use client";
import Link from "next/link";
import { Page, Card, CardTitle, CardSubtitle, Badge, Button } from "@/components/ui";
import { useConnectorStats } from "@/lib/connector/useConnectorStats";
import { useConnectorAlerts } from "@/lib/connector/useConnectorAlerts";
import { displayNameFor, tierFor } from "@/lib/tenantDisplay";
import { useWazuhResource, buildPath, useIntegrationStates, type IntegrationConnectionState } from "@/lib/wazuh";
import type { WazuhAgentStatusCount } from "@/lib/wazuh";
import { integrations as integrationMetadata } from "@/data/integrations";
import type { IntegrationHealth } from "@/data/integrations";

// ---------------------------------------------------------------------------
// Unified integration config — routes + one-liner descriptions in one place
// so they can never get out of sync.
// ---------------------------------------------------------------------------
const USE_CASE_CONFIG: Record<string, { href: string; tag?: "new" | "beta"; description: string }> = {
  "microsoft-365": {
    href: "/microsoft-365",
    description: "Identity, sign-in, and OAuth posture for every tenant in the fleet."
  },
  "ninjaone": {
    href: "/ninjaone",
    description: "Reconcile RMM device inventory with Wazuh agent coverage."
  },
  "bitdefender": {
    href: "/bitdefender",
    description: "Correlate GravityZone EDR detections with Wazuh alerts."
  },
  "cyber-essentials": {
    href: "/cyber-essentials",
    description: "Audit-ready evidence pack, auto-built from Wazuh data."
  },
  "customer-portal": {
    href: "/customer-portal",
    tag: "beta",
    description: "Per-tenant security snapshot for the future MergeIT portal."
  }
};

export default function OverviewPage() {
  const { tenants: liveTenants, totalAgents } = useConnectorStats();
  const integrationStates = useIntegrationStates();

  // TODO(replace-when-endpoint-ready): GET /agents/summary/status — gives
  // us the active/disconnected/pending/never_connected counts the KPI panel
  // wants. The hook returns null while loading or when the upstream is
  // unreachable; we fall back to the live tenant list count.
  const { data: agentStatus } = useWazuhResource<WazuhAgentStatusCount>(
    buildPath("/api/wazuh/agents/status-count")
  );

  // NOTE: clusterStatus (GET /manager/status) is intentionally not fetched
  // here until the upstream endpoint is ready — polling a non-existent
  // endpoint every 30s wastes resources. Re-enable when the connector
  // exposes /manager with the required fields.
  // const { data: clusterStatus } = useWazuhResource<WazuhClusterStatus>(
  //   buildPath("/api/wazuh/manager")
  // );

  const tenants = liveTenants.map((id) => ({
    id,
    name: displayNameFor(id),
    tier: tierFor(id) ?? "Silver",
    lastSyncAt: new Date().toISOString(),
  }));

  // Fixed: was `totalAgents ?? agentStatus ? ... : null` which is a
  // precedence bug — `??` binds after `?:` so `agentStatus` (truthy object)
  // always won, crashing when agentStatus was null.
  const totalAgentsKpi: number | null =
    totalAgents !== null
      ? totalAgents
      : agentStatus !== null && agentStatus !== undefined
        ? agentStatus.active + agentStatus.disconnected + agentStatus.pending + agentStatus.never_connected
        : null;

  return (
    <Page
      breadcrumb={[{ label: "SOC" }, { label: "Overview" }]}
      title="Overview"
      description={`${tenants.length} tenants - ${totalAgentsKpi !== null ? totalAgentsKpi : "—"} endpoints - fleet health nominal`}
      actions={
        <Link href="/alerts"><Button variant="primary">Open alert queue</Button></Link>
      }
    >
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {integrationMetadata.map((i: IntegrationHealth) => {
          const config = USE_CASE_CONFIG[i.id];
          const live = integrationStates[i.id as keyof typeof integrationStates];
          const statusLabel = live?.statusName ?? connectionLabel(live?.state);
          const tone = connectionTone(live?.state);
          return (
            <Link
              key={i.id}
              href={config?.href ?? "/"}
              className="group"
            >
              <Card className="h-full transition-colors group-hover:border-navy-500">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-400/15 border border-emerald-400/40 grid place-items-center text-[10px] font-mono text-emerald-400">
                    {i.id.slice(0, 3).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {config?.tag && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 h-[18px] grid place-items-center rounded bg-emerald-400/20 text-emerald-400">
                        {config.tag}
                      </span>
                    )}
                    <Badge tone={tone} dot>{statusLabel}</Badge>
                  </div>
                </div>
                <div className="text-[15px] font-oswald font-medium text-sage">{i.name}</div>
                <p className="text-[11.5px] text-slate-300 mt-1.5 leading-relaxed min-h-[44px]">{config?.description}</p>
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
              <span className="font-mono text-cream">{totalAgentsKpi !== null ? totalAgentsKpi : "—"}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sage">Active agents</span>
              <span className="font-mono text-cream">{agentStatus?.active ?? "—"}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sage">Disconnected</span>
              <span className="font-mono text-cream">{agentStatus?.disconnected ?? "—"}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sage">Pending</span>
              <span className="font-mono text-cream">{agentStatus?.pending ?? "—"}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sage">Never connected</span>
              <span className="font-mono text-severity-high">{agentStatus?.never_connected ?? "—"}</span>
            </li>
            <li className="flex items-center justify-between border-t border-navy-400/50 pt-2.5">
              <span className="text-sage flex items-center gap-1">
                Manager
                <span className="text-[9px] text-slate-400 bg-navy-200 px-1 py-0.5 rounded">wazuh</span>
              </span>
              {/* Populated once the /manager endpoint is live */}
              <span className="font-mono text-cream">—</span>
            </li>
          </ul>
          <div className="mt-4 pt-3 border-t border-navy-400 text-[11px] text-slate-400">
            Data refreshes every 30 seconds from the MergeIT Connector + Wazuh API.
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

function connectionLabel(state: IntegrationConnectionState | undefined): string {
  switch (state) {
    case "CONNECTED":    return "Connected";
    case "DEGRADED":     return "Degraded";
    case "DISCONNECTED": return "Disconnected";
    case "NOT_CONNECTED":return "Not connected";
    case "UNAUTHENTICATED": return "Sign in";
    case "ERROR":        return "Error";
    case "LOADING":      return "Checking…";
    default:             return "Not connected";
  }
}

function connectionTone(state: IntegrationConnectionState | undefined): "low" | "medium" | "high" | "critical" | "info" | "neutral" {
  switch (state) {
    case "CONNECTED":    return "low";
    case "DEGRADED":     return "medium";
    case "DISCONNECTED": return "critical";
    case "NOT_CONNECTED":return "critical";
    case "UNAUTHENTICATED": return "high";
    case "ERROR":        return "critical";
    case "LOADING":      return "neutral";
    default:             return "neutral";
  }
}
