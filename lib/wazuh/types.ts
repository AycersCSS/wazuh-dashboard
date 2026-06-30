// Response shapes for the Wazuh endpoints the dashboard consumes.
// Modeled after Wazuh's public API (https://documentation.wazuh.com/current/user-manual/api/reference.html)
// so swapping in a real /api/v1/* endpoint later is a one-file change.
//
// Where the upstream returns nested or differently-typed fields, this file
// declares the dashboard-side normalization. Each type has a TODO pointing
// at the Wazuh endpoint that should populate it.

import type {
  Agent, Alert, Vulnerability, ComplianceControl, Rule, FimEvent
} from "@/types";

// TODO(replace-when-endpoint-ready): GET /agents
export interface WazuhAgentsList {
  agents: Agent[];
  total: number;
}

// TODO(replace-when-endpoint-ready): GET /agents?status=active
export interface WazuhAgentStatusCount {
  active: number;
  disconnected: number;
  pending: number;
  never_connected: number;
}

// TODO(replace-when-endpoint-ready): GET /vulnerability
export interface WazuhVulnerabilitiesList {
  vulnerabilities: Vulnerability[];
  total: number;
}

// TODO(replace-when-endpoint-ready): GET /rules
export interface WazuhRulesList {
  rules: Rule[];
  total: number;
}

// TODO(replace-when-endpoint-ready): GET /experimental/syscheck (FIM)
export interface WazuhFimList {
  events: FimEvent[];
  total: number;
}

// TODO(replace-when-endpoint-ready): GET /compliance/:framework
export interface WazuhComplianceList {
  framework: ComplianceControl["framework"];
  controls: ComplianceControl[];
}

// TODO(replace-when-endpoint-ready): GET /mitre (or derived from /alerts)
export interface WazuhMitreCoverage {
  // tacticId -> techniqueId -> count of alerts
  matrix: Record<string, Record<string, number>>;
  totalAlerts: number;
}

// TODO(replace-when-endpoint-ready): GET /manager/status + /cluster/health
export interface WazuhClusterStatus {
  manager: string;
  workers: { active: number; total: number };
  indexer: { name: string; version: string };
  apiLatencyP95Ms: number;
  agentsBreakdown?: WazuhAgentStatusCount;
}

// TODO(replace-when-endpoint-ready): GET /security/users (or MergeIT platform)
export interface WazuhUser {
  id: string;
  username: string;
  email: string;
  role: "admin" | "analyst" | "viewer";
}

// TODO(replace-when-endpoint-ready): GET /logs/archives (Wazuh archives) or
// the MergeIT platform's log forwarder. The page renders a virtualized list
// of log rows; the upstream shape is intentionally simple.
export interface WazuhLogEntry {
  id: string;
  timestamp: string;
  source: string;        // e.g. sshd, auditd
  agent: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  message: string;
}

// TODO(replace-when-endpoint-ready): GET /threat-intel/actors (MergeIT
// platform — Wazuh itself has no actor concept).
export interface WazuhThreatActor {
  id: string;
  name: string;
  origin: string;
  targetSectors: string[];
  ttps: string[];
  observed24h: number;
}

// TODO(replace-when-endpoint-ready): GET /integrations or per-integration
// endpoints (M365, NinjaOne, Bitdefender, CE). Until those endpoints exist
// the dashboard shows an explicit "not connected" state.
export interface WazuhIntegrationHealth {
  id: string;
  name: string;
  vendor: string;
  status: "Connected" | "Degraded" | "Disconnected";
  lastSyncAt: string;
  kpis: { label: string; value: string }[];
  recent: WazuhIntegrationEvent[];
  /** Optional platform-side health checks (latency p95, headroom, etc.). */
  healthMetrics?: { label: string; value: string; tone?: "ok" | "warn" | "down" }[];
}

export interface WazuhIntegrationEvent {
  id: string;
  time: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  tenant: string;
  primary: string;        // e.g. user, device, endpoint
  description: string;
  wazuhRuleId: string;
}

// Re-export dashboard domain types so proxy routes can import everything
// from one place.
export type { Agent, Alert, Vulnerability, ComplianceControl, Rule, FimEvent };
