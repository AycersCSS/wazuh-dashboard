"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  alerts as seedAlerts,
  vulnerabilities as seedVulns,
  rules as seedRules,
  agents as seedAgents
} from "@/data/seed";
import { storage } from "@/lib/storage";
import type { VulnState, FimReviewState, AgentIsolation } from "@/types";

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

function hydrateFromSeed() {
  alertMap = Object.fromEntries(
    seedAlerts.map(a => [a.id, { acknowledged: !!a.acknowledged, archived: !!a.archived }])
  );
  vulnMap = Object.fromEntries(seedVulns.map(v => [v.cve, { status: "open" as VulnState }]));
  ruleMap = Object.fromEntries(seedRules.map(r => [r.id, { status: r.status }]));
  fimMap = {};
  agentMap = Object.fromEntries(
    seedAgents.map(a => [a.id, { isolation: "normal" as AgentIsolation }])
  );
}

function hydrateOnce() {
  if (Object.keys(alertMap).length) return;
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
    hydrateFromSeed();
    persistAll();
  }
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
    hydrateOnce();
    notify();
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

export function useMarkFimReviewed() {
  return useCallback((id: string) => {
    fimMap[id] = { state: "reviewed" };
    storage.set(KEY_FIM, fimMap);
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
    storage.clear();
    hydrateFromSeed();
    persistAll();
    notify();
  }, []);
}

export function isAcked(id: string)   { return !!alertMap[id]?.acknowledged; }
export function isArchived(id: string){ return !!alertMap[id]?.archived; }
export function vulnStatus(cve: string): VulnState       { return vulnMap[cve]?.status ?? "open"; }
export function ruleStatus(id: string): "enabled" | "disabled" { return ruleMap[id]?.status ?? "enabled"; }
export function fimReviewState(id: string): FimReviewState { return fimMap[id]?.state ?? "unreviewed"; }
export function agentIsolation(id: string): AgentIsolation  { return agentMap[id]?.isolation ?? "normal"; }
