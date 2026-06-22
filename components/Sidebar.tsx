"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  LayoutDashboard, ShieldAlert, Server, Bug, FileCheck2, FileText,
  Activity, Settings, Boxes, Search, ScrollText, ChevronDown, GitBranch,
  ShieldCheck, type LucideIcon
} from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon; count?: number; tag?: "new" | "beta" };
type Group = { title: string; items: Item[] };

const groups: Group[] = [
  {
    title: "Operate",
    items: [
      { href: "/",             label: "Overview",        icon: LayoutDashboard },
      { href: "/alerts",       label: "Alerts",          icon: ShieldAlert, count: 220 },
      { href: "/agents",       label: "Agents",          icon: Server, count: 64 },
      { href: "/threat-intel", label: "Threat Intel",    icon: Bug, tag: "new" }
    ]
  },
  {
    title: "Analyze",
    items: [
      { href: "/vulnerabilities", label: "Vulnerabilities", icon: ShieldCheck },
      { href: "/fim",             label: "File Integrity",  icon: FileCheck2 },
      { href: "/compliance",      label: "Compliance",      icon: GitBranch },
      { href: "/mitre",           label: "MITRE ATT&CK",    icon: Boxes }
    ]
  },
  {
    title: "Configure",
    items: [
      { href: "/rules",    label: "Rules",    icon: ScrollText, count: 1284 },
      { href: "/logs",     label: "Logs",     icon: FileText },
      { href: "/settings", label: "Settings", icon: Settings }
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-[244px] shrink-0 h-screen sticky top-0 bg-white border-r border-slate-200" aria-label="Primary">
      <div className="flex items-center gap-2.5 h-14 px-4 border-b border-slate-200">
        <div className="relative w-8 h-8 grid place-items-center rounded-lg bg-indigo-50 border border-indigo-200">
          <ShieldAlert size={16} className="text-indigo-600" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-900">Sentinel Stack</div>
          <div className="text-[10.5px] text-slate-500 font-mono uppercase tracking-wider">wazuh 4.9.0</div>
        </div>
      </div>

      <button type="button"
        className="mx-3 mt-3 flex items-center gap-2 h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-500 hover:border-slate-300 transition-colors"
        aria-label="Open command palette">
        <Search size={13} />
        <span>Search anything...</span>
        <span className="ml-auto flex items-center gap-1">
          <span className="kbd">Cmd</span><span className="kbd">K</span>
        </span>
      </button>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map(group => (
          <div key={group.title}>
            <div className="flex items-center justify-between px-2 mb-1.5">
              <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold">{group.title}</div>
              <ChevronDown size={11} className="text-slate-300" />
            </div>
            <ul className="space-y-0.5">
              {group.items.map(it => {
                const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={cn(
                        "group relative flex items-center gap-2.5 h-8 px-2.5 rounded-md text-[13px] transition-colors",
                        active
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-indigo-600" />}
                      <Icon size={15} className={cn(active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")} />
                      <span className="flex-1 truncate">{it.label}</span>
                      {typeof it.count === "number" && (
                        <span className={cn(
                          "text-[10.5px] font-mono px-1.5 h-[18px] grid place-items-center rounded",
                          active ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                        )}>{it.count}</span>
                      )}
                      {it.tag && (
                        <span className="text-[9.5px] font-semibold uppercase tracking-wider px-1.5 h-[18px] grid place-items-center rounded bg-indigo-100 text-indigo-700">
                          {it.tag}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="m-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold">Cluster</div>
          <span className="flex items-center gap-1.5 text-[10.5px] text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" /> Healthy
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-slate-500">Manager</span>
            <span className="font-mono text-slate-900">prod-01</span>
          </div>
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-slate-500">Workers</span>
            <span className="font-mono text-slate-900">3 / 3</span>
          </div>
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-slate-500">Queue</span>
            <span className="font-mono text-slate-900">412 evt/s</span>
          </div>
        </div>
        <Link href="/settings" className="mt-2.5 w-full h-7 text-[11.5px] bg-white border border-slate-200 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5">
          <Activity size={12} /> View cluster health
        </Link>
      </div>
    </aside>
  );
}
