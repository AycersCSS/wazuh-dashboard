"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  LayoutDashboard, Cloud, Monitor, Bug, FileCheck2, Users, Boxes,
  ShieldAlert, Server, ScrollText, FileText, Settings, Search, ChevronDown,
  ChevronRight, GitBranch, Activity, ListChecks, BookOpen
} from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useState } from "react";

type Item = { href: string; label: string; icon: any; count?: number; tag?: "new" | "beta" };
type Group = { title: string; items: Item[] };

const operate: Item[] = [
  { href: "/microsoft-365", label: "Microsoft 365", icon: Cloud },
  { href: "/ninjaone",       label: "NinjaOne",       icon: Monitor },
  { href: "/bitdefender",    label: "Bitdefender",    icon: Bug }
];

const report: Item[] = [
  { href: "/cyber-essentials", label: "Cyber Essentials", icon: FileCheck2 },
  { href: "/customer-portal",  label: "Customer Portal",  icon: Users, tag: "beta" }
];

const rawWazuh: Item[] = [
  { href: "/alerts",         label: "Alerts",          icon: ShieldAlert },
  { href: "/agents",         label: "Agents",          icon: Server },
  { href: "/vulnerabilities",label: "Vulnerabilities", icon: ListChecks },
  { href: "/fim",            label: "File Integrity",  icon: FileCheck2 },
  { href: "/compliance",     label: "Compliance",      icon: GitBranch },
  { href: "/mitre",          label: "MITRE ATT&CK",    icon: Boxes },
  { href: "/rules",          label: "Rules",           icon: ScrollText },
  { href: "/logs",           label: "Logs",            icon: FileText },
  { href: "/threat-intel",   label: "Threat Intel",    icon: BookOpen },
  { href: "/settings",       label: "Settings",        icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();
  const [rawOpen, setRawOpen] = useState(false);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const inRaw = rawWazuh.some(it => isActive(it.href));

  return (
    <aside className="hidden md:flex flex-col w-[260px] shrink-0 h-screen sticky top-0 bg-navy border-r border-navy-400" aria-label="Primary">
      <div className="flex items-center h-14 px-4 border-b border-navy-400">
        <BrandMark size="md" />
      </div>

      <button type="button"
        className="mx-3 mt-3 flex items-center gap-2 h-8 px-2.5 bg-navy-100 border border-navy-400 rounded-md text-xs text-navy-600 hover:border-navy-500 transition-colors"
        aria-label="Open command palette">
        <Search size={13} />
        <span>Search anything...</span>
        <span className="ml-auto flex items-center gap-1">
          <span className="kbd">Cmd</span><span className="kbd">K</span>
        </span>
      </button>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <NavSection title="Overview">
          <NavLink href="/" label="Overview" icon={LayoutDashboard} active={isActive("/")} />
        </NavSection>

        <NavSection title="Operate">
          {operate.map(it => (
            <NavLink key={it.href} href={it.href} label={it.label} icon={it.icon} active={isActive(it.href)} />
          ))}
        </NavSection>

        <NavSection title="Report">
          {report.map(it => (
            <NavLink key={it.href} href={it.href} label={it.label} icon={it.icon} active={isActive(it.href)} tag={it.tag} />
          ))}
        </NavSection>

        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-navy-600 font-semibold">Raw Wazuh</div>
            <span className="text-[10px] text-navy-600 font-mono">power</span>
          </div>
          <details
            open={rawOpen || inRaw}
            onToggle={e => setRawOpen((e.target as HTMLDetailsElement).open)}
            className="group"
          >
            <summary className="list-none cursor-pointer flex items-center justify-between gap-2 px-2 h-7 rounded-md text-[11.5px] text-sage hover:text-cream hover:bg-navy-100 transition-colors">
              <span className="flex items-center gap-1.5">
                <ChevronRight size={11} className="text-navy-600 transition-transform group-open:rotate-90" />
                Show all 10 sections
              </span>
              <span className="text-[10px] text-navy-600 font-mono">10</span>
            </summary>
            <ul className="mt-1 space-y-0.5">
              {rawWazuh.map(it => (
                <NavLink key={it.href} href={it.href} label={it.label} icon={it.icon} active={isActive(it.href)} size="sm" />
              ))}
            </ul>
          </details>
        </div>
      </nav>

      <div className="m-3 p-3 bg-navy-100 border border-navy-400 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-navy-600 font-semibold">Tenant health</div>
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" /> Healthy
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-navy-600">Top tenant</span>
            <span className="font-mono text-cream">Acme Corp</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-navy-600">Score</span>
            <span className="font-mono text-emerald-400">87 / 100</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-navy-600">Open incidents</span>
            <span className="font-mono text-cream">3</span>
          </div>
        </div>
        <Link href="/customer-portal" className="mt-2.5 w-full h-7 text-[11px] bg-navy border border-navy-500 rounded-md text-sage hover:text-cream hover:bg-navy-200 transition-colors flex items-center justify-center gap-1.5">
          <Activity size={12} /> Open tenant portal
        </Link>
      </div>
    </aside>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between px-2 mb-1.5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-navy-600 font-semibold">{title}</div>
        <ChevronDown size={11} className="text-navy-600/60" />
      </div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function NavLink({ href, label, icon: Icon, active, count, tag, size = "md" }: {
  href: string; label: string; icon: any; active: boolean; count?: number; tag?: "new" | "beta"; size?: "sm" | "md";
}) {
  const sz = size === "sm" ? "h-7 text-[12.5px]" : "h-8 text-[13px]";
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group relative flex items-center gap-2.5 px-2.5 rounded-md transition-colors",
          sz,
          active
            ? "bg-navy-200 text-cream"
            : "text-sage hover:text-cream hover:bg-navy-100"
        )}
      >
        {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-emerald-400" />}
        <Icon size={size === "sm" ? 13 : 15} className={cn(active ? "text-emerald-400" : "text-navy-600 group-hover:text-sage")} />
        <span className="flex-1 truncate">{label}</span>
        {typeof count === "number" && (
          <span className={cn(
            "text-[10.5px] font-mono px-1.5 h-[18px] grid place-items-center rounded",
            active ? "bg-emerald-400/20 text-emerald-400" : "bg-navy-200 text-navy-600"
          )}>{count}</span>
        )}
        {tag && (
          <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 h-[18px] grid place-items-center rounded bg-emerald-400/20 text-emerald-400">
            {tag}
          </span>
        )}
      </Link>
    </li>
  );
}
