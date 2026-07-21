"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { storage } from "@/lib/storage";
import type { Alert, Vulnerability, Rule, Agent, VulnState, FimReviewState, AgentIsolation } from "@/types";

// TODO(replace-when-endpoint-ready): hydrateFromLive() replaces the old
// seed-based hydration. The hook no longer imports `data/seed`; instead,
// each page that has already fetched its live list calls hydrateFromLive()
// with the data it received from the Wazuh proxy. This keeps the local
// store in sync with whatever the upstream returned on first paint.

type AlertState = { acknowledged: boolean; archived: boolean };
type RuleState  = { status: "enabled" | "disabled" };

const KEY_ALERTS = "alerts";
const KEY_VULNS  = "vulns";
const KEY_RULES  = "rules";
const KEY_FIM    = "fim";
const KEY_AGENTS = "agents";

let alertMap: Record<string, AlertState> = {};
let vulnMap:  Record<string, { status: VulnState }> = {};
let ruleMap:  Record<string, RuleState> = {};
let fimMap:   Record<string, { state: FimReviewState }> = {};
let agentMap: Record<string, { isolation: AgentIsolation }> = {};

const subscribers = new Set<() => void>();
let cachedSnapshot = { alertMap, vulnMap, ruleMap, fimMap, agentMap };
function notify() {
  cachedSnapshot = { alertMap, vulnMap, ruleMap, fimMap, agentMap };
  subscribers.forEach(s => s());
}
function subscribe(cb: () => void) { subscribers.add(cb); return () => subscribers.delete(cb); }
function snapshot() { return cachedSnapshot; }
function getServerSnapshot() { return snapshot(); }

/**
 * Populate the local store from a set of live lists. Called by pages that
 * have already fetched the data from /api/wazuh/* — typically from a
 * useWazuhResource hook. Idempotent: unknown keys are added, existing keys
 * are preserved (so user-acked alerts survive a re-hydration).
 */
function hydrateFromLive(input: {
  alerts?: Alert[];
  vulns?: Vulnerability[];
  rules?: Rule[];
  agents?: Agent[];
}) {
  if (input.alerts) {
    for (const a of input.alerts) {
      if (!(a.id in alertMap)) {
        alertMap[a.id] = { acknowledged: !!a.acknowledged, archived: !!a.archived };
      }
    }
  }
  if (input.vulns) {
    for (const v of input.vulns) {
      if (!(v.cve in vulnMap)) {
        vulnMap[v.cve] = { status: "open" };
      }
    }
  }
  if (input.rules) {
    for (const r of input.rules) {
      if (!(r.id in ruleMap)) {
        ruleMap[r.id] = { status: r.status };
      }
    }
  }
  if (input.agents) {
    for (const a of input.agents) {
      if (!(a.id in agentMap)) {
        agentMap[a.id] = { isolation: "normal" };
      }
    }
  }
  persistAll();
  notify();
}

let hydrated = false;

function hydrateOnce(): boolean {
  if (hydrated) return false;
  hydrated = true;
  const persisted = {
    alerts: storage.get<Record<string, AlertState>>(KEY_ALERTS, null as unknown as Record<string, AlertState>),
    vulns:  storage.get<Record<string, { status: VulnState }>>(KEY_VULNS, null as unknown as Record<string, { status: VulnState }>),
    rules:  storage.get<Record<string, RuleState>>(KEY_RULES, null as unknown as Record<string, RuleState>),
    fim:    storage.get<Record<string, { state: FimReviewState }>>(KEY_FIM, null as unknown as Record<string, { state: FimReviewState }>),
    agents: storage.get<Record<string, { isolation: AgentIsolation }>>(KEY_AGENTS, null as unknown as Record<string, { isolation: AgentIsolation }>)
  };
  if (persisted.alerts && Object.keys(persisted.alerts).length) {
    alertMap = persisted.alerts;
    vulnMap  = persisted.vulns  ?? {};
    ruleMap  = persisted.rules  ?? {};
    fimMap   = persisted.fim    ?? {};
    agentMap = persisted.agents ?? {};
  } else {
    // No persisted state. We do NOT hydrate from a seed any more — the
    // dashboard waits for the live /api/wazuh/* responses and calls
    // hydrateFromLive() from each page once they arrive. The maps stay
    // empty until then.
    alertMap = {};
    vulnMap  = {};
    ruleMap  = {};
    fimMap   = {};
    agentMap = {};
  }
  return true;
}

function persistAll() {
  storage.set(KEY_ALERTS, alertMap);
  storage.set(KEY_VULNS,  vulnMap);
  storage.set(KEY_RULES,  ruleMap);
  storage.set(KEY_FIM,    fimMap);
  storage.set(KEY_AGENTS, agentMap);
}

export function useAlertsStore() {
  const snap = useSyncExternalStore(subscribe, snapshot, getServerSnapshot);
  useEffect(() => {
    if (hydrateOnce()) {
      notify();
    }
  }, []);
  return snap;
}

export function useAcknowledge() {
  return useCallback((ids: string[]) => {
    ids.forEach(id => {
      const cur = alertMap[id] ?? { acknowledged: false, archived: false };
      alertMap[id] = { ...cur, acknowledged: true };
    });
    storage.set(KEY_ALERTS, alertMap);
    notify();
  }, []);
}

export function useArchive() {
  return useCallback((ids: string[]) => {
    ids.forEach(id => {
      const cur = alertMap[id] ?? { acknowledged: false, archived: false };
      alertMap[id] = { ...cur, archived: true, acknowledged: true };
    });
    storage.set(KEY_ALERTS, alertMap);
    notify();
  }, []);
}

export function useSetVulnStatus() {
  return useCallback((cve: string, status: VulnState) => {
    vulnMap[cve] = { status };
    storage.set(KEY_VULNS, vulnMap);
    notify();
  }, []);
}

export function useToggleRule() {
  return useCallback((id: string) => {
    const cur = ruleMap[id] ?? { status: "enabled" as const };
    ruleMap[id] = { status: cur.status === "enabled" ? "disabled" : "enabled" };
    storage.set(KEY_RULES, ruleMap);
    notify();
  }, []);
}

export function useIsolateAgent() {
  return useCallback((id: string, isolation: AgentIsolation) => {
    agentMap[id] = { isolation };
    storage.set(KEY_AGENTS, agentMap);
    notify();
  }, []);
}

export function useReset() {
  return useCallback(() => {
    // The audit log and selected-tenant keys survive the reset so the
    // data.reset_defaults audit event is self-attesting — the last record
    // in the log is the reset itself. Only persistent mutable state (alert
    // acks, vuln statuses, rule toggles, agent isolations, FIM reviews) is
    // wiped. See lib/storage.ts:clear() for the preserve list.
    storage.clear();
    // Wipe the in-memory maps; pages that have live data will re-hydrate
    // via hydrateFromLive() on their next successful fetch.
    alertMap = {};
    vulnMap  = {};
    ruleMap  = {};
    fimMap   = {};
    agentMap = {};
    notify();
  }, []);
}

/**
 * Public hook version of hydrateFromLive() so React components can call it
 * from a useEffect when their /api/wazuh/* responses arrive. Returns a
 * stable callback.
 */
export function useHydrateFromLive() {
  return useCallback((input: Parameters<typeof hydrateFromLive>[0]) => {
    hydrateFromLive(input);
  }, []);
}

export function isAcked(id: string)   { return !!alertMap[id]?.acknowledged; }
export function vulnStatus(cve: string): VulnState       { return vulnMap[cve]?.status ?? "open"; }
export function ruleStatus(id: string): "enabled" | "disabled" { return ruleMap[id]?.status ?? "enabled"; }
export function agentIsolation(id: string): AgentIsolation  { return agentMap[id]?.isolation ?? "normal"; }
