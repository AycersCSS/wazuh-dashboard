"use client";

import Link from "next/link";
import { useState } from "react";
import { Page, Card, CardTitle, CardSubtitle, Badge, Button, Input, StatCard } from "@/components/ui";
import { useConnectorStats } from "@/lib/connector/useConnectorStats";
import { useConnectorAlerts } from "@/lib/connector/useConnectorAlerts";
import { displayNameFor, tierFor } from "@/lib/tenantDisplay";
import { useWazuhResource, buildPath } from "@/lib/wazuh";
import type { WazuhAgentStatusCount, WazuhClusterStatus } from "@/lib/wazuh";

/**
 * ADMIN panel — multi-tenant / MSP fleet view.
 * Overview of every company (tenant), fleet-wide KPIs, and user registration.
 * Distinct from the customer portal, which is scoped to one company.
 */
export default function AdminPanelPage() {
  const { tenants: liveTenants, totalAgents, status } = useConnectorStats();
  const { data: agentStatus } = useWazuhResource<WazuhAgentStatusCount>(
    buildPath("/api/wazuh/agents/status-count")
  );
  const { data: clusterStatus } = useWazuhResource<WazuhClusterStatus>(
    buildPath("/api/wazuh/manager")
  );

  const tenants = liveTenants.map((id) => ({
    id,
    name: displayNameFor(id),
    tier: tierFor(id) ?? "Silver",
  }));

  const totalAgentsKpi =
    typeof totalAgents === "number"
      ? totalAgents
      : agentStatus
        ? agentStatus.active + agentStatus.disconnected + agentStatus.pending + agentStatus.never_connected
        : null;

  return (
    <Page
      breadcrumb={[{ label: "Admin" }, { label: "Fleet" }]}
      title="Admin — All tenants"
      description={
        status === "CONNECTED"
          ? `MSP overview · ${tenants.length} companies · ${totalAgentsKpi !== null ? totalAgentsKpi : "—"} endpoints fleet-wide`
          : "Connecting to connector…"
      }
      actions={
        <Link href="/customer-portal">
          <Button variant="secondary" size="sm">Open customer portal</Button>
        </Link>
      }
    >
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Companies" value={tenants.length} accent="neutral" hint="All tenants" />
        <StatCard label="Fleet agents" value={totalAgentsKpi !== null ? totalAgentsKpi : "—"} accent="info" hint="All endpoints" />
        <StatCard label="Active" value={agentStatus?.active ?? "—"} accent="low" hint="Reporting" />
        <StatCard label="Disconnected" value={agentStatus?.disconnected ?? "—"} accent="medium" hint="Offline" />
        <StatCard
          label="Manager"
          value={typeof clusterStatus?.manager === "string" ? clusterStatus.manager : "—"}
          accent="info"
          hint="Cluster"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        <Card className="lg:col-span-2" padded={false}
          header={
            <>
              <div>
                <CardTitle>Company directory</CardTitle>
                <CardSubtitle>Every tenant managed by this SOC — click a company to open its customer portal</CardSubtitle>
              </div>
              <Badge tone="info" dot>Admin</Badge>
            </>
          }
        >
          <ul className="divide-y divide-navy-400/60">
            {tenants.length === 0 && (
              <li className="px-4 py-6 text-[12px] text-slate-400">No tenants yet — register a user below or wait for connector data.</li>
            )}
            {tenants.map((t) => (
              <AdminTenantRow key={t.id} tenantId={t.id} name={t.name} tier={t.tier} />
            ))}
          </ul>
        </Card>

        <Card>
          <div className="mb-4">
            <CardTitle>Register user</CardTitle>
            <CardSubtitle>Create a customer account for a company</CardSubtitle>
          </div>
          <RegisterForm defaultTenants={tenants.map((t) => t.id)} />
        </Card>
      </section>
    </Page>
  );
}

function AdminTenantRow({ tenantId, name, tier }: { tenantId: string; name: string; tier: string }) {
  const { alerts } = useConnectorAlerts(tenantId);
  return (
    <li className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-navy-200/20 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 shrink-0 rounded-md bg-navy-200 border border-navy-500 grid place-items-center text-[10px] font-mono text-sage">
          {name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-[13px] text-cream truncate">{name}</div>
          <div className="text-[10px] font-mono text-slate-400 truncate">{tenantId}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
        <span className="text-severity-high">{alerts.critical}C</span>
        <span className="text-severity-high">{alerts.high}H</span>
        <span className="text-sage">{alerts.warning}W</span>
      </div>
      <Badge tone={tier === "Platinum" ? "low" : tier === "Gold" ? "medium" : "info"} dot>{tier}</Badge>
      <Link href={`/customer-portal?tenant=${encodeURIComponent(tenantId)}`}>
        <Button size="sm" variant="secondary">Open portal</Button>
      </Link>
    </li>
  );
}

function RegisterForm({ defaultTenants }: { defaultTenants: string[] }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState(defaultTenants[0] ?? "");
  const [wazuhGroupsRaw, setWazuhGroupsRaw] = useState("default");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSuccess(null);
    setError(null);
    const wazuh_groups = wazuhGroupsRaw.split(",").map((g) => g.trim()).filter(Boolean);
    try {
      const res = await fetch("/api/tenant/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, tenant_id: tenantId, wazuh_groups }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.ok === false) {
        throw new Error(body.error ?? body.message ?? `HTTP ${res.status}`);
      }
      setSuccess(`Registered ${username} for ${tenantId}`);
      setUsername("");
      setPassword("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Username</label>
        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jdoe" required />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Password</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Company tenant ID</label>
        <Input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="acme-corp" required />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">Wazuh groups</label>
        <Input value={wazuhGroupsRaw} onChange={(e) => setWazuhGroupsRaw(e.target.value)} placeholder="default, windows" />
      </div>
      {success && <p className="text-[12px] text-emerald-400">{success}</p>}
      {error && <p className="text-[12px] text-severity-high" role="alert">{error}</p>}
      <Button type="submit" variant="primary" disabled={busy}>{busy ? "Registering…" : "Register user"}</Button>
    </form>
  );
}
