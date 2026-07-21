"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useState } from "react";
import { SITE, USE_CASES } from "@/config/site";

type Item = { href: string; label: string; count?: number; tag?: "new" | "beta" };

const operate: Item[] = [
  { href: USE_CASES["microsoft-365"]!.href, label: USE_CASES["microsoft-365"]!.label },
  { href: USE_CASES["ninjaone"]!.href, label: USE_CASES["ninjaone"]!.label },
  { href: USE_CASES["bitdefender"]!.href, label: USE_CASES["bitdefender"]!.label },
];

const report: Item[] = [
  {
    href: USE_CASES["cyber-essentials"]!.href,
    label: USE_CASES["cyber-essentials"]!.label,
    tag: USE_CASES["cyber-essentials"]!.tag,
  },
  {
    href: USE_CASES["customer-portal"]!.href,
    label: USE_CASES["customer-portal"]!.label,
    tag: USE_CASES["customer-portal"]!.tag,
  },
  { href: "/admin", label: "Admin (all tenants)", tag: "new" },
];

const rawWazuh: Item[] = [
  { href: "/alerts", label: "Alerts" },
  { href: "/agents", label: "Agents" },
  { href: "/vulnerabilities", label: "Vulnerabilities" },
  { href: "/fim", label: "File Integrity" },
  { href: "/compliance", label: "Compliance" },
  { href: "/mitre", label: "MITRE ATT&CK" },
  { href: "/rules", label: "Rules" },
  { href: "/logs", label: "Logs" },
  { href: "/threat-intel", label: "Threat Intel" },
  { href: "/audit", label: "Audit log", tag: "new" },
  { href: "/settings", label: "Settings" },
];

/** design.md: sticky 260px sidebar, active item 2px accent left-border */
export function Sidebar() {
  const pathname = usePathname();
  const [rawOpen, setRawOpen] = useState(false);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const inRaw = rawWazuh.some((it) => isActive(it.href));

  return (
    <aside
      className="hidden md:flex flex-col w-[260px] shrink-0 h-screen sticky top-0 bg-navy border-r border-navy-400"
      aria-label="Primary"
    >
      <div className="flex items-center h-14 px-4 border-b border-navy-400 shrink-0">
        <Link href="/" aria-label="MergeIT SOC home" className="flex items-center min-w-0 gap-2.5">
          <span className="w-7 h-7 rounded-md bg-emerald-400/15 border border-emerald-400/40 grid place-items-center text-[10px] font-mono text-emerald-400 shrink-0">
            MI
          </span>
          <div className="leading-tight min-w-0">
            <div className="font-medium tracking-[-0.02em] text-sage text-[13px] truncate">
              {SITE.shortName}
            </div>
            <div className="text-[9.5px] uppercase tracking-[0.18em] text-navy-600 font-mono">
              {SITE.subtitle}
            </div>
          </div>
        </Link>
      </div>

      <button
        type="button"
        className="mx-3 mt-3 flex items-center gap-2 h-8 px-2.5 bg-navy-100 border border-navy-400 rounded-md text-xs text-navy-600 hover:border-navy-500 hover:text-sage transition-colors shrink-0"
        aria-label="Open command palette"
      >
        <span>Search anything...</span>
        <span className="ml-auto flex items-center gap-1">
          <span className="kbd">Cmd</span>
          <span className="kbd">K</span>
        </span>
      </button>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <NavSection title="Overview">
          <NavLink href="/" label="Overview" active={isActive("/")} />
        </NavSection>

        <NavSection title="Operate">
          {operate.map((it) => (
            <NavLink key={it.href} href={it.href} label={it.label} active={isActive(it.href)} />
          ))}
        </NavSection>

        <NavSection title="Report">
          {report.map((it) => (
            <NavLink
              key={it.href}
              href={it.href}
              label={it.label}
              active={isActive(it.href)}
              tag={it.tag}
            />
          ))}
        </NavSection>

        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-navy-600 font-semibold">
              Raw Wazuh
            </div>
            <span className="text-[10px] text-navy-600 font-mono">power</span>
          </div>
          <details
            open={rawOpen || inRaw}
            onToggle={(e) => setRawOpen((e.target as HTMLDetailsElement).open)}
            className="group"
          >
            <summary className="list-none cursor-pointer flex items-center justify-between gap-2 px-2 h-7 rounded-md text-[11.5px] text-sage hover:text-cream hover:bg-navy-100 transition-colors">
              <span className="flex items-center gap-1.5">
                <span className="text-navy-600 text-[10px] transition-transform group-open:rotate-90">
                  &gt;
                </span>
                Show all 10 sections
              </span>
              <span className="text-[10px] text-navy-600 font-mono">10</span>
            </summary>
            <ul className="mt-1 space-y-0.5">
              {rawWazuh.map((it) => (
                <NavLink
                  key={it.href}
                  href={it.href}
                  label={it.label}
                  active={isActive(it.href)}
                  size="sm"
                />
              ))}
            </ul>
          </details>
        </div>
      </nav>
    </aside>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between px-2 mb-1.5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-navy-600 font-semibold">
          {title}
        </div>
      </div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function NavLink({
  href,
  label,
  active,
  count,
  tag,
  size = "md",
}: {
  href: string;
  label: string;
  icon?: unknown;
  active: boolean;
  count?: number;
  tag?: "new" | "beta";
  size?: "sm" | "md";
}) {
  const sz = size === "sm" ? "h-7 text-[12.5px]" : "h-8 text-[13px]";
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group relative flex items-center gap-2.5 px-2.5 rounded-md transition-colors",
          sz,
          active ? "bg-navy-200 text-cream" : "text-sage hover:text-cream hover:bg-navy-100"
        )}
      >
        {active && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-emerald-400" />
        )}
        <span className="flex-1 truncate">{label}</span>
        {typeof count === "number" && (
          <span
            className={cn(
              "text-[10.5px] font-mono px-1.5 h-[18px] grid place-items-center rounded",
              active ? "bg-emerald-400/20 text-emerald-400" : "bg-navy-200 text-navy-600"
            )}
          >
            {count}
          </span>
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
