"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ALL_TENANTS_KEY } from "@/lib/tenantDisplay";

/**
 * Live tenant selection, lifted out of the Topbar's local reducer so any
 * component (audit recorder, future TenantContext consumers) can read the
 * currently-selected tenant. Backed by localStorage so the selection
 * survives a page refresh — earlier, the Topbar's reducer reset to "all"
 * on every page load.
 *
 * SECURITY: the value from localStorage is JSON-parsed and treated as an
 * opaque string. It is compared against known tenant IDs from the connector
 * and the ALL_TENANTS_KEY sentinel but is never assigned to innerHTML, href,
 * or any DOM property. See app/layout.tsx:themeBootstrap for the same
 * pattern. localStorage is shared across all scripts on the origin; treat
 * its contents as untrusted.
 */
const KEY = "selected-tenant";
const subscribers = new Set<(tenant: string) => void>();

let cachedTenant: string = ALL_TENANTS_KEY;

function readInitial(): string {
  if (typeof window === "undefined") return ALL_TENANTS_KEY;
  try {
    const raw = window.localStorage.getItem(`sentinel-stack:v1:${KEY}`);
    if (raw) return JSON.parse(raw) as string;
  } catch { /* ignore */ }
  return ALL_TENANTS_KEY;
}

let hydrated = false;
function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  cachedTenant = readInitial();
  // Cross-tab sync
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key !== `sentinel-stack:v1:${KEY}` || e.newValue === null) return;
      try {
        cachedTenant = JSON.parse(e.newValue) as string;
        subscribers.forEach(s => s(cachedTenant));
      } catch { /* ignore */ }
    });
  }
}

function persist(tenant: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`sentinel-stack:v1:${KEY}`, JSON.stringify(tenant));
  } catch { /* ignore */ }
}

function setTenant(tenant: string) {
  ensureHydrated();
  cachedTenant = tenant;
  persist(tenant);
  subscribers.forEach(s => s(tenant));
}

const TenantContext = createContext<string>(ALL_TENANTS_KEY);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  // The Topbar's reducer state was the previous source of truth; it is
  // preserved for the user-menu / dropdown render path. The Topbar is
  // updated to push changes here via setTenantSelection. The provider
  // mounts before any descendant so useTenantSelection() returns the
  // hydrated value on first render.
  ensureHydrated();
  const [tenant, setTenantState] = useState<string>(cachedTenant);
  useEffect(() => {
    const cb = (next: string) => setTenantState(next);
    subscribers.add(cb);
    return () => { subscribers.delete(cb); };
  }, []);
  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantSelection(): { tenant: string; setTenant: (next: string) => void } {
  const tenant = useContext(TenantContext);
  return useMemo(() => ({ tenant, setTenant }), [tenant]);
}

export { setTenant, ALL_TENANTS_KEY };
