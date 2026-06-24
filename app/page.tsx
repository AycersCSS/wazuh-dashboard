"use client";
import Link from "next/link";
import { Page, Card, CardTitle, CardSubtitle, Badge, Button } from "@/components/ui";
import { integrations } from "@/data/integrations";
import { tenants } from "@/data/tenants";
import { agents } from "@/data/seed";
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

// Hoisted: these depend only on module-level constants.
const TOTAL_AGENTS = agents.length;
const AVG_SECURITY_SCORE = Math.round(tenants.reduce((s, t) => s + t.securityScore, 0) / tenants.length);
const TOTAL_OPEN_INCIDENTS = tenants.reduce((s, t) => s + t.openIncidents, 0);

export default function OverviewPage() {
  return (
    <Page
      breadcrumb={[{ label: "SOC" }, { label: "Overview" }]}
      title="Overview"
      description={`${tenants.length} tenants - ${TOTAL_AGENTS} endpoints - fleet health nominal`}
      actions={
        <>
          <Button variant="secondary" size="md">Fleet health: nominal</Button>
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
                <p className="text-[11px] text-navy-600 mt-1.5 leading-relaxed min-h-[44px]">{oneLiner}</p>
                <div className="mt-4 pt-3 border-t border-navy-400 flex items-center justify-between">
                  <span className="text-[10.5px] text-navy-600 font-mono">{i.vendor}</span>
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
              <li key={t.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-navy-200 border border-navy-500 grid place-items-center text-[10px] font-mono text-sage">
                  {t.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[13px] text-cream">
                    <span>{t.name}</span>
                    <Badge tone={t.tier === "Platinum" ? "low" : t.tier === "Gold" ? "medium" : t.tier === "Silver" ? "info" : "neutral"} dot>{t.tier}</Badge>
                  </div>
                  <div className="text-[10.5px] text-navy-600 mt-0.5">
                    {t.openIncidents} open - {t.alerts24h} alerts (24h) - {t.cveCount} CVEs
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn("font-mono text-[13px]", t.securityScore >= 85 ? "text-emerald-400" : t.securityScore >= 70 ? "text-severity-medium" : "text-severity-high")}>{t.securityScore}</div>
                  <div className="text-[10px] text-navy-600">score</div>
                </div>
              </li>
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
              <span className="font-mono text-cream">{TOTAL_AGENTS}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sage">Endpoints (RMM)</span>
              <span className="font-mono text-cream">152</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sage">Avg security score</span>
              <span className="font-mono text-emerald-400">
                {AVG_SECURITY_SCORE}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sage">Open incidents</span>
              <span className="font-mono text-severity-medium">
                {TOTAL_OPEN_INCIDENTS}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sage">CE Plus ready</span>
              <span className="font-mono text-emerald-400">3 / 4</span>
            </li>
          </ul>
          <div className="mt-4 pt-3 border-t border-navy-400 text-[11px] text-navy-600">
            Data refreshes every 5 minutes from the MergeIT tenant API.
          </div>
        </Card>
      </section>
    </Page>
  );
}
