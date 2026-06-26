"use client";
import { useReducer, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { formatCompact } from "@/lib/format";
import { useTimeRange, type TimeRangeKey } from "@/hooks/useTimeRange";
import { useToasts } from "@/hooks/useToasts";
import { useGoToShortcuts } from "@/hooks/useGoToShortcuts";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useTheme } from "@/hooks/useTheme";
import { useSession } from "@/lib/auth/useSession";

type TenantKey = "all" | "acme" | "globex" | "initech" | "stark";
const tenants: { key: TenantKey; label: string; sub: string }[] = [
  { key: "all",     label: "All tenants",        sub: "Fleet-wide view" },
  { key: "acme",    label: "Acme Corp",          sub: "Platinum · 64 agents" },
  { key: "globex",  label: "Globex",             sub: "Gold · 28 agents" },
  { key: "initech", label: "Initech",            sub: "Silver · 19 agents" },
  { key: "stark",   label: "Stark Industries",   sub: "Platinum · 41 agents" }
];

const ranges: { key: TimeRangeKey; label: string }[] = [
  { key: "1h",  label: "Last 1 hour" },
  { key: "24h", label: "Last 24 hours" },
  { key: "7d",  label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" }
];

type MenuKey = "tenant" | "range" | "notif" | "user" | "help";
type TopbarState = { tenant: TenantKey; menu: MenuKey | null };
type TopbarAction =
  | { type: "toggle"; menu: MenuKey }
  | { type: "closeMenu" }
  | { type: "setTenant"; tenant: TenantKey };

function topbarReducer(s: TopbarState, a: TopbarAction): TopbarState {
  switch (a.type) {
    case "toggle":   return { ...s, menu: s.menu === a.menu ? null : a.menu };
    case "closeMenu": return { ...s, menu: null };
    case "setTenant": return { tenant: a.tenant, menu: null };
  }
}

export function Topbar() {
  const cmd = useCommandPalette();
  const toasts = useToasts();
  const router = useRouter();
  const { signOut, user } = useSession();
  const { range, setKey } = useTimeRange();
  const { theme, toggleTheme } = useTheme();
  useGoToShortcuts();

  // Identity comes from the signed-in session. While useSession is still
  // resolving the health check, fall back to "ADMIN" so the chrome is never
  // blank. The local-test login route sets user.username = "ADMIN" on success
  // (lib/auth/useSession.ts:41), so this matches the dev backdoor.
  const displayName = user?.username ?? "ADMIN";
  const displayEmail = user?.username ? `${user.username.toLowerCase()}@mergeit.local` : "admin@mergeit.local";
  const initials = displayName.slice(0, 2).toUpperCase();

  async function onSignOut() {
    // Clear the httpOnly connector_jwt cookie on the server, then bounce to /login.
    // signOut() awaits the POST to /api/connector/auth/logout, which calls
    // clearJwt() server-side. Without this, the cookie persists after the user
    // clicks "Sign out" (security review finding #1).
    try {
      await signOut();
    } finally {
      router.push("/login");
    }
  }

  // The five header dropdowns are mutually exclusive — one open at a time — so
  // group them (plus the tenant selection) in a single useReducer instead of
  // six independent useState calls that each trigger their own render.
  const [{ tenant, menu }, dispatch] = useReducer(topbarReducer, { tenant: "all", menu: null });
  const toggle = (m: MenuKey) => dispatch({ type: "toggle", menu: m });

  const refs = {
    tenant: useRef<HTMLDivElement>(null),
    range: useRef<HTMLDivElement>(null),
    notif: useRef<HTMLDivElement>(null),
    user: useRef<HTMLDivElement>(null),
    help: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if ((Object.values(refs) as React.RefObject<HTMLDivElement>[]).every(r => r.current && !r.current.contains(target))) {
        dispatch({ type: "closeMenu" });
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
    // refs are stable refs; intentionally excluded from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTenant(k: TenantKey) {
    dispatch({ type: "setTenant", tenant: k });
    const t = tenants.find(x => x.key === k);
    toasts.push({ variant: "success", title: "Tenant switched", description: `Now viewing ${t?.label}` });
  }

  const tenantLabel = tenants.find(t => t.key === tenant)?.label ?? "All tenants";

  return (
    <header className="sticky top-0 z-30 bg-navy/95 backdrop-blur border-b border-navy-400">
      <div className="h-14 flex items-center gap-3 px-4">
        <div ref={refs.tenant} className="relative">
          <button type="button"
            onClick={() => toggle("tenant")}
            className="flex items-center gap-2 h-8 px-2.5 bg-navy-100 border border-navy-400 rounded-md hover:border-navy-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-haspopup="menu" aria-expanded={menu === "tenant"}>
            <span className="text-[12px] font-medium text-cream">{tenantLabel}</span>
            <span className={cn("text-navy-600 transition-transform text-[10px]", menu === "tenant" && "rotate-180")}>v</span>
          </button>
          {menu === "tenant" && (
            <div className="absolute left-0 top-10 w-[280px] bg-navy-100 border border-navy-500 rounded-lg shadow-pop z-40 animate-slide-in-right">
              <div className="px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-navy-600 font-semibold border-b border-navy-400">Select tenant</div>
              {tenants.map(t => (
                <button type="button" key={t.key} onClick={() => selectTenant(t.key)}
                  className={cn("w-full flex items-center justify-between px-3 h-9 text-xs hover:bg-navy-200",
                    tenant === t.key ? "text-emerald-400 bg-navy-200" : "text-sage")}>
                  <span className="flex flex-col items-start">
                    <span className="font-medium text-cream">{t.label}</span>
                    <span className="text-[10.5px] text-navy-600">{t.sub}</span>
                  </span>
                  {tenant === t.key && <span className="text-emerald-400">*</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={refs.range} className="relative">
          <button type="button"
            onClick={() => toggle("range")}
            className="hidden md:flex items-center gap-1.5 h-8 px-2.5 bg-navy-100 border border-navy-400 rounded-md hover:border-navy-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-haspopup="menu" aria-expanded={menu === "range"}>
            <span className="text-[12px] text-cream">{range.label}</span>
            <span className={cn("text-navy-600 transition-transform text-[10px]", menu === "range" && "rotate-180")}>v</span>
          </button>
          {menu === "range" && (
            <div className="absolute right-0 top-10 w-[200px] bg-navy-100 border border-navy-500 rounded-lg shadow-pop z-40 animate-slide-in-right">
              {ranges.map(r => (
                <button type="button" key={r.key}
                  onClick={() => { setKey(r.key); dispatch({ type: "closeMenu" }); toasts.push({ variant: "info", title: "Time range updated", description: r.label, duration: 2000 }); }}
                  className={cn("w-full flex items-center justify-between px-3 h-8 text-xs hover:bg-navy-200",
                    range.key === r.key ? "text-emerald-400 bg-navy-200" : "text-sage")}>
                  <span>{r.label}</span>
                  {range.key === r.key && <span className="text-emerald-400">*</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-navy-600">
            <span><span className="text-cream font-mono">{formatCompact(64)}</span> agents</span>
          </div>
          <span className="w-px h-4 bg-navy-400" />
          <div className="flex items-center gap-1.5 text-navy-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
            <span><span className="text-cream font-mono">1,284</span> evt/s</span>
          </div>
        </div>

        <button type="button"
          onClick={toggleTheme}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-navy-600 hover:text-cream hover:bg-navy-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          data-testid="theme-toggle">
          {theme === "dark" ? (
            // Moon — currently dark, click to go light
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            // Sun — currently light, click to go dark
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          )}
        </button>

        <div ref={refs.help} className="relative">
          <button type="button"
            onClick={() => toggle("help")}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-navy-600 hover:text-cream hover:bg-navy-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Help" aria-haspopup="menu" aria-expanded={menu === "help"}>
            <span className="text-[12px]">?</span>
          </button>
          {menu === "help" && (
            <div className="absolute right-0 top-10 w-[320px] bg-navy-100 border border-navy-500 rounded-lg shadow-pop z-40 animate-slide-in-right">
              <div className="px-3 h-10 flex items-center border-b border-navy-400 text-xs font-semibold text-cream">
                Keyboard shortcuts
              </div>
              <ul className="py-1.5 text-xs">
                {[
                  { k: ["Cmd", "K"], label: "Open command palette" },
                  { k: ["G", "M"],    label: "Go to Microsoft 365" },
                  { k: ["G", "N"],    label: "Go to NinjaOne" },
                  { k: ["G", "B"],    label: "Go to Bitdefender" },
                  { k: ["G", "C"],    label: "Go to Cyber Essentials" },
                  { k: ["G", "P"],    label: "Go to Customer Portal" },
                  { k: ["G", "A"],    label: "Go to Alerts (raw)" },
                  { k: ["?"],         label: "Toggle this help" },
                  { k: ["Esc"],       label: "Close any overlay" }
                ].map(s => (
                  <li key={s.label} className="px-3 h-8 flex items-center justify-between hover:bg-navy-200">
                    <span className="text-sage">{s.label}</span>
                    <span className="flex items-center gap-1">{s.k.map((key) => <span key={key} className="kbd">{key}</span>)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-navy-400 p-2 flex justify-between">
                <button type="button" onClick={() => { dispatch({ type: "closeMenu" }); cmd.setOpen(true); }} className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium bg-navy border border-navy-500 rounded-md hover:bg-navy-200 text-cream">
                  Open palette
                </button>
                <button type="button" onClick={() => toasts.push({ variant: "info", title: "Opening documentation" })} className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium bg-navy border border-navy-500 rounded-md hover:bg-navy-200 text-cream">
                  Docs
                </button>
              </div>
            </div>
          )}
        </div>

        <div ref={refs.notif} className="relative">
          <button type="button"
            onClick={() => toggle("notif")}
            className="relative inline-flex items-center justify-center w-8 h-8 rounded-md text-navy-600 hover:text-cream hover:bg-navy-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Notifications" aria-haspopup="menu" aria-expanded={menu === "notif"}>
            <span className="text-[12px]">bell</span>
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-severity-critical" />
          </button>
          {menu === "notif" && (
            <div className="absolute right-0 top-10 w-[360px] bg-navy-100 border border-navy-500 rounded-lg shadow-pop z-40 animate-slide-in-right">
              <div className="flex items-center justify-between px-3 h-10 border-b border-navy-400">
                <div className="text-xs font-semibold text-cream">Notifications</div>
                <button type="button"
                  onClick={() => toasts.push({ variant: "info", title: "Notifications cleared", duration: 1800 })}
                  className="text-[11px] text-navy-600 hover:text-cream">Mark all read</button>
              </div>
              <ul className="max-h-[320px] overflow-y-auto">
                {[
                  { sev: "critical", title: "Critical alert on Acme Corp - sign-in from unknown country", time: "2m",  tenant: "Acme Corp" },
                  { sev: "high",     title: "3 endpoints out of date on Bitdefender engines",            time: "14m", tenant: "Globex" },
                  { sev: "medium",   title: "Cyber Essentials evidence pack due in 6 days",                time: "1h",  tenant: "Initech" },
                  { sev: "info",     title: "NinjaOne sync completed for 28 devices",                     time: "3h",  tenant: "Stark Industries" }
                ].map((n) => (
                  <li key={n.title + n.time}>
                    <button type="button"
                      onClick={() => { dispatch({ type: "closeMenu" }); toasts.push({ variant: n.sev as any, title: "Opened: " + n.title, duration: 2000 }); }}
                      className="w-full text-left px-3 py-2.5 border-b border-navy-400/60 last:border-0 hover:bg-navy-200 cursor-pointer">
                      <span className={cn(
                        "mt-1.5 w-1.5 h-1.5 rounded-full flex-none inline-block align-middle mr-2.5",
                        n.sev === "critical" ? "bg-severity-critical" :
                        n.sev === "high"     ? "bg-severity-high" :
                        n.sev === "medium"   ? "bg-severity-medium" : "bg-severity-info"
                      )} />
                      <span className="text-xs text-cream leading-snug">{n.title}</span>
                      <span className="block text-[10.5px] text-navy-600 mt-0.5">{n.tenant} - {n.time} ago</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="px-3 h-9 flex items-center justify-between border-t border-navy-400">
                <span className="text-[10.5px] text-navy-600">Showing 4 of 17</span>
                <button type="button" onClick={() => dispatch({ type: "closeMenu" })} className="text-[11.5px] text-emerald-400 hover:brightness-110">View all</button>
              </div>
            </div>
          )}
        </div>

        <div ref={refs.user} className="relative">
          <button type="button"
            onClick={() => toggle("user")}
            className="flex items-center gap-2 h-8 pl-1 pr-2 bg-navy-100 border border-navy-400 rounded-md hover:border-navy-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="User menu" aria-haspopup="menu" aria-expanded={menu === "user"}>
            <span className="w-6 h-6 rounded-md bg-emerald-400/20 border border-emerald-400/40 grid place-items-center text-[10px] font-semibold text-emerald-400">{initials}</span>
            <span className="hidden md:flex flex-col text-left leading-tight">
              <span className="text-xs font-medium text-cream">{displayName}</span>
              <span className="text-[10px] text-navy-600">MergeIT SOC Analyst - L2</span>
            </span>
            <span className={cn("text-navy-600 transition-transform text-[10px]", menu === "user" && "rotate-180")}>v</span>
          </button>
          {menu === "user" && (
            <div className="absolute right-0 top-10 w-[260px] bg-navy-100 border border-navy-500 rounded-lg shadow-pop z-40 animate-slide-in-right">
              <div className="px-3 py-3 border-b border-navy-400">
                <div className="text-[13px] font-semibold text-cream">{displayName}</div>
                <div className="text-[11px] text-navy-600">{displayEmail}</div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md bg-emerald-400/15 border border-emerald-400/40 text-emerald-400 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />On shift
                  </span>
                  <span className="inline-flex items-center h-5 px-2 rounded-md bg-navy-200 border border-navy-500 text-sage text-[11px]">L2 Analyst</span>
                </div>
              </div>
              <ul className="py-1.5">
                {[
                  { label: "Profile",     action: () => toasts.push({ title: "Profile (coming soon)" }) },
                  { label: "My shifts",   action: () => toasts.push({ title: "Shifts view (coming soon)" }) },
                  { label: "On-call",     action: () => toasts.push({ title: "On-call roster (coming soon)" }) },
                  { label: "Shortcuts",   action: () => toasts.push({ variant: "info", title: "Press ⌘K for command palette" }) }
                ].map(({ label, action }) => (
                  <li key={label}>
                    <button type="button" onClick={action} className="w-full flex items-center gap-2.5 px-3 h-8 text-xs text-sage hover:text-cream hover:bg-navy-200 transition-colors">
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-navy-400 py-1.5">
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full flex items-center gap-2.5 px-3 h-8 text-xs text-severity-critical hover:bg-severity-critical/15 transition-colors">
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>

        <button type="button" onClick={() => cmd.setOpen(true)}
          className="hidden lg:flex w-[360px] xl:w-[440px] items-center gap-2 h-8 px-2.5 bg-navy-100 border border-navy-400 rounded-md text-[13px] text-navy-600 hover:border-navy-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label="Open search">
          <span className="flex-1 text-left">Search alerts, agents, CVEs, tenants...</span>
          <span className="flex items-center gap-1">
            <span className="kbd">Cmd</span><span className="kbd">K</span>
          </span>
        </button>
      </div>

      <div className="hidden lg:flex h-7 items-center gap-3 px-4 border-t border-navy-400 text-[11px] text-navy-600">
        <button type="button"
          onClick={() => toasts.push({ variant: "warn", title: "3 Cyber Essentials reviews pending", description: "Opening review queue..." })}
          className="flex items-center gap-1.5 hover:text-cream">
          <span className="text-[10px] text-severity-medium">!</span>
          <span><span className="text-cream">3 reviews</span> pending across tenants</span>
        </button>
        <span className="w-px h-3 bg-navy-400" />
        <span>Latest indexer snapshot: <span className="font-mono text-cream">02:14:38 UTC</span></span>
        <span className="w-px h-3 bg-navy-400" />
        <span>SOC tip: <span className="text-cream">acknowledge within 15m to keep MTTR under target</span></span>
      </div>
    </header>
  );
}
