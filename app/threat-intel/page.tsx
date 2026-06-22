"use client";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend
} from "recharts";
import { Bug, Globe2, ShieldAlert, Target, TrendingUp, ExternalLink, Sparkles, RefreshCcw } from "lucide-react";
import { Card, StatCard } from "@/components/ui";
import { alerts, geoTop, kpi } from "@/data/seed";
import { useToasts } from "@/hooks/useToasts";
import { useState } from "react";
import { useRouter } from "next/navigation";

const tactics = [
  "Initial Access", "Execution", "Persistence", "Privilege Escalation",
  "Defense Evasion", "Credential Access", "Discovery", "Lateral Movement",
  "Collection", "Exfiltration", "Command and Control", "Impact"
];

const radarData = tactics.map(t => ({
  tactic: t.split(" ")[0],
  observed: Math.round(20 + Math.random() * 70),
  coverage: Math.round(40 + Math.random() * 55)
}));

const trend = Array.from({ length: 14 }, (_, i) => ({
  d: `D${i + 1}`,
  threats: 40 + Math.round(Math.random() * 60),
  blocked: 30 + Math.round(Math.random() * 70)
}));

const actors = [
  { name: "APT29 (Cozy Bear)", origin: "RU", activity: 86, cve: "CVE-2024-3094", tactic: "Initial Access" },
  { name: "Scattered Spider",  origin: "US", activity: 71, cve: "CVE-2024-1709", tactic: "Privilege Escalation" },
  { name: "Volt Typhoon",      origin: "CN", activity: 64, cve: "CVE-2024-21893", tactic: "Lateral Movement" },
  { name: "Lazarus",           origin: "KP", activity: 58, cve: "CVE-2024-21413", tactic: "Execution" },
  { name: "FIN7",              origin: "RU", activity: 41, cve: "CVE-2023-50164", tactic: "Defense Evasion" }
];

export default function ThreatIntelPage() {
  const toasts = useToasts();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  function sync() {
    setSyncing(true);
    toasts.push({ variant: "info", title: "Syncing intel feeds", description: "MISP · OTX · NVD" });
    setTimeout(() => { setSyncing(false); toasts.push({ variant: "success", title: "Intel feeds updated", description: "47 actors · 12 new IOCs" }); }, 1000);
  }
  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted font-mono uppercase tracking-wider">
            <span className="text-signal-400">Analyze</span><span>·</span><span>Threat Intel</span>
          </div>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">Threat intelligence</h1>
          <p className="text-[12.5px] text-muted">Live feed of confirmed threats, observed techniques, and tracked actors.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn" onClick={sync} disabled={syncing}>
            <RefreshCcw size={12} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Sync feeds"}
          </button>
          <button onClick={() => router.push("/mitre")} className="btn btn-primary">Open coverage map<ExternalLink size={11} /></button>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Tracked actors"  value="47"  delta="+3" dir="up" hint="28 active in 30d" accent="info" />
        <StatCard label="TTPs observed"   value={kpi.mitreTechniquesObserved} delta="+5" dir="up" hint="across 9 tactics" />
        <StatCard label="CVE feed"        value="2,341" delta="+128" dir="up" hint="NVD · last sync 14m ago" />
        <StatCard label="Block rate"      value="94.2%" delta="+1.1" dir="up" hint="across 30d window" accent="low" />
      </section>

      <section className="grid grid-cols-12 gap-5">
        <Card className="col-span-12 xl:col-span-7" header={
          <>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-primary truncate">ATT&CK coverage vs. activity</div>
              <div className="text-[11px] text-muted truncate">Inner: detection coverage · Outer: observed activity</div>
            </div>
            <button onClick={() => toasts.push({ variant: "info", title: "AI assist generating narrative", description: "Drafting SOC briefing for the last 24h…" })} className="chip hover:!bg-signal-500/20"><Sparkles size={10} />AI assist</button>
          </>
        }>
          <div className="h-[340px] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="78%">
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="tactic" tick={{ fill: "#9AA6B8", fontSize: 10.5 }} />
                <PolarRadiusAxis tick={{ fill: "#475467", fontSize: 9 }} stroke="rgba(255,255,255,0.06)" />
                <Radar name="Observed" dataKey="observed" stroke="#FF8A3D" fill="#FF8A3D" fillOpacity={0.22} strokeWidth={1.5} />
                <Radar name="Coverage" dataKey="coverage" stroke="#12C6EE" fill="#12C6EE" fillOpacity={0.18} strokeWidth={1.5} />
                <Tooltip contentStyle={{ background: "#10151D", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11.5, color: "#9AA6B8" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-6 xl:col-span-5" header={
          <>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-primary truncate">Top tracked actors</div>
              <div className="text-[11px] text-muted truncate">Activity score (0–100) in the last 30 days</div>
            </div>
            <div />
          </>
        }>
          <ul className="p-3 space-y-2.5">
            {actors.map((a, i) => (
              <li key={a.name} className="panel p-3">
                <button type="button"
                  onClick={() => toasts.push({ variant: "info", title: `Investigating ${a.name}`, description: `Latest IOCs from ${a.origin} attributed to ${a.tactic}` })}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 surface-3 border border-soft rounded-md grid place-items-center text-[10.5px] font-mono">{a.origin}</div>
                      <div>
                        <div className="text-[12.5px] text-primary">{a.name}</div>
                        <div className="text-[10.5px] text-muted">Tied to <span className="font-mono">{a.cve}</span> · {a.tactic}</div>
                      </div>
                    </div>
                    <span className="text-[12px] font-mono text-primary">{a.activity}</span>
                  </div>
                  <div className="mt-2 h-1.5 surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-high" style={{ width: `${a.activity}%` }} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="col-span-12 xl:col-span-7" header={
          <>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-primary truncate">Threats blocked vs. delivered (14d)</div>
              <div className="text-[11px] text-muted truncate">Email + EDR + WAF combined</div>
            </div>
            <span className="chip"><TrendingUp size={10} />+12% week over week</span>
          </>
        }>
          <div className="h-[280px] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: "#9AA6B8", fontSize: 10.5 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9AA6B8", fontSize: 10.5 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ background: "#10151D", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="threats" stroke="#FF3D5A" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="blocked" stroke="#5BD0A0" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-6 xl:col-span-5" header={
          <>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-primary truncate">Top source countries</div>
              <div className="text-[11px] text-muted truncate">Distinct attacker IPs by geolocation</div>
            </div>
            <div />
          </>
        }>
          <ul className="p-3 space-y-2">
            {geoTop.map((g, i) => (
              <li key={g.code} className="flex items-center gap-3">
                <div className="w-5 text-[10.5px] font-mono text-muted">{String(i+1).padStart(2,"0")}</div>
                <div className="w-7 h-7 surface-3 border border-soft rounded-md grid place-items-center text-[10px] font-mono text-secondary">{g.code}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-primary">{g.country}</div>
                  <div className="mt-1 h-1.5 surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-info" style={{ width: `${(g.events / geoTop[0].events) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right text-[12px] font-mono text-primary w-14">{g.events.toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
