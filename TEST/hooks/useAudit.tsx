"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { storage } from "@/lib/storage";
import { useSession } from "@/lib/auth/useSession";
import { useTenantSelection } from "@/hooks/useTenantSelection";
import { ALL_TENANTS_KEY } from "@/lib/tenantDisplay";
import type { AuditEvent, AuditScope } from "@/types";

/**
 * Audit log store + recorder. Mirrors the useAlertsStore pattern
 * (useSyncExternalStore over module-level state, hydration from
 * localStorage, capped array). The recorder `record()` resolves the
 * actor (signed-in username) and tenant (active tenant selection) at
 * call time so call sites only need to supply `type` and `summary`.
 *
 * Storage key: sentinel-stack:v1:audit. Excluded from the
 * storage.clear() reset path on purpose — wiping the audit log should
 * require an explicit user action, and even then the wipe itself is
 * captured as the LAST event before clearing.
 */
const KEY = "audit";
const MAX_EVENTS = 1000;

let events: AuditEvent[] = [];

const subscribers = new Set<() => void>();
let cachedSnapshot = { events };
function notify() {
  cachedSnapshot = { events };
  subscribers.forEach(s => s());
}
function subscribe(cb: () => void) { subscribers.add(cb); return () => subscribers.delete(cb); }
function snapshot() { return cachedSnapshot; }
function getServerSnapshot() { return cachedSnapshot; }

let hydrated = false;
function hydrateOnce() {
  if (hydrated) return;
  hydrated = true;
  const persisted = storage.get<AuditEvent[]>(KEY, []);
  if (Array.isArray(persisted)) {
    events = persisted.slice(0, MAX_EVENTS);
  }
  notify();
}

function persist() {
  storage.set(KEY, events);
}

let counter = 0;
function makeId(ts: string) {
  counter = (counter + 1) % 1_000_000;
  return `${ts}-${counter.toString(36)}`;
}

/**
 * Append a fully-formed event. Used by tests and by useAudit().record().
 */
export function appendEvent(event: Omit<AuditEvent, "id">): AuditEvent {
  const id = makeId(event.ts);
  const full: AuditEvent = { id, ...event };
  events = [full, ...events].slice(0, MAX_EVENTS);
  persist();
  notify();
  return full;
}

export function clearAuditLog(): void {
  events = [];
  persist();
  notify();
}

export function getAuditEvents(): readonly AuditEvent[] {
  return events;
}

/**
 * Read the full audit log via useSyncExternalStore. Hydration is lazy
 * (on first call only).
 */
export function useAuditEvents(): { events: readonly AuditEvent[] } {
  const snap = useSyncExternalStore(subscribe, snapshot, getServerSnapshot);
  useEffect(() => { hydrateOnce(); }, []);
  return { events: snap.events };
}

export interface RecordInput {
  scope: AuditScope;
  type: string;
  summary: string;
  outcome?: AuditEvent["outcome"];
  target?: AuditEvent["target"];
  meta?: Record<string, unknown>;
  /** Explicit tenant override; defaults to the active selection. */
  tenant?: string | null;
  /** Explicit actor override; defaults to the signed-in username. */
  actor?: string;
}

/**
 * Recorder hook. The `record` callback captures `actor` from the session
 * and `tenant` from the active selection at call time, so call sites
 * only need to specify scope/type/summary/target/meta.
 */
export function useAudit() {
  const { user } = useSession();
  const { tenant } = useTenantSelection();

  return useMemo(() => {
    const record = (input: RecordInput): AuditEvent => {
      const resolvedTenant =
        input.tenant !== undefined
          ? input.tenant
          : tenant === ALL_TENANTS_KEY
            ? null
            : tenant;
      const resolvedActor = input.actor ?? user?.username ?? "anonymous";
      return appendEvent({
        ts: new Date().toISOString(),
        actor: resolvedActor,
        tenant: resolvedTenant,
        scope: input.scope,
        type: input.type,
        summary: input.summary,
        outcome: input.outcome,
        target: input.target,
        meta: input.meta
      });
    };
    return { record };
  }, [user, tenant]);
}

/**
 * Imperative variant for places that can't use a hook (test helpers,
 * pre-hydration callbacks). Pass actor/tenant explicitly.
 */
export function recordAudit(
  scope: AuditScope,
  type: string,
  summary: string,
  extras?: { actor?: string; tenant?: string | null; outcome?: AuditEvent["outcome"]; target?: AuditEvent["target"]; meta?: Record<string, unknown> }
): AuditEvent {
  return appendEvent({
    ts: new Date().toISOString(),
    actor: extras?.actor ?? "anonymous",
    tenant: extras?.tenant ?? null,
    scope,
    type,
    summary,
    outcome: extras?.outcome,
    target: extras?.target,
    meta: extras?.meta
  });
}

/**
 * Test-only: reset module state. Used by vitest beforeEach to avoid
 * state leaking between tests.
 */
export function __resetAuditForTests() {
  events = [];
  counter = 0;
  hydrated = false;
  subscribers.clear();
  cachedSnapshot = { events };
  storage.remove(KEY);
}
