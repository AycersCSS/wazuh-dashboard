"use client";
import { useEffect, useReducer, useRef, useMemo } from "react";
import { Search, ArrowRight, Hash, Server, Bug, ShieldAlert, ScrollText } from "lucide-react";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useRouter } from "next/navigation";
import { alerts, agents, vulnerabilities, rules } from "@/data/seed";
import { severityBucket } from "@/types";
import { cn } from "@/lib/cn";

type Hit = {
  id: string;
  type: "alert" | "agent" | "cve" | "rule" | "page";
  label: string;
  hint: string;
  href: string;
  group: "Go to" | "Jump to" | "Investigate";
};

const pages: Hit[] = [
  { id: "p1", type: "page", label: "Overview",         hint: "Real-time SOC summary",         href: "/",                group: "Go to" },
  { id: "p2", type: "page", label: "Alerts",           hint: "All security events",           href: "/alerts",          group: "Go to" },
  { id: "p3", type: "page", label: "Agents",           hint: "Endpoint inventory",            href: "/agents",          group: "Go to" },
  { id: "p4", type: "page", label: "Threat Intel",     hint: "MITRE techniques and actors",   href: "/threat-intel",    group: "Go to" },
  { id: "p5", type: "page", label: "Vulnerabilities",  hint: "Open CVEs across fleet",        href: "/vulnerabilities", group: "Go to" },
  { id: "p6", type: "page", label: "Compliance",       hint: "PCI / HIPAA / GDPR / NIST",     href: "/compliance",      group: "Go to" },
  { id: "p7", type: "page", label: "File Integrity",   hint: "FIM event stream",              href: "/fim",             group: "Go to" },
  { id: "p8", type: "page", label: "MITRE ATT&CK",     hint: "Coverage heatmap",              href: "/mitre",           group: "Go to" },
  { id: "p9", type: "page", label: "Rules",            hint: "Detection rule library",        href: "/rules",           group: "Go to" },
  { id: "p10", type: "page", label: "Settings",        hint: "Cluster and integrations",      href: "/settings",        group: "Go to" }
];

const recent: Hit[] = [
  { id: "r1", type: "alert", label: "EVT-3F7A — SSH brute force",     hint: "agent 0104 · 1m ago",    href: "/alerts",         group: "Jump to" },
  { id: "r2", type: "agent", label: "ubuntu-018",                     hint: "10.4.12.7 · active",     href: "/agents",         group: "Jump to" },
  { id: "r3", type: "cve",   label: "CVE-2024-3094",                  hint: "liblzma5 · 5 critical",   href: "/vulnerabilities",group: "Jump to" }
];

type State = { q: string; idx: number };
type Action = { type: "open" } | { type: "close" } | { type: "setQ"; q: string } | { type: "setIdx"; idx: number };

function paletteReducer(s: State, a: Action): State {
  switch (a.type) {
    case "open":  return { q: "", idx: 0 };
    case "close": return s;
    case "setQ":  return { q: a.q, idx: 0 };
    case "setIdx": return { ...s, idx: a.idx };
  }
}

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const [state, dispatch] = useReducer(paletteReducer, { q: "", idx: 0 });
  const { q, idx } = state;
  const setQ = (q: string) => dispatch({ type: "setQ", q });
  const setIdx = (idx: number) => dispatch({ type: "setIdx", idx });
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    dispatch({ type: "open" });
    const id = window.setTimeout(() => ref.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  const results = useMemo<Hit[]>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [...recent, ...pages];

    const alertHits: Hit[] = alerts
      .filter(a => a.id.toLowerCase().includes(needle) || a.rule.description.toLowerCase().includes(needle) || a.agent.name.includes(needle))
      .slice(0, 6)
      .map(a => ({
        id: a.id, type: "alert", group: "Investigate",
        label: `${a.id} — ${a.rule.description}`,
        hint: `${a.agent.name} · ${severityBucket(a.rule.level)}`,
        href: `/alerts`
      }));

    const agentHits: Hit[] = agents
      .filter(a => a.name.includes(needle) || a.ip.includes(needle) || a.os.name.toLowerCase().includes(needle))
      .slice(0, 6)
      .map(a => ({
        id: a.id, type: "agent", group: "Investigate",
        label: a.name,
        hint: `${a.ip} · ${a.os.name} ${a.os.version}`,
        href: `/agents`
      }));

    const cveHits: Hit[] = vulnerabilities
      .filter(v => v.cve.toLowerCase().includes(needle) || v.package.toLowerCase().includes(needle) || v.title.toLowerCase().includes(needle))
      .slice(0, 6)
      .map(v => ({
        id: v.cve, type: "cve", group: "Investigate",
        label: `${v.cve} — ${v.title}`,
        hint: `${v.package} ${v.version} · ${v.severity}`,
        href: `/vulnerabilities`
      }));

    const ruleHits: Hit[] = rules
      .filter(r => r.id.includes(needle) || r.description.toLowerCase().includes(needle))
      .slice(0, 4)
      .map(r => ({
        id: r.id, type: "rule", group: "Investigate",
        label: `Rule ${r.id} — ${r.description}`,
        hint: `level ${r.level} · ${r.hits24h.toLocaleString()} hits/24h`,
        href: `/rules`
      }));

    const pageHits = pages.filter(p => p.label.toLowerCase().includes(needle));

    return [...alertHits, ...agentHits, ...cveHits, ...ruleHits, ...pageHits];
  }, [q]);

  useEffect(() => { return; }, []);

  if (!open) return null;

  function choose(h: Hit) {
    setOpen(false);
    router.push(h.href);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx(Math.min(idx + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setIdx(Math.max(idx - 1, 0)); }
    if (e.key === "Enter")     { e.preventDefault(); if (results[idx]) choose(results[idx]); }
  }

  const groups: { name: Hit["group"]; items: Hit[] }[] = ["Jump to", "Go to", "Investigate"].map(name => ({
    name: name as Hit["group"],
    items: results.filter(r => r.group === name)
  }));

  let running = -1;

  return (
    <div className="fixed inset-0 z-50 animate-slide-up" role="dialog" aria-modal="true" aria-label="Command palette">
      <button type="button" aria-label="Close command palette" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative mx-auto mt-[10vh] w-[min(640px,92vw)] bg-white border border-slate-200 rounded-xl shadow-pop overflow-hidden">
        <div className="flex items-center gap-2.5 h-12 px-3 border-b border-slate-200">
          <Search size={14} className="text-slate-500" />
          <input
            ref={ref}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search alerts, agents, CVEs, rules, or pages…"
            aria-label="Search alerts, agents, CVEs, rules, or pages"
            className="flex-1 bg-transparent outline-none text-[13px] text-slate-900 placeholder:text-slate-500"
          />
          <span className="kbd">esc</span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-10 text-center text-slate-500 text-[12.5px]">
              No matches for <span className="font-mono text-slate-900">“{q}”</span>
            </div>
          ) : groups.map(g => g.items.length ? (
            <div key={g.name} className="py-1">
              <div className="px-3 py-1 text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold">{g.name}</div>
              {g.items.map(h => {
                running++;
                const active = running === idx;
                const Icon = h.type === "alert" ? ShieldAlert
                  : h.type === "agent" ? Server
                  : h.type === "cve" ? Bug
                  : h.type === "rule" ? ScrollText
                  : Hash;
                return (
                  <button type="button"
                    key={`${g.name}-${h.id}`}
                    onMouseEnter={() => setIdx(running)}
                    onClick={() => choose(h)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 h-9 text-left",
                      active ? "bg-slate-50" : ""
                    )}
                  >
                    <Icon size={13} className={cn("flex-none", active ? "text-indigo-600" : "text-slate-500")} />
                    <span className="flex-1 text-[12.5px] text-slate-900 truncate">{h.label}</span>
                    <span className="hidden md:block text-[11px] text-slate-500 truncate max-w-[40%]">{h.hint}</span>
                    {active && <ArrowRight size={12} className="text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          ) : null)}
        </div>

        <div className="flex items-center justify-between h-9 px-3 border-t border-slate-200 text-[10.5px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
            <span className="flex items-center gap-1"><span className="kbd">↵</span> open</span>
            <span className="flex items-center gap-1"><span className="kbd">esc</span> close</span>
          </div>
          <span>Sentinel Stack · v0.1.0</span>
        </div>
      </div>
    </div>
  );
}
