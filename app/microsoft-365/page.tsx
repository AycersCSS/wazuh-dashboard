"use client";
import Link from "next/link";
import { Cloud, ArrowUpRight, ShieldAlert, CheckCircle2, Activity, KeyRound, ScrollText, RefreshCcw } from "lucide-react";
import { Page, Card, CardTitle, CardSubtitle, StatCard, Badge, Button, Table, type Column } from "@/components/ui";
import { getIntegration } from "@/data/integrations";
import { useToasts } from "@/hooks/useToasts";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const integration = getIntegration("microsoft-365")!;

const kpis = [
  { label: "Failed sign-ins (24h)", value: "1,284", delta: "+18%",  dir: "up" as const,  hint: "across 4 tenants",   accent: "high" as const },
  { label: "Risky sign-ins",        value: "37",    delta: "+6",    dir: "up" as const,  hint: "Microsoft Identity Protection", accent: "critical" as const },
  { label: "MFA-disabled users",    value: "12",    delta: "-2",    dir: "down" as const, hint: "2 newly disabled",  accent: "medium" as const },
  { label: "New OAuth consents",    value: "5",     delta: "+1",    dir: "up" as const,  hint: "Graph API scope",   accent: "info" as const }
];

type Rec = { id: string; time: string; sev: "critical" | "high" | "medium" | "low" | "info"; tenant: string; user: string; desc: string; wazuh: string };

const recent: Rec[] = [
  { id: "M365-001", time: "2m",  sev: "critical", tenant: "Acme Corp",  user: "a.halsey@acme.co.uk",     desc: "Sign-in from previously unseen country (RU)", wazuh: "rule 91841" },
  { id: "M365-002", time: "14m", sev: "high",     tenant: "Globex",     user: "j.werner@globex.de",      desc: "Impossible travel: London -> Singapore in 12 min", wazuh: "rule 91842" },
  { id: "M365-003", time: "1h",  sev: "medium",   tenant: "Initech",    user: "p.gibbons@initech.com",   desc: "OAuth consent granted to 3rd-party app 'SalesPilot'", wazuh: "rule 91820" },
  { id: "M365-004", time: "3h",  sev: "low",      tenant: "Stark Industries", user: "t.stark@stark.io",   desc: "Conditional access policy evaluated (block)", wazuh: "rule 91801" },
  { id: "M365-005", time: "5h",  sev: "info",     tenant: "Acme Corp",  user: "f.kowalski@acme.co.uk",   desc: "Password changed by user (self-service)", wazuh: "rule 91810" }
];

const columns: Column<Rec>[] = [
  { key: "time", header: "Time", width: "90px", cell: r => <span className="text-navy-600">{r.time}</span> },
  { key: "sev",  header: "Severity", width: "120px", cell: r => <Badge tone={r.sev} dot>{r.sev}</Badge> },
  { key: "tenant", header: "Tenant", width: "140px", cell: r => <span className="text-cream">{r.tenant}</span> },
  { key: "user", header: "User", cell: r => <span className="font-mono text-sage">{r.user}</span> },
  { key: "desc", header: "Event", cell: r => <span className="text-cream">{r.desc}</span> },
  { key: "wazuh", header: "Wazuh", width: "120px", cell: r => <Link href="/alerts" className="inline-flex items-center gap-1 text-emerald-400 hover:brightness-110 text-[12px]"><ArrowUpRight size={12} /> {r.wazuh}</Link> }
];

export default function Microsoft365Page() {
  const toasts = useToasts();

  function refresh() {
    toasts.push({ variant: "info", title: "Refreshing Microsoft 365", description: "Polling Graph API for last 24h events..." });
  }

  return (
    <Page
      breadcrumb={[{ href: "/", label: "MergeIT" }, { label: "Operate" }, { label: "Microsoft 365" }]}
      icon={Cloud}
      title="Microsoft 365"
      description="Identity, sign-in, and OAuth posture for every tenant in the MergeIT fleet."
      actions={
        <>
          <Button variant="secondary" icon={<RefreshCcw size={14} />} onClick={refresh}>Refresh</Button>
          <Link href="/alerts"><Button variant="primary" icon={<ArrowUpRight size={14} />}>Open alert queue</Button></Link>
        </>
      }
    >
      <section>
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-severity-info/15 border border-severity-info/40 grid place-items-center shrink-0">
              <Cloud size={18} className="text-severity-info" />
            </div>
            <div>
              <div className="text-[15px] text-sage font-normal font-oswald">Identity-driven SOC for Microsoft 365 tenants</div>
              <p className="text-[11px] text-navy-600 mt-1.5 leading-relaxed max-w-3xl">
                {integration.description} MergeIT analysts use this view to triage risky sign-ins, flag MFA gaps, and surface OAuth consent grants that
                an MSP account manager would otherwise have to dig through ten different Azure AD portals to find.
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
                <ShieldAlert size={12} className="text-emerald-400 shrink-0" />
                <span className="text-sage flex-1">{m.label}</span>
                <Link href={m.href} className="inline-flex items-center gap-1 text-emerald-400 hover:brightness-110 text-[11px]">
                  Open <ArrowUpRight size={11} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t border-navy-400/60 text-[11px] text-navy-600 flex items-center gap-2">
            <ScrollText size={11} /> Custom rule family <span className="font-mono text-sage">91800-91899</span> - managed by MergeIT.
          </div>
        </Card>
      </section>

      <Card padded={false}
        header={
          <>
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardSubtitle>Last 24h - Microsoft 365 - click an event to investigate in Wazuh</CardSubtitle>
            </div>
            <Link href="/alerts"><Button size="sm" variant="secondary" icon={<ArrowUpRight size={12} />}>All events</Button></Link>
          </>
        }>
        <Table columns={columns} rows={recent} rowKey={r => r.id} />
      </Card>
    </Page>
  );
}
