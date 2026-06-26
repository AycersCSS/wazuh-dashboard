"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useCommandPalette } from "@/hooks/useCommandPalette";

type Item = { href: string; label: string; count?: number; tag?: "new" | "beta" };

const overview: Item[] = [
  { href: "/", label: "Dashboard" }
];

const monitor: Item[] = [
  { href: "/alerts",         label: "Alerts" },
  { href: "/agents",         label: "Agents" },
  { href: "/vulnerabilities",label: "Vulnerabilities" },
  { href: "/fim",            label: "File Integrity" },
  { href: "/logs",           label: "Logs" }
];

const analyze: Item[] = [
  { href: "/compliance",     label: "Compliance" },
  { href: "/threat-intel",   label: "Threat Intel" },
  { href: "/mitre",          label: "MITRE ATT&CK" },
  { href: "/rules",          label: "Rules" }
];

interface SidebarProps {
  tenantName: string;
  tenantTier: string;
  securityScore: number;
  openIncidents: number;
}

export function PortalSidebar({ tenantName, tenantTier, securityScore, openIncidents }: SidebarProps) {
  const pathname = usePathname();
  const cmd = useCommandPalette();
  const [wazuhOpen, setWazuhOpen] = useState(true);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const inMonitor = monitor.some(it => isActive(it.href));
  const inAnalyze = analyze.some(it => isActive(it.href));
  const showDetails = wazuhOpen || inMonitor || inAnalyze;

  return (
    <aside
      className="hidden md:flex flex-col w-[260px] shrink-0 h-screen sticky top-0 bg-navy border-r border-navy-400"
      aria-label="Primary"
    >
      <div className="flex items-center h-14 px-4 border-b border-navy-400">
        <Link href="/" aria-label="MergeIT Client Portal home" className="flex items-center min-w-0">
          <div className="leading-tight min-w-0">
            <div className="font-oswald font-medium tracking-wide text-sage text-sm truncate">MERGEIT</div>
            <div className="text-[9.5px] uppercase tracking-[0.18em] text-navy-600 font-mono">CLIENT PORTAL</div>
          </div>
        </Link>
      </div>

      <button
        type="button"
        onClick={() => cmd.setOpen(true)}
        className="mx-3 mt-3 flex items-center gap-2 h-8 px-2.5 bg-navy-100 border border-navy-400 rounded-md text-xs text-navy-600 hover:border-navy-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        aria-label="Open command palette"
      >
        <span>Search anything...</span>
        <span className="ml-auto flex items-center gap-1">
          <span className="kbd">Cmd</span><span className="kbd">K</span>
        </span>
      </button>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <NavSection title="Overview">
          {overview.map(it => (
            <NavLink key={it.href} href={it.href} label={it.label} active={isActive(it.href)} />
          ))}
        </NavSection>

        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-navy-600 font-semibold">Raw Wazuh</div>
            <span className="text-[10px] text-navy-600 font-mono">power</span>
          </div>
          <details
            open={showDetails}
            onToggle={e => setWazuhOpen((e.target as HTMLDetailsElement).open)}
            className="group"
          >
            <summary className="list-none cursor-pointer flex items-center justify-between gap-2 px-2 h-7 rounded-md text-[11.5px] text-sage hover:text-cream hover:bg-navy-100 transition-colors">
              <span className="flex items-center gap-1.5">
                <span className="text-navy-600 text-[10px] transition-transform group-open:rotate-90">&gt;</span>
                Show all 9 sections
              </span>
              <span className="text-[10px] text-navy-600 font-mono">9</span>
            </summary>

            <div className="mt-1 space-y-0.5">
              <NavSection title="Monitor" small>
                {monitor.map(it => (
                  <NavLink key={it.href} href={it.href} label={it.label} active={isActive(it.href)} size="sm" />
                ))}
              </NavSection>
              <NavSection title="Analyze" small>
                {analyze.map(it => (
                  <NavLink key={it.href} href={it.href} label={it.label} active={isActive(it.href)} size="sm" />
                ))}
              </NavSection>
            </div>
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
            <span className="text-navy-600">Tenant</span>
            <span className="font-mono text-cream truncate ml-2">{tenantName}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-navy-600">Tier</span>
            <span className="font-mono text-cream">{tenantTier}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-navy-600">Score</span>
            <span className={cn("font-mono", securityScore >= 85 ? "text-emerald-400" : securityScore >= 70 ? "text-severity-medium" : "text-severity-high")}>
              {securityScore} / 100
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-navy-600">Open incidents</span>
            <span className="font-mono text-cream">{openIncidents}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavSection({ title, children, small }: { title: string; children: React.ReactNode; small?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between px-2 mb-1.5">
        <div className={cn("text-[10px] uppercase tracking-[0.18em] text-navy-600 font-semibold", small && "text-[9.5px]")}>{title}</div>
        <span className="text-navy-600/60 text-[10px]">v</span>
      </div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function NavLink({ href, label, active, count, tag, size = "md" }: {
  href: string; label: string; active: boolean; count?: number; tag?: "new" | "beta"; size?: "sm" | "md";
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
