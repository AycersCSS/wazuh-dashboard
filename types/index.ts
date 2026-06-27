// Domain types modeled after Wazuh's public API shape so that
// swapping in a real /api/v1/* endpoint later is a one-file change.

export type Severity = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export type SeverityBucket = "critical" | "high" | "medium" | "low" | "info";

export function severityBucket(sev: Severity | number): SeverityBucket {
  if (sev >= 13) return "critical";
  if (sev >= 10) return "high";
  if (sev >= 7)  return "medium";
  if (sev >= 4)  return "low";
  return "info";
}

export function severityLabel(sev: Severity | number): string {
  const b = severityBucket(sev);
  if (b === "critical") return "Critical";
  if (b === "high") return "High";
  if (b === "medium") return "Medium";
  if (b === "low") return "Low";
  return "Informational";
}

export type AgentStatus = "active" | "disconnected" | "never_connected" | "pending";

export interface Agent {
  id: string;
  name: string;
  ip: string;
  os: { name: string; version: string; arch: "x86_64" | "arm64" };
  group: string[];
  status: AgentStatus;
  lastKeepAlive: string;
  version: string;
  region: string;
  manager: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  rule: { id: string; level: Severity; description: string; groups: string[]; mitre?: { id: string; tactic: string; technique: string } };
  agent: { id: string; name: string; ip: string };
  location: string;
  decoder?: { name: string; parent: string };
  data?: Record<string, string | number>;
  acknowledged?: boolean;
  archived?: boolean;
}

export interface Vulnerability {
  cve: string;
  severity: SeverityBucket;
  cvss: number;
  package: string;
  version: string;
  fixedVersion?: string;
  agentCount: number;
  publishedAt: string;
  title: string;
}

export interface ComplianceControl {
  framework: "PCI DSS" | "HIPAA" | "GDPR" | "NIST 800-53" | "ISO 27001";
  control: string;
  title: string;
  pass: number;
  fail: number;
  total: number;
}

export interface Rule {
  id: string;
  description: string;
  level: Severity;
  groups: string[];
  status: "enabled" | "disabled";
  modified: string;
  hits24h: number;
}

export interface FimEvent {
  id: string;
  timestamp: string;
  agent: string;
  path: string;
  action: "modified" | "added" | "deleted";
  user: string;
  size: number;
}

export interface KpiSummary {
  agentsTotal: number;
  agentsActive: number;
  agentsDisconnected: number;
  alerts24h: number;
  alertsCritical: number;
  vulnsOpen: number;
  complianceScore: number; // 0..1
  mitreTechniquesObserved: number;
  eventsPerSecond: number;
}

export type VulnState = "open" | "in_progress" | "patched" | "wont_fix";
export type FimReviewState = "unreviewed" | "reviewed";
export type AgentIsolation = "normal" | "isolated";

/**
 * Audit log event. Recorded for every user-driven action that mutates state,
 * changes tenant context, navigates between surfaces, or touches auth.
 * `actor` is the signed-in username; `tenant` is the active tenant at the
 * time of the action (null when the user is on "All tenants" or the action
 * is not tenant-scoped). `summary` is the human-readable line shown in the
 * /audit page table; `meta` is the structured payload for filtering and
 * drill-in. Events are stored newest-first, capped at MAX events to bound
 * localStorage growth.
 */
export type AuditScope =
  | "auth"
  | "alert"
  | "agent"
  | "vuln"
  | "rule"
  | "fim"
  | "log"
  | "tenant"
  | "data"
  | "integration"
  | "navigation"
  | "ui"
  | "help"
  | "notifications"
  | "review";

export type AuditOutcome = "success" | "failure" | "requested" | "stub" | "cancelled";

export interface AuditEvent {
  /** Stable id; `${ts}-${counter}` so the table has a unique key. */
  id: string;
  /** ISO timestamp at the moment the action fired. */
  ts: string;
  /** Signed-in username. "anonymous" if no session. */
  actor: string;
  /** Connector tenant id at the time of the action. null = unscoped. */
  tenant: string | null;
  /** Top-level category. Used for filtering and the chip on the row. */
  scope: AuditScope;
  /**
   * Machine key for the event. Form `<scope>.<verb>`, e.g. "alert.ack",
   * "tenant.switch", "auth.logout". Filterable on the /audit page.
   */
  type: string;
  /**
   * Human-readable one-liner, e.g. "Acknowledged alert 1702.5". Rendered
   * verbatim in the table; used as the primary search target.
   */
  summary: string;
  /** Free-form structured payload. Surfaced in the detail drawer. */
  meta?: Record<string, unknown>;
  /** Optional outcome hint. */
  outcome?: AuditOutcome;
  /**
   * Optional explicit target. e.g. { kind: "alert", id: "1702.5" } or
   * { kind: "cve", id: "CVE-2024-1234" }. Used for "filter by target"
   * shortcuts in the detail drawer.
   */
  target?: { kind: string; id: string };
}
