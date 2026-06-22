"use client";
import { useState, useRef, useEffect } from "react";
import {
  Bell, Search, ChevronDown, HelpCircle, LogOut, User2,
  Server, Check, AlertTriangle, Keyboard, Sparkles, ExternalLink
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { cn } from "@/lib/cn";
import { formatCompact } from "@/lib/format";
import { useTimeRange, type TimeRangeKey } from "@/hooks/useTimeRange";
import { useToasts } from "@/hooks/useToasts";
import { useGoToShortcuts } from "@/hooks/useGoToShortcuts";

type EnvKey = "production" | "staging" | "dev";
const envs: { key: EnvKey; label: string; regions: string[] }[] = [
  { key: "production", label: "Production", regions: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"] },
  { key: "staging",    label: "Staging",    regions: ["us-east-1"] },
  { key: "dev",        label: "Dev",        regions: ["local"] }
];

const ranges: { key: TimeRangeKey; label: string }[] = [
  { key: "1h",  label: "Last 1 hour" },
  { key: "24h", label: "Last 24 hours" },
  { key: "7d",  label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" }
];

export function Topbar() {
  const { theme, toggle } = useTheme();
  const cmd = useCommandPalette();
  const toasts = useToasts();
  const { range, setKey } = useTimeRange();
  useGoToShortcuts();

  const [env, setEnv] = useState<EnvKey>("production");
  const [region, setRegion] = useState<string>(envs[0].regions[0]);
  const [envOpen, setEnvOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const envRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (envRef.current   && !envRef.current.contains(e.target as Node))   setEnvOpen(false);
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) setRangeOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserOpen(false);
      if (helpRef.current  && !helpRef.current.contains(e.target as Node))  setHelpOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function selectEnv(k: EnvKey, r: string) {
    setEnv(k); setRegion(r); setEnvOpen(false);
    toasts.push({ variant: "success", title: "Environment switched", description: `Now viewing ${k} - ${r}` });
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="h-14 flex items-center gap-3 px-4">
        <div ref={envRef} className="relative">
          <button type="button"
            onClick={() => { setEnvOpen(o => !o); setRangeOpen(false); setNotifOpen(false); setUserOpen(false); setHelpOpen(false); }}
            className="flex items-center gap-2 h-7 px-2.5 bg-slate-50 border border-slate-200 rounded-md hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-haspopup="menu" aria-expanded={envOpen}>
            <span className={cn("w-1.5 h-1.5 rounded-full",
              env === "production" ? "bg-emerald-500 animate-pulse-soft" : env === "staging" ? "bg-amber-500" : "bg-sky-500"
            )} />
            <span className="text-[11.5px] font-medium uppercase tracking-wider text-slate-700">{env}</span>
            <span className="text-slate-400 text-[10.5px] font-mono">{region}</span>
            <ChevronDown size={12} className={cn("text-slate-400 transition-transform", envOpen && "rotate-180")} />
          </button>
          {envOpen && (
            <div className="absolute left-0 top-9 w-[260px] bg-white border border-slate-200 rounded-lg shadow-pop z-40 animate-slide-in-right">
              {envs.map(e => (
                <div key={e.key} className="border-b border-slate-100 last:border-0">
                  <div className="px-3 py-1.5 text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold">{e.label}</div>
                  {e.regions.map(r => (
                    <button type="button" key={r} onClick={() => selectEnv(e.key, r)}
                      className={cn("w-full flex items-center justify-between px-3 h-8 text-xs hover:bg-slate-50",
                        env === e.key && region === r ? "text-indigo-700 bg-indigo-50" : "text-slate-600")}>
                      <span className="flex items-center gap-2">
                        <Server size={12} className="text-slate-400" />
                        <span className="font-mono">{r}</span>
                      </span>
                      {env === e.key && region === r && <Check size={12} className="text-indigo-600" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={() => cmd.setOpen(true)}
          className="hidden lg:flex flex-1 max-w-[520px] items-center gap-2 h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-[13px] text-slate-500 hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          aria-label="Open search">
          <Search size={13} />
          <span className="flex-1 text-left">Search alerts, agents, CVEs...</span>
          <span className="flex items-center gap-1">
            <span className="kbd">Cmd</span><span className="kbd">K</span>
          </span>
        </button>

        <div ref={rangeRef} className="relative">
          <button type="button"
            onClick={() => { setRangeOpen(o => !o); setEnvOpen(false); setNotifOpen(false); setUserOpen(false); setHelpOpen(false); }}
            className="hidden md:flex items-center gap-1.5 h-7 px-2.5 bg-slate-50 border border-slate-200 rounded-md hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-haspopup="menu" aria-expanded={rangeOpen}>
            <span className="text-[11.5px] text-slate-700">{range.label}</span>
            <ChevronDown size={12} className={cn("text-slate-400 transition-transform", rangeOpen && "rotate-180")} />
          </button>
          {rangeOpen && (
            <div className="absolute right-0 top-9 w-[200px] bg-white border border-slate-200 rounded-lg shadow-pop z-40 animate-slide-in-right">
              {ranges.map(r => (
                <button type="button" key={r.key}
                  onClick={() => { setKey(r.key); setRangeOpen(false); toasts.push({ variant: "info", title: "Time range updated", description: r.label, duration: 2000 }); }}
                  className={cn("w-full flex items-center justify-between px-3 h-8 text-xs hover:bg-slate-50",
                    range.key === r.key ? "text-indigo-700 bg-indigo-50" : "text-slate-600")}>
                  <span>{r.label}</span>
                  {range.key === r.key && <Check size={12} className="text-indigo-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 md:hidden" />

        <div className="hidden md:flex items-center gap-3 text-[11.5px]">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Server size={12} />
            <span><span className="text-slate-900 font-mono">{formatCompact(64)}</span> agents</span>
          </div>
          <span className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
            <span><span className="text-slate-900 font-mono">1,284</span> evt/s</span>
          </div>
        </div>

        <button type="button" onClick={() => { toggle(); toasts.push({ variant: "info", title: "Switched to dark theme", duration: 1500 }); }}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          aria-label="Toggle theme" title="Toggle theme">
          <span className="text-xs">Theme</span>
        </button>

        <div ref={helpRef} className="relative">
          <button type="button"
            onClick={() => { setHelpOpen(o => !o); setEnvOpen(false); setNotifOpen(false); setUserOpen(false); }}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="Help" aria-haspopup="menu" aria-expanded={helpOpen}>
            <HelpCircle size={14} />
          </button>
          {helpOpen && (
            <div className="absolute right-0 top-10 w-[320px] bg-white border border-slate-200 rounded-lg shadow-pop z-40 animate-slide-in-right">
              <div className="px-3 h-10 flex items-center border-b border-slate-200 text-xs font-semibold text-slate-900">
                <Sparkles size={12} className="text-indigo-600 mr-2" /> Keyboard shortcuts
              </div>
              <ul className="py-1.5 text-xs">
                {[
                  { k: ["Cmd", "K"], label: "Open command palette" },
                  { k: ["G", "O"],    label: "Go to Overview" },
                  { k: ["G", "A"],    label: "Go to Alerts" },
                  { k: ["G", "R"],    label: "Go to Agents" },
                  { k: ["A"],         label: "Acknowledge selected alerts" },
                  { k: ["?"],         label: "Toggle this help" },
                  { k: ["Esc"],       label: "Close any overlay" }
                ].map((s, i) => (
                  <li key={i} className="px-3 h-8 flex items-center justify-between hover:bg-slate-50">
                    <span className="text-slate-600">{s.label}</span>
                    <span className="flex items-center gap-1">{s.k.map((key, j) => <span key={j} className="kbd">{key}</span>)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-200 p-2 flex justify-between">
                <button type="button" onClick={() => { setHelpOpen(false); cmd.setOpen(true); }} className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-md hover:bg-slate-50">
                  <Search size={11} />Open palette
                </button>
                <button type="button" onClick={() => toasts.push({ variant: "info", title: "Opening documentation" })} className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-md hover:bg-slate-50">
                  <ExternalLink size={11} />Docs
                </button>
              </div>
            </div>
          )}
        </div>

        <div ref={notifRef} className="relative">
          <button type="button"
            onClick={() => { setNotifOpen(o => !o); setEnvOpen(false); setRangeOpen(false); setUserOpen(false); setHelpOpen(false); }}
            className="relative inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="Notifications" aria-haspopup="menu" aria-expanded={notifOpen}>
            <Bell size={14} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-10 w-[340px] bg-white border border-slate-200 rounded-lg shadow-pop z-40 animate-slide-in-right">
              <div className="flex items-center justify-between px-3 h-10 border-b border-slate-200">
                <div className="text-xs font-semibold text-slate-900">Notifications</div>
                <button type="button"
                  onClick={() => toasts.push({ variant: "info", title: "Notifications cleared", duration: 1800 })}
                  className="text-[11px] text-slate-500 hover:text-slate-900">Mark all read</button>
              </div>
              <ul className="max-h-[320px] overflow-y-auto">
                {[
                  { sev: "critical", title: "Critical rule 5715 fired on db-master-012", time: "2m" },
                  { sev: "high",     title: "3 SSH brute-force attempts on edge-fw-002",   time: "14m" },
                  { sev: "medium",   title: "New CVE-2024-3094 detected on 4 agents",      time: "1h"  },
                  { sev: "info",     title: "Manager prod-01 restarted successfully",     time: "3h"  }
                ].map((n, i) => (
                  <li key={i} className="px-3 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                      onClick={() => { setNotifOpen(false); toasts.push({ variant: n.sev as any, title: "Opened: " + n.title, duration: 2000 }); }}>
                    <div className="flex items-start gap-2.5">
                      <span className={cn(
                        "mt-1.5 w-1.5 h-1.5 rounded-full flex-none",
                        n.sev === "critical" ? "bg-rose-500" :
                        n.sev === "high"     ? "bg-orange-500" :
                        n.sev === "medium"   ? "bg-amber-500" : "bg-sky-500"
                      )} />
                      <div className="flex-1">
                        <div className="text-xs text-slate-900 leading-snug">{n.title}</div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">{n.time} ago</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-3 h-9 flex items-center justify-between border-t border-slate-200">
                <span className="text-[10.5px] text-slate-500">Showing 4 of 17</span>
                <button onClick={() => setNotifOpen(false)} className="text-[11.5px] text-indigo-600 hover:text-indigo-700">View all</button>
              </div>
            </div>
          )}
        </div>

        <div ref={userRef} className="relative">
          <button type="button"
            onClick={() => { setUserOpen(o => !o); setEnvOpen(false); setRangeOpen(false); setNotifOpen(false); setHelpOpen(false); }}
            className="flex items-center gap-2 h-8 pl-1 pr-2 bg-slate-50 border border-slate-200 rounded-md hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            aria-label="User menu" aria-haspopup="menu" aria-expanded={userOpen}>
            <span className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-700 grid place-items-center text-[10.5px] font-semibold text-white">RA</span>
            <span className="hidden md:flex flex-col text-left leading-tight">
              <span className="text-xs font-medium text-slate-900">R. Aydin</span>
              <span className="text-[10px] text-slate-500">SOC Analyst - L2</span>
            </span>
            <ChevronDown size={12} className={cn("text-slate-400 transition-transform", userOpen && "rotate-180")} />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-10 w-[260px] bg-white border border-slate-200 rounded-lg shadow-pop z-40 animate-slide-in-right">
              <div className="px-3 py-3 border-b border-slate-200">
                <div className="text-[13px] font-semibold text-slate-900">R. Aydin</div>
                <div className="text-[11px] text-slate-500">r.aydin@sentinelstack.io</div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />On shift
                  </span>
                  <span className="inline-flex items-center h-5 px-2 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">L2 Analyst</span>
                </div>
              </div>
              <ul className="py-1.5">
                {[
                  { icon: User2,    label: "Profile",     action: () => toasts.push({ title: "Profile (coming soon)" }) },
                  { icon: Server,   label: "My shifts",   action: () => toasts.push({ title: "Shifts view (coming soon)" }) },
                  { icon: Check,    label: "On-call",     action: () => toasts.push({ title: "On-call roster (coming soon)" }) },
                  { icon: Keyboard, label: "Shortcuts",   action: () => { setUserOpen(false); setHelpOpen(true); } }
                ].map(({ icon: Icon, label, action }) => (
                  <li key={label}>
                    <button type="button" onClick={action} className="w-full flex items-center gap-2.5 px-3 h-8 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                      <Icon size={13} className="text-slate-400" />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-200 py-1.5">
                <button
                  onClick={() => toasts.push({ variant: "warn", title: "Signed out", description: "Redirecting to login..." })}
                  className="w-full flex items-center gap-2.5 px-3 h-8 text-xs text-rose-600 hover:bg-rose-50 transition-colors">
                  <LogOut size={13} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:flex h-7 items-center gap-3 px-4 border-t border-slate-200 text-[11px] text-slate-500">
        <button type="button"
          onClick={() => toasts.push({ variant: "warn", title: "3 rules awaiting review", description: "Opening review queue..." })}
          className="flex items-center gap-1.5 hover:text-slate-900">
          <AlertTriangle size={11} className="text-amber-500" />
          <span><span className="text-slate-900">3 rules</span> awaiting review</span>
        </button>
        <span className="w-px h-3 bg-slate-200" />
        <span>Latest indexer snapshot: <span className="font-mono text-slate-900">02:14:38 UTC</span></span>
        <span className="w-px h-3 bg-slate-200" />
        <span>SOC tip: <span className="text-slate-900">acknowledge within 15m to keep MTTR under target</span></span>
      </div>
    </header>
  );
}
