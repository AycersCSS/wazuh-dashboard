"use client";
import { useEffect, useState } from "react";
import { Page, Card, CardTitle, CardSubtitle, StatCard, Badge, Button } from "@/components/ui";
import type { TenantSnapshot } from "@/lib/wazuh/types";
import { useToasts } from "@/components/providers/ToastProvider";

export default function TenantDashboardPage() {
  const [snapshot, setSnapshot] = useState<TenantSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toasts = useToasts();

  useEffect(() => {
    fetch("/api/wazuh/snapshot")
      .then(r => r.json())
      .then((j: { ok: boolean; data?: TenantSnapshot; error?: string }) => {
        if (!j.ok || !j.data) throw new Error(j.error ?? "load_failed");
        setSnapshot(j.data);
      })
      .catch(err => setError(err instanceof Error ? err.message : "load_failed"));
  }, []);

  if (error) {
    return (
      <Page title="Dashboard">
        <Card>
          <div className="text-severity-critical text-sm">Failed to load: {error}</div>
        </Card>
      </Page>
    );
  }

  if (!snapshot) {
    return (
      <Page title="Dashboard" description="Loading tenant snapshot...">
        <div className="text-navy-600 text-sm">Loading...</div>
      </Page>
    );
  }

  const scoreAccent =
    snapshot.securityScore >= 85 ? "low" :
    snapshot.securityScore >= 70 ? "medium" : "high";
  const incidentAccent =
    snapshot.openIncidents === 0 ? "low" :
    snapshot.openIncidents < 5   ? "medium" : "high";
  const cveAccent = snapshot.cveCount === 0 ? "low" : "medium";

  return (
    <Page
      breadcrumb={[{ label: "Portal" }, { label: "Dashboard" }]}
      title="Security posture"
      description={`${snapshot.openIncidents} open incidents - last refreshed just now`}
      actions={
        <>
          <Button variant="secondary" size="md" onClick={() => toasts.push({ variant: "info", title: "Export started", description: "JSON download queued" })}>
            Export
          </Button>
          <Button variant="primary" size="md" onClick={() => toasts.push({ variant: "success", title: "Snapshot pinned" })}>
            Pin snapshot
          </Button>
        </>
      }
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Security score"
          value={`${snapshot.securityScore} / 100`}
          accent={scoreAccent}
          delta={snapshot.securityScore >= 85 ? "Trending up" : "Flat"}
          dir={snapshot.securityScore >= 85 ? "up" : "flat"}
          hint="Composite of EDR, MFA, patching, FIM"
        />
        <StatCard
          label="Open incidents"
          value={String(snapshot.openIncidents)}
          accent={incidentAccent}
          hint="Across alerts queue"
        />
        <StatCard
          label="Alerts (24h)"
          value={String(snapshot.alerts24h)}
          hint="Tenant-wide"
        />
        <StatCard
          label="CVEs open"
          value={String(snapshot.cveCount)}
          accent={cveAccent}
          hint="Across registered agents"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        <Card className="lg:col-span-2" padded={false}
          header={
            <>
              <div>
                <CardTitle>Endpoint coverage</CardTitle>
                <CardSubtitle>{snapshot.agentCount} agents reporting to Wazuh</CardSubtitle>
              </div>
              <Badge tone={snapshot.activeAgentCount === snapshot.agentCount ? "low" : "medium"} dot>
                {snapshot.activeAgentCount} / {snapshot.agentCount} active
              </Badge>
            </>
          }
          footer={
            <span className="text-[10.5px] text-navy-600">
              Refreshed {new Date(snapshot.lastSyncAt).toLocaleTimeString()} - data lag &lt; 5 min
            </span>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
            <Coverage label="Active"      value={snapshot.activeAgentCount}                            tone="low" />
            <Coverage label="Disconnected" value={Math.max(0, snapshot.agentCount - snapshot.activeAgentCount)} tone="medium" />
            <Coverage label="OS coverage" value="3 / 4" tone="info" />
            <Coverage label="Patch window" value="48h"   tone="neutral" />
          </div>
        </Card>

        <Card>
          <CardTitle>What you can do</CardTitle>
          <CardSubtitle>Everything below is scoped to {snapshot.name}.</CardSubtitle>
          <ul className="text-[12.5px] text-sage space-y-2.5 mt-3">
            <li className="flex items-start gap-2">
              <Badge tone="info" dot>read</Badge>
              <span>Browse alerts, agents, vulnerabilities, file integrity, rules, and compliance for your tenant.</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge tone="medium" dot>write</Badge>
              <span>Acknowledge alerts, escalate, archive, isolate or restart agents, mark FIM reviewed, set vulnerability status, toggle rules.</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge tone="neutral" dot>audit</Badge>
              <span>Every action is written to the audit log for SOC review.</span>
            </li>
          </ul>
        </Card>
      </section>

      <section className="mt-5">
        <Card padded={false}
          header={
            <>
              <div>
                <CardTitle>Quick links</CardTitle>
                <CardSubtitle>Jump to a tenant view</CardSubtitle>
              </div>
            </>
          }
        >
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-navy-400/60">
            {[
              { href: "/alerts",          label: "Alerts",       count: snapshot.alerts24h },
              { href: "/agents",          label: "Agents",       count: snapshot.agentCount },
              { href: "/vulnerabilities", label: "Vulnerabilities", count: snapshot.cveCount },
              { href: "/fim",             label: "File integrity" },
              { href: "/compliance",      label: "Compliance" }
            ].map(q => (
              <li key={q.href}>
                <a href={q.href} className="block px-4 py-3 hover:bg-navy-200 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] text-cream">{q.label}</span>
                    {typeof q.count === "number" && (
                      <span className="text-[10.5px] font-mono text-navy-600">{q.count}</span>
                    )}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </Page>
  );
}

function Coverage({ label, value, tone }: { label: string; value: React.ReactNode; tone: "low" | "medium" | "info" | "neutral" }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-navy-600 font-semibold">{label}</div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[18px] text-cream">{value}</span>
        <Badge tone={tone}>{label}</Badge>
      </div>
    </div>
  );
}
