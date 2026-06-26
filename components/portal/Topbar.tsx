"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useToasts } from "@/components/providers/ToastProvider";
import { useCommandPalette } from "@/hooks/useCommandPalette";

export interface TopbarUser {
  name: string;
  email: string;
  tenantName: string;
  tenantTier: string;
  role: string;
  initials: string;
}

export function PortalTopbar({ user }: { user: TopbarUser }) {
  const router = useRouter();
  const cmd = useCommandPalette();
  const toasts = useToasts();

  const [helpOpen, setHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);

  const tenantRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (tenantRef.current && !tenantRef.current.contains(e.target as Node)) setTenantOpen(false);
      if (helpRef.current  && !helpRef.current.contains(e.target as Node))  setHelpOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function closeAll() {
    setTenantOpen(false); setHelpOpen(false); setNotifOpen(false); setUserOpen(false);
  }

  async function signOut() {
    closeAll();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-navy/95 backdrop-blur border-b border-navy-400">
      <div className="h-14 flex items-center gap-3 px-4">
        <div ref={tenantRef} className="relative">
          <button
            type="button"
            onClick={() => { closeAll(); setTenantOpen(o => !o); }}
            className="flex items-center gap-2 h-8 px-2.5 bg-navy-100 border border-navy-400 rounded-md hover:border-navy-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-haspopup="menu" aria-expanded={tenantOpen}
          >
            <span className="text-[12px] font-medium text-cream truncate max-w-[200px]">{user.tenantName}</span>
            <span className="inline-flex items-center h-5 px-1.5 rounded bg-emerald-400/15 border border-emerald-400/40 text-emerald-400 text-[10px] font-mono">
              {user.tenantTier.toUpperCase()}
            </span>
            <span className={cn("text-navy-600 transition-transform text-[10px]", tenantOpen && "rotate-180")}>v</span>
          </button>
          {tenantOpen && (
            <div className="absolute left-0 top-10 w-[280px] bg-navy-100 border border-navy-500 rounded-lg shadow-pop z-40 animate-slide-in-right">
              <div className="px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-navy-600 font-semibold border-b border-navy-400">Tenant</div>
              <div className="px-3 h-12 flex items-center gap-2.5 border-b border-navy-400/60">
                <div className="w-8 h-8 rounded-md bg-emerald-400/15 border border-emerald-400/40 grid place-items-center text-[11px] font-mono text-emerald-400">
                  {user.initials}
                </div>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-cream truncate">{user.tenantName}</div>
                  <div className="text-[10.5px] text-navy-600 font-mono">{user.tenantTier}</div>
                </div>
              </div>
              <div className="px-3 py-2.5 text-[11px] text-navy-600">
                Tenants are managed by your MergeIT SOC. Contact them to change access.
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => cmd.setOpen(true)}
          className="hidden lg:flex w-[280px] xl:w-[340px] items-center gap-2 h-8 px-2.5 bg-navy-100 border border-navy-400 rounded-md text-[13px] text-navy-600 hover:border-navy-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label="Open search"
        >
          <span className="flex-1 text-left">Search portal...</span>
          <span className="flex items-center gap-1">
            <span className="kbd">Cmd</span><span className="kbd">K</span>
          </span>
        </button>

        <button
          type="button"
          className="inline-flex items-center justify-center h-8 px-2 rounded-md text-[11px] text-navy-600 hover:text-cream hover:bg-navy-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          aria-label="Theme (locked dark)" title="Theme locked to dark"
        >
          <span>Dark</span>
        </button>

        <div ref={helpRef} className="relative">
          <button
            type="button"
            onClick={() => { closeAll(); setHelpOpen(o => !o); }}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-navy-600 hover:text-cream hover:bg-navy-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Help" aria-haspopup="menu" aria-expanded={helpOpen}
          >
            <span className="text-[12px]">?</span>
          </button>
          {helpOpen && (
            <div className="absolute right-0 top-10 w-[320px] bg-navy-100 border border-navy-500 rounded-lg shadow-pop z-40 animate-slide-in-right">
              <div className="px-3 h-10 flex items-center border-b border-navy-400 text-xs font-semibold text-cream">
                Keyboard shortcuts
              </div>
              <ul className="py-1.5 text-xs">
                {[
                  { k: ["Cmd", "K"], label: "Open command palette" },
                  { k: ["G", "A"],    label: "Go to Alerts" },
                  { k: ["G", "G"],    label: "Go to Agents" },
                  { k: ["G", "V"],    label: "Go to Vulnerabilities" },
                  { k: ["G", "F"],    label: "Go to File integrity" },
                  { k: ["G", "R"],    label: "Go to Rules" },
                  { k: ["G", "L"],    label: "Go to Logs" },
                  { k: ["Esc"],       label: "Close any overlay" }
                ].map(s => (
                  <li key={s.label} className="px-3 h-8 flex items-center justify-between hover:bg-navy-200">
                    <span className="text-sage">{s.label}</span>
                    <span className="flex items-center gap-1">
                      {s.k.map((key) => <span key={key} className="kbd">{key}</span>)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-navy-400 p-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => { setHelpOpen(false); cmd.setOpen(true); }}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium bg-navy border border-navy-500 rounded-md hover:bg-navy-200 text-cream"
                >
                  Open palette
                </button>
                <button
                  type="button"
                  onClick={() => toasts.push({ variant: "info", title: "Opening documentation" })}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium bg-navy border border-navy-500 rounded-md hover:bg-navy-200 text-cream"
                >
                  Docs
                </button>
              </div>
            </div>
          )}
        </div>

        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => { closeAll(); setNotifOpen(o => !o); }}
            className="relative inline-flex items-center justify-center w-8 h-8 rounded-md text-navy-600 hover:text-cream hover:bg-navy-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Notifications" aria-haspopup="menu" aria-expanded={notifOpen}
          >
            <span className="text-[12px]">bell</span>
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-severity-critical" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-10 w-[360px] bg-navy-100 border border-navy-500 rounded-lg shadow-pop z-40 animate-slide-in-right">
              <div className="flex items-center justify-between px-3 h-10 border-b border-navy-400">
                <div className="text-xs font-semibold text-cream">Notifications</div>
                <button
                  type="button"
                  onClick={() => toasts.push({ variant: "info", title: "Notifications cleared", duration: 1800 })}
                  className="text-[11px] text-navy-600 hover:text-cream"
                >
                  Mark all read
                </button>
              </div>
              <ul className="max-h-[320px] overflow-y-auto">
                {[
                  { sev: "critical", title: `Critical alert on ${user.tenantName} - sign-in from unknown country`, time: "2m" },
                  { sev: "high",     title: "3 endpoints out of date on Bitdefender engines",                       time: "14m" },
                  { sev: "medium",   title: "Cyber Essentials evidence pack due in 6 days",                           time: "1h"  },
                  { sev: "info",     title: "NinjaOne sync completed for 28 devices",                                time: "3h"  }
                ].map((n) => (
                  <li key={n.title + n.time}>
                    <button
                      type="button"
                      onClick={() => { setNotifOpen(false); toasts.push({ variant: n.sev as "info", title: "Opened: " + n.title, duration: 2000 }); }}
                      className="w-full text-left px-3 py-2.5 border-b border-navy-400/60 last:border-0 hover:bg-navy-200 cursor-pointer"
                    >
                      <span className={cn(
                        "mt-1.5 w-1.5 h-1.5 rounded-full flex-none inline-block align-middle mr-2.5",
                        n.sev === "critical" ? "bg-severity-critical" :
                        n.sev === "high"     ? "bg-severity-high" :
                        n.sev === "medium"   ? "bg-severity-medium" : "bg-severity-info"
                      )} />
                      <span className="text-xs text-cream leading-snug">{n.title}</span>
                      <span className="block text-[10.5px] text-navy-600 mt-0.5">{user.tenantName} - {n.time} ago</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="px-3 h-9 flex items-center justify-between border-t border-navy-400">
                <span className="text-[10.5px] text-navy-600">Showing 4 of 17</span>
                <button type="button" onClick={() => setNotifOpen(false)} className="text-[11.5px] text-emerald-400 hover:brightness-110">View all</button>
              </div>
            </div>
          )}
        </div>

        <div ref={userRef} className="relative">
          <button
            type="button"
            onClick={() => { closeAll(); setUserOpen(o => !o); }}
            className="flex items-center gap-2 h-8 pl-1 pr-2 bg-navy-100 border border-navy-400 rounded-md hover:border-navy-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="User menu" aria-haspopup="menu" aria-expanded={userOpen}
          >
            <span className="w-6 h-6 rounded-md bg-emerald-400/20 border border-emerald-400/40 grid place-items-center text-[10px] font-semibold text-emerald-400">
              {user.initials}
            </span>
            <span className="hidden md:flex flex-col text-left leading-tight">
              <span className="text-xs font-medium text-cream">{user.name}</span>
              <span className="text-[10px] text-navy-600">{user.role}</span>
            </span>
            <span className={cn("text-navy-600 transition-transform text-[10px]", userOpen && "rotate-180")}>v</span>
          </button>
          {userOpen && (
            <div className="absolute right-0 top-10 w-[260px] bg-navy-100 border border-navy-500 rounded-lg shadow-pop z-40 animate-slide-in-right">
              <div className="px-3 py-3 border-b border-navy-400">
                <div className="text-[13px] font-semibold text-cream">{user.name}</div>
                <div className="text-[11px] text-navy-600">{user.email}</div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="inline-flex items-center h-5 px-2 rounded-md bg-navy-200 border border-navy-500 text-sage text-[11px]">{user.role}</span>
                  <span className="inline-flex items-center gap-1 h-5 px-2 rounded-md bg-emerald-400/15 border border-emerald-400/40 text-emerald-400 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />{user.tenantTier}
                  </span>
                </div>
              </div>
              <ul className="py-1.5">
                {[
                  { label: "Profile",   action: () => toasts.push({ title: "Profile (coming soon)" }) },
                  { label: "Security",  action: () => toasts.push({ title: "Security (coming soon)" }) },
                  { label: "Shortcuts", action: () => { setUserOpen(false); setHelpOpen(true); } }
                ].map(({ label, action }) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={action}
                      className="w-full flex items-center gap-2.5 px-3 h-8 text-xs text-sage hover:text-cream hover:bg-navy-200 transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-navy-400 py-1.5">
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full flex items-center gap-2.5 px-3 h-8 text-xs text-severity-critical hover:bg-severity-critical/15 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden lg:flex h-7 items-center gap-3 px-4 border-t border-navy-400 text-[11px] text-navy-600">
        <button
          type="button"
          onClick={() => toasts.push({ variant: "warn", title: "3 Cyber Essentials reviews pending", description: "Opening review queue..." })}
          className="flex items-center gap-1.5 hover:text-cream"
        >
          <span className="text-[10px] text-severity-medium">!</span>
          <span><span className="text-cream">3 reviews</span> pending across tenants</span>
        </button>
        <span className="w-px h-3 bg-navy-400" />
        <span>Latest indexer snapshot: <span className="font-mono text-cream">02:14:38 UTC</span></span>
        <span className="w-px h-3 bg-navy-400" />
        <span>Tip: <span className="text-cream">acknowledge within 15m to keep MTTR under target</span></span>
      </div>
    </header>
  );
}
