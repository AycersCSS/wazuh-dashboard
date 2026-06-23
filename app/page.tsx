"use client";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import {
  AlertTriangle, ArrowUpRight, ShieldCheck, Activity, Filter, RefreshCcw,
  Globe2, Server, Cpu, GitBranch
} from "lucide-react";
import { alerts, agents, alertTimeline, geoTop, kpi, vulnerabilities } from "@/data/seed";
import { StatCard, Card, CardTitle, CardSubtitle, Badge, Button } from "@/components/ui";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import Link from "next/link";
import { useToasts } from "@/hooks/useToasts";
import { useTimeRange } from "@/hooks/useTimeRange";
import { Page } from "@/components/ui/Page";
import { useAcknowledge } from "@/hooks/useAlertsStore";
import { severityBucket } from "@/types";
import type { Severity } from "@/types";
import { cn } from "@/lib/cn";

const sevColors: Record<string, string> = {
  critical: "#E11D48",
  high:     "#EA580C",
  medium:   "#D97706",
  low:      "#059669",
  info:     "#0EA5E9"
};

const CHART_TOOLTIP = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  fontSize: 12,
  color: "#0F172A"
} as const;

export default function OverviewPage() {
  const toasts = useToasts();
  const { range, setKey } = useTimeRange();
  const acknowledge = useAcknowledge();
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    toasts.push({ variant: "info", title: "Refreshing data", description: "Pulling latest from manager...", duration: 1500 });
    window.setTimeout(() => {
      setRefreshing(false);
      toasts.push({ variant: "success", title: "Overview updated", description: "Re-queried 1,284 events - 64 agents" });
    }, 900);
  }

  const total24h = alertTimeline.reduce((s, h) => s + h.critical + h.high + h.medium + h.low, 0);

  const sevBreakdown = useMemo(() => {
    const k = range.key === "1h" ? 0.06 : range.key === "7d" ? 5.2 : range.key === "30d" ? 21 : 1;
    return [
      { name: "Critical", value: Math.round(kpi.alertsCritical * k), color: sevColors.critical },
      { name: "High",     value: Math.round(alertTimeline.reduce((s,h)=>s+h.high,0)     * k), color: sevColors.high },
      { name: "Medium",   value: Math.round(alertTimeline.reduce((s,h)=>s+h.medium,0)   * k), color: sevColors.medium },
      { name: "Low",      value: Math.round(alertTimeline.reduce((s,h)=>s+h.low,0)      * k), color: sevColors.low },
      { name: "Info",     value: Math.round(312 * k),                                     color: sevColors.info }
    ];
  }, [range.key]);

  const mitreCounts = useMemo(() => {
    const m = new Map<string, { tactic: string; count: number }>();
    alerts.forEach(a => {
      if (!a.rule.mitre) return;
      const cur = m.get(a.rule.mitre.id);
      m.set(a.rule.mitre.id, { tactic: a.rule.mitre.tactic, count: (cur?.count ?? 0) + 1 });
    });
    return Array.from(m.values()).toSorted((a, b) => b.count - a.count).slice(0, 7);
  }, []);

  const topAgents = useMemo(() => {
    const counts = new Map<string, number>();
    for (const x of alerts) counts.set(x.agent.id, (counts.get(x.agent.id) ?? 0) + 1);
    const out: (typeof agents[number] & { alertCount: number })[] = [];
    for (const a of agents) {
      if (a.status !== "active") continue;
      out.push({ ...a, alertCount: counts.get(a.id) ?? 0 });
    }
    return out.toSorted((a, b) => b.alertCount - a.alertCount).slice(0, 6);
  }, []);

  const recent = alerts.slice(0, 8);

  return (
    <Page
      breadcrumb={[{ label: "SOC" }, { label: "Overview" }]}
      icon={Activity}
      title="Overview"
      description={`${kpi.alertsCritical} critical alerts need acknowledgement - fleet health nominal - MTTR 7m 12s`}
      actions={
        <>
          <Button variant="secondary" size="md" onClick={handleRefresh} disabled={refreshing} icon={<RefreshCcw size={14} className={refreshing ? "animate-spin" : ""} />}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button variant="secondary" size="md" icon={<Filter size={14} />}>{range.label}</Button>
          <Link href="/alerts"><Button variant="primary" icon={<ArrowUpRight size={14} />}>Open alert queue</Button></Link>
        </>
      }
    >
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Active Agents" value={`${kpi.agentsActive} / ${kpi.agentsTotal}`} delta="+2" dir="up" hint={`${kpi.agentsDisconnected} disconnected`} />
        <StatCard label="Events / sec"  value={formatCompact(kpi.eventsPerSecond)} delta="+8.2%" dir="up" hint="rolling 5m average" accent="info" />
        <StatCard label={`Alerts - ${range.label.replace("Last ", "")}`} value={formatCompact(total24h)} delta="+12%" dir="up" hint="vs. previous period" />
        <StatCard label="Critical"      value={kpi.alertsCritical} delta="+3" dir="down" hint="requires L2 review" accent="critical" />
        <StatCard label="Open CVEs"     value={kpi.vulnsOpen} delta="-4" dir="up" hint="12 critical across fleet" accent="high" />
        <StatCard label="Compliance"    value={`${Math.round(kpi.complianceScore * 100)}%`} delta="+0.4" dir="up" hint="weighted across frameworks" accent="low" />
      </section>

      <section className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 xl:col-span-8" padded={false}
          header={
            <>
              <div>
                <CardTitle>Alert volume</CardTitle>
                <CardSubtitle>{range.label} - stacked by severity, hour granularity</CardSubtitle>
              </div>
              <div className="flex items-center gap-3">
                {(["critical","high","medium","low"] as const).map(k => (
                  <span key={k} className="hidden sm:inline-flex items-center gap-1.5 text-[10.5px] text-slate-500">
                    <span className="w-2 h-2 rounded-full" style={{ background: sevColors[k] }} />{k}
                  </span>
                ))}
              </div>
            </>
          }>
          <div className="h-[300px] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={alertTimeline} margin={{ left: 0, right: 8, top: 6, bottom: 0 }}>
                <defs>
                  {(["critical","high","medium","low"] as const).map(k => (
                    <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor={sevColors[k]} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={sevColors[k]} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: "rgba(79, 70, 229, 0.06)" }} />
                <Area type="monotone" dataKey="low"      stackId="1" stroke={sevColors.low}      fill="url(#g-low)"      strokeWidth={1.2} isAnimationActive={false} />
                <Area type="monotone" dataKey="medium"   stackId="1" stroke={sevColors.medium}   fill="url(#g-medium)"   strokeWidth={1.2} isAnimationActive={false} />
                <Area type="monotone" dataKey="high"     stackId="1" stroke={sevColors.high}     fill="url(#g-high)"     strokeWidth={1.2} isAnimationActive={false} />
                <Area type="monotone" dataKey="critical" stackId="1" stroke={sevColors.critical} fill="url(#g-critical)" strokeWidth={1.6} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-6 xl:col-span-4" padded={false}
          header={
            <>
              <div>
                <CardTitle>Severity mix</CardTitle>
                <CardSubtitle>{range.label}, all sources</CardSubtitle>
              </div>
            </>
          }>
          <div className="flex items-center gap-3 h-[300px] p-4">
            <div className="w-[180px] h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sevBreakdown} dataKey="value" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="none" isAnimationActive={false}>
                    {sevBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
                <div>
                  <div className="text-2xl font-semibold num text-slate-900">
                    {formatCompact(sevBreakdown.reduce((s, x) => s + x.value, 0))}
                  </div>
                  <div className="text-[10.5px] text-slate-500 uppercase tracking-wider">Total</div>
                </div>
              </div>
            </div>
            <ul className="flex-1 space-y-2">
              {sevBreakdown.map(d => {
                const total = sevBreakdown.reduce((s, x) => s + x.value, 0) || 1;
                const pct = (d.value / total) * 100;
                return (
                  <li key={d.name} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-slate-600">{d.name}</span>
                      </span>
                      <span className="font-mono text-slate-900">{d.value}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, background: d.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-7" padded={false}
          header={
            <>
              <div>
                <CardTitle>Live alert stream</CardTitle>
                <CardSubtitle>Most recent across all rules</CardSubtitle>
              </div>
              <Button size="sm" variant="secondary" onClick={() => { acknowledge(recent.map(a => a.id)); toasts.push({ variant: "success", title: `Acknowledged ${recent.length} alerts` }); }}>
                <ShieldCheck size={12} /> Ack all
              </Button>
            </>
          }>
          <ul className="divide-y divide-slate-100">
            {recent.map(a => {
              const tone = severityBucket(a.rule.level) as "critical" | "high" | "medium" | "low" | "info";
              return (
                <li key={a.id} className="px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-3">
                  <Badge tone={tone} dot>{tone} - {a.rule.level}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[13px] text-slate-900 truncate">
                      <span className="font-mono text-slate-500">{a.id}</span>
                      <span className="text-slate-300">-</span>
                      <span className="truncate">{a.rule.description}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono">{a.agent.name}</span>
                      <span className="text-slate-300">-</span>
                      <span className="font-mono">{a.agent.ip}</span>
                      {a.rule.mitre && (
                        <>
                          <span className="text-slate-300">-</span>
                          <span className="inline-flex items-center h-[18px] px-1.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">{a.rule.mitre.id} - {a.rule.mitre.tactic}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-500 shrink-0">
                    <div>{formatRelativeTime(a.timestamp)}</div>
                    <div className="font-mono text-[10.5px]">{a.location.split("/").slice(-1)[0]}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="col-span-12 md:col-span-6 xl:col-span-5" padded={false}
          header={
            <>
              <div>
                <CardTitle>Noisiest agents</CardTitle>
                <CardSubtitle>Alert volume in last 24h</CardSubtitle>
              </div>
              <Link href="/agents"><Button size="sm" variant="secondary">Manage <ArrowUpRight size={12} /></Button></Link>
            </>
          }>
          <ul className="p-3 space-y-2.5">
            {topAgents.map((a, i) => {
              const max = topAgents[0].alertCount || 1;
              return (
                <li key={a.id} className="flex items-center gap-3">
                  <div className="w-5 text-[10.5px] font-mono text-slate-500">{String(i + 1).padStart(2, "0")}</div>
                  <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 grid place-items-center">
                    <Server size={12} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-900">
                      <span className={cn("w-1.5 h-1.5 rounded-full", a.status === "active" ? "bg-emerald-500" : "bg-slate-300")} />
                      <span className="font-mono truncate">{a.name}</span>
                      <span className="text-slate-500 text-[10.5px]">- {a.os.name} {a.os.version}</span>
                    </div>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${(a.alertCount / max) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-mono text-slate-900">{a.alertCount}</div>
                    <div className="text-[10px] text-slate-500">alerts</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="col-span-12 md:col-span-7 xl:col-span-7" padded={false}
          header={
            <>
              <div>
                <CardTitle>Top MITRE ATT&CK tactics observed</CardTitle>
                <CardSubtitle>Tactics with confirmed activity in the last 24h</CardSubtitle>
              </div>
              <Link href="/mitre"><Button size="sm" variant="secondary">Coverage map <ArrowUpRight size={12} /></Button></Link>
            </>
          }>
          <div className="h-[260px] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mitreCounts} layout="vertical" margin={{ left: 16, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="tactic" width={150} tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgba(79, 70, 229, 0.06)" }} contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="count" fill="#4F46E5" radius={[0, 6, 6, 0]} barSize={12} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-5 xl:col-span-5" padded={false}
          header={
            <>
              <div>
                <CardTitle>Top source countries</CardTitle>
                <CardSubtitle>Distinct attacker IPs by geolocation</CardSubtitle>
              </div>
              <span className="text-[10.5px] text-slate-500 flex items-center gap-1"><Globe2 size={12} />MaxMind GeoIP2</span>
            </>
          }>
          <ul className="p-3 space-y-2">
            {geoTop.map((g, i) => {
              const max = geoTop[0].events;
              return (
                <li key={g.code} className="flex items-center gap-3">
                  <div className="w-5 text-[10.5px] font-mono text-slate-500">{String(i + 1).padStart(2, "0")}</div>
                  <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 grid place-items-center text-[10px] font-mono text-slate-600">{g.code}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-900">{g.country}</div>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${(g.events / max) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono text-slate-900 w-14">{g.events.toLocaleString()}</div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="col-span-12" padded={false}
          header={
            <>
              <div>
                <CardTitle>Cluster and indexer health</CardTitle>
                <CardSubtitle>Real-time status of every component Wazuh depends on</CardSubtitle>
              </div>
              <Button size="sm" variant="secondary" onClick={() => toasts.push({ variant: "info", title: "Running diagnostics", description: "Pinging all 6 components..." })}>Run diagnostics <ArrowUpRight size={12} /></Button>
            </>
          }>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 divide-x divide-slate-200">
            <HealthCell icon={Server}      label="Manager"      value="prod-01"     status="ok"   sub="uptime 41d 06h"  onClick={() => toasts.push({ variant: "info", title: "Manager prod-01", description: "Uptime 41d 06h - load 0.42" })} />
            <HealthCell icon={Activity}    label="Workers"      value="3 / 3"       status="ok"   sub="queue depth 12"  onClick={() => toasts.push({ variant: "info", title: "Workers healthy" })} />
            <HealthCell icon={Cpu}         label="Indexer"      value="opensearch 2.15" status="ok"   sub="1.4 TB - 12 shards" onClick={() => toasts.push({ variant: "info", title: "Indexer OK" })} />
            <HealthCell icon={GitBranch}   label="API"          value="55000"       status="ok"   sub="p95 38ms"        onClick={() => toasts.push({ variant: "info", title: "API latency nominal" })} />
            <HealthCell icon={ShieldCheck} label="Integrations" value="14 / 14"     status="warn" sub="VirusTotal rate-limited" onClick={() => toasts.push({ variant: "warn", title: "VirusTotal rate-limited", description: "Backoff in 3m 12s" })} />
            <HealthCell icon={AlertTriangle} label="Disk"       value="62%"         status="warn" sub="free 412 GB"     onClick={() => toasts.push({ variant: "warn", title: "Disk usage 62%" })} />
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-6" padded={false}
          header={
            <>
              <div>
                <CardTitle>Open critical and high CVEs</CardTitle>
                <CardSubtitle>Sorted by affected agent count</CardSubtitle>
              </div>
              <Link href="/vulnerabilities"><Button size="sm" variant="secondary">All CVEs <ArrowUpRight size={12} /></Button></Link>
            </>
          }>
          <ul className="divide-y divide-slate-100">
            {vulnerabilities.slice(0, 6).map(v => (
              <li key={v.cve} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50">
                <Badge tone={v.severity} dot>{v.severity}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-slate-900 font-mono">{v.cve} <span className="text-slate-500 font-sans">- {v.title}</span></div>
                  <div className="text-[11px] text-slate-500 mt-0.5">pkg <span className="font-mono">{v.package} {v.version}</span> {v.fixedVersion && <> - fix <span className="font-mono">{v.fixedVersion}</span></>}</div>
                </div>
                <div className="text-right text-[11px]">
                  <div className="font-mono text-slate-900">{v.agentCount} agents</div>
                  <div className="text-slate-500">CVSS {v.cvss.toFixed(1)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="col-span-12 xl:col-span-6" padded={false}
          header={
            <>
              <div>
                <CardTitle>Rule activity (24h)</CardTitle>
                <CardSubtitle>Most-firing detection rules</CardSubtitle>
              </div>
              <Link href="/rules"><Button size="sm" variant="secondary">Rule library <ArrowUpRight size={12} /></Button></Link>
            </>
          }>
          <div className="h-[260px] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "SSH brute force", value: 4218 },
                { name: "Sudo failure", value: 2940 },
                { name: "PowerShell encoded", value: 1822 },
                { name: "FIM /etc/passwd", value: 612 },
                { name: "Outbound C2", value: 188 },
                { name: "AWS IAM", value: 96 }
              ]} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-12} dy={6} height={40} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip cursor={{ fill: "rgba(79, 70, 229, 0.06)" }} contentStyle={CHART_TOOLTIP} />
                <Bar dataKey="value" fill="#4F46E5" radius={[4,4,0,0]} barSize={18} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
    </Page>
  );
}

function HealthCell({ icon: Icon, label, value, status, sub, onClick }: { icon: any; label: string; value: string; status: "ok" | "warn" | "down"; sub: string; onClick?: () => void }) {
  const color = status === "ok" ? "text-emerald-600" : status === "warn" ? "text-amber-600" : "text-rose-600";
  const dotColor = status === "ok" ? "bg-emerald-500" : status === "warn" ? "bg-amber-500" : "bg-rose-500";
  return (
    <button type="button" onClick={onClick} className="px-4 py-3 flex flex-col gap-1.5 text-left hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:bg-indigo-50">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold">
        <Icon size={12} />
        {label}
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse-soft", dotColor)} />
        <div className="text-[13px] text-slate-900 font-mono truncate">{value}</div>
      </div>
      <div className={`text-[10.5px] ${color}`}>{sub}</div>
    </button>
  );
}
