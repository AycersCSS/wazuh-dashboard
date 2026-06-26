/**
 * Wazuh-shaped data models used by the portal's stub layer.
 * These intentionally mirror the SOC dashboard's types/index.ts so that
 * when a real Wazuh API is wired in, the UI does not need to change.
 */

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type AgentStatus = "active" | "disconnected" | "pending" | "isolated";
export type VulnState = "open" | "in_progress" | "patched" | "wont_fix";
export type FimReviewState = "unreviewed" | "in_review" | "reviewed";

export interface TenantSnapshot {
  tenantId: string;
  name: string;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  securityScore: number;
  openIncidents: number;
  alerts24h: number;
  cveCount: number;
  agentCount: number;
  activeAgentCount: number;
  lastSyncAt: string;
}

export interface Agent {
  id: string;
  name: string;
  ip: string;
  os: string;
  version: string;
  status: AgentStatus;
  lastSeenAt: string;
  tenantId: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  ruleId: string;
  ruleDescription: string;
  level: Severity;
  agentId: string;
  agentName: string;
  description: string;
  mitre?: { tactic: string; technique: string };
  acknowledged: boolean;
  archived: boolean;
  tenantId: string;
}

export interface Vulnerability {
  id: string;
  cveId: string;
  title: string;
  severity: Severity;
  cvss: number;
  agentId: string;
  agentName: string;
  package: string;
  status: VulnState;
  publishedAt: string;
  tenantId: string;
}

export interface FimEvent {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  file: string;
  action: "added" | "modified" | "deleted";
  review: FimReviewState;
  tenantId: string;
}

export interface Rule {
  id: string;
  description: string;
  level: Severity;
  group: string[];
  enabled: boolean;
  tenantId: string;
}

export interface ComplianceControl {
  id: string;
  framework: string;
  control: string;
  description: string;
  status: "pass" | "fail" | "unknown";
  evidence: number;
  tenantId: string;
}

export interface ThreatActor {
  id: string;
  name: string;
  origin: string;
  targets: string[];
  lastSeen: string;
  severity: Severity;
  description: string;
  tenantId: string;
}

export interface MitreTactic {
  id: string;
  name: string;
  detected: number;
  total: number;
  techniques: { id: string; name: string; detected: boolean }[];
  tenantId: string;
}

export interface LogLine {
  id: string;
  timestamp: string;
  level: Severity;
  agentId: string;
  message: string;
  tenantId: string;
}
