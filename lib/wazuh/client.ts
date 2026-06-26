import { hashSeed, mulberry32 } from "@/data/seed";
import type {
  Agent, Alert, ComplianceControl, FimEvent, LogLine, MitreTactic, Rule,
  TenantSnapshot, ThreatActor, Vulnerability, Severity, AgentStatus
} from "@/lib/wazuh/types";

/**
 * Stub Wazuh client. Generates deterministic, per-tenant data using a
 * seeded PRNG. All read functions are pure: same tenant id -> same data.
 *
 * The mutable state (acknowledge, isolate, etc.) lives in the in-process
 * `wazuhState` map and is intentionally NOT persisted. This matches the
 * demo nature of the stub: actions take effect immediately, are written to
 * the audit log, and are lost on server restart. When the real Wazuh
 * adapter is wired in, only this file changes.
 */

const TIER_SECURITY_BIAS: Record<string, number> = {
  Bronze:   0,
  Silver:   6,
  Gold:     12,
  Platinum: 20
};

function rand<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function severityFromLevel(level: number): Severity {
  if (level >= 13) return "critical";
  if (level >= 9)  return "high";
  if (level >= 6)  return "medium";
  if (level >= 3)  return "low";
  return "info";
}

const OS_POOL = [
  "Windows 11 Pro", "Windows Server 2022", "macOS 14.5", "Ubuntu 22.04",
  "Debian 12", "Windows 10", "Red Hat 9", "CentOS 9"
];

const AGENT_STATUS_POOL: AgentStatus[] = ["active", "active", "active", "active", "disconnected", "pending"];

const MITRE_TACTICS = [
  { id: "TA0001", name: "Initial Access" },
  { id: "TA0002", name: "Execution" },
  { id: "TA0003", name: "Persistence" },
  { id: "TA0004", name: "Privilege Escalation" },
  { id: "TA0005", name: "Defense Evasion" },
  { id: "TA0006", name: "Credential Access" },
  { id: "TA0007", name: "Discovery" },
  { id: "TA0008", name: "Lateral Movement" },
  { id: "TA0009", name: "Collection" },
  { id: "TA0010", name: "Exfiltration" },
  { id: "TA0011", name: "Command and Control" },
  { id: "TA0040", name: "Impact" }
];

const COMPLIANCE_FRAMEWORKS = ["Cyber Essentials Plus", "ISO 27001", "NIST CSF"];

const RULE_GROUPS = ["web", "authentication", "system", "network", "policy", "fim"];

const THREAT_NAMES = [
  "APT29 (Cozy Bear)", "Lazarus Group", "FIN7", "Scattered Spider",
  "Conti", "LockBit affiliates", "Wizard Spider", "TA505"
];

const ORIGINS = ["Russia", "North Korea", "Iran", "China", "Eastern Europe", "Unknown"];

const TARGETS = ["Finance", "Healthcare", "Manufacturing", "Retail", "Government", "Education", "Technology"];

interface TenantState {
  agents: Map<string, Agent>;
  alerts: Map<string, Alert>;
  vulns:  Map<string, Vulnerability>;
  fimEvents: Map<string, FimEvent>;
  rules: Map<string, Rule>;
}

const state = new Map<string, TenantState>();

function rngFor(tenantId: string): () => number {
  return mulberry32(hashSeed(`wazuh:${tenantId}`));
}

function ensureTenantState(tenantId: string, tenantName: string, tier: TenantSnapshot["tier"]): TenantState {
  const existing = state.get(tenantId);
  if (existing) return existing;

  const rng = rngFor(tenantId);
  const bias = TIER_SECURITY_BIAS[tier] ?? 0;

  // Agents
  const agentCount = 8 + Math.floor(rng() * 9); // 8..16
  const agents = new Map<string, Agent>();
  for (let i = 0; i < agentCount; i++) {
    const id = `${tenantId}-a${i.toString().padStart(3, "0")}`;
    const status = rand(rng, AGENT_STATUS_POOL);
    agents.set(id, {
      id,
      name: `${tenantName.split(" ")[0]?.toUpperCase()}-${i.toString().padStart(3, "0")}`,
      ip: `10.${10 + Math.floor(rng() * 200)}.${Math.floor(rng() * 255)}.${1 + Math.floor(rng() * 254)}`,
      os: rand(rng, OS_POOL),
      version: `4.${Math.floor(rng() * 8)}.${Math.floor(rng() * 6)}`,
      status,
      lastSeenAt: new Date(Date.now() - Math.floor(rng() * 3600_000 * 12)).toISOString(),
      tenantId
    });
  }

  // Alerts
  const alertCount = 12 + Math.floor(rng() * 20);
  const alerts = new Map<string, Alert>();
  for (let i = 0; i < alertCount; i++) {
    const id = `${tenantId}-al${i.toString().padStart(4, "0")}`;
    const agent = Array.from(agents.values())[Math.floor(rng() * agents.size)]!;
    const level = 3 + Math.floor(rng() * 12);
    const mitre = rng() < 0.5 ? {
      tactic:    rand(rng, MITRE_TACTICS).id,
      technique: `${rand(rng, MITRE_TACTICS).id}.100`
    } : undefined;
    alerts.set(id, {
      id,
      timestamp: new Date(Date.now() - Math.floor(rng() * 3600_000 * 24)).toISOString(),
      ruleId: `${91000 + Math.floor(rng() * 1000)}`,
      ruleDescription: rand(rng, [
        "Multiple failed logins detected",
        "Suspicious process spawned",
        "MFA disabled for user account",
        "New service installed",
        "Outbound connection to known IOC",
        "File integrity violation",
        "Privilege escalation attempt"
      ]),
      level: severityFromLevel(level),
      agentId: agent.id,
      agentName: agent.name,
      description: "Detected by MergeIT SOC correlation engine.",
      mitre,
      acknowledged: false,
      archived: false,
      tenantId
    });
  }

  // Vulnerabilities
  const vulnCount = 5 + Math.floor(rng() * 15);
  const vulns = new Map<string, Vulnerability>();
  for (let i = 0; i < vulnCount; i++) {
    const id = `${tenantId}-v${i.toString().padStart(4, "0")}`;
    const agent = Array.from(agents.values())[Math.floor(rng() * agents.size)]!;
    const cvss = 3 + rng() * 7;
    vulns.set(id, {
      id,
      cveId: `CVE-2025-${(1000 + Math.floor(rng() * 8999)).toString()}`,
      title: rand(rng, [
        "OpenSSL: DoS via crafted TLS handshake",
        "curl: out-of-bounds read",
        "Apache HTTP mod_rewrite bypass",
        "Linux kernel: privilege escalation",
        "Node.js: prototype pollution"
      ]),
      severity: severityFromLevel(Math.floor(cvss * 1.5)),
      cvss: Math.round(cvss * 10) / 10,
      agentId: agent.id,
      agentName: agent.name,
      package: rand(rng, ["openssl", "curl", "httpd", "kernel", "node"]),
      status: "open",
      publishedAt: new Date(Date.now() - Math.floor(rng() * 3600_000 * 24 * 30)).toISOString(),
      tenantId
    });
  }

  // FIM events
  const fimCount = 6 + Math.floor(rng() * 14);
  const fimEvents = new Map<string, FimEvent>();
  for (let i = 0; i < fimCount; i++) {
    const id = `${tenantId}-fim${i.toString().padStart(4, "0")}`;
    const agent = Array.from(agents.values())[Math.floor(rng() * agents.size)]!;
    fimEvents.set(id, {
      id,
      timestamp: new Date(Date.now() - Math.floor(rng() * 3600_000 * 48)).toISOString(),
      agentId: agent.id,
      agentName: agent.name,
      file: rand(rng, [
        "/etc/passwd", "/etc/sudoers", "/etc/ssh/sshd_config",
        "C:\\Windows\\System32\\drivers\\etc\\hosts",
        "/var/www/html/.htaccess"
      ]),
      action: rand(rng, ["added", "modified", "deleted"]),
      review: "unreviewed",
      tenantId
    });
  }

  // Rules
  const ruleCount = 5 + Math.floor(rng() * 8);
  const rules = new Map<string, Rule>();
  for (let i = 0; i < ruleCount; i++) {
    const id = `${tenantId}-r${i.toString().padStart(4, "0")}`;
    const level = 3 + Math.floor(rng() * 12);
    rules.set(id, {
      id,
      description: `Custom detection rule #${i + 1}`,
      level: severityFromLevel(level),
      group: [rand(rng, RULE_GROUPS), rand(rng, RULE_GROUPS)],
      enabled: rng() > 0.2,
      tenantId
    });
  }

  const ts: TenantState = { agents, alerts, vulns, fimEvents, rules };
  state.set(tenantId, ts);
  return ts;
}

// ---------- Public read API ----------

export interface TenantContext {
  id: string;
  name: string;
  tier: TenantSnapshot["tier"];
}

function ensureCtx(ctx: TenantContext): TenantState {
  return ensureTenantState(ctx.id, ctx.name, ctx.tier);
}

export function getTenantSnapshot(ctx: TenantContext): TenantSnapshot {
  const ts = ensureCtx(ctx);
  const agents = Array.from(ts.agents.values());
  const active = agents.filter(a => a.status === "active").length;
  const alerts24h = Array.from(ts.alerts.values()).filter(a => {
    return Date.parse(a.timestamp) > Date.now() - 24 * 3600_000;
  }).length;
  const openIncidents = Array.from(ts.alerts.values()).filter(a => !a.acknowledged).length;
  const cveCount = Array.from(ts.vulns.values()).filter(v => v.status === "open").length;
  const tierScore = TIER_SECURITY_BIAS[ctx.tier] ?? 0;
  const base = 60 + (active / Math.max(1, agents.length)) * 30 + tierScore;
  const securityScore = Math.max(0, Math.min(100, Math.round(base)));
  return {
    tenantId: ctx.id,
    name: ctx.name,
    tier: ctx.tier,
    securityScore,
    openIncidents,
    alerts24h,
    cveCount,
    agentCount: agents.length,
    activeAgentCount: active,
    lastSyncAt: new Date().toISOString()
  };
}

export function listAgents(ctx: TenantContext): Agent[] {
  return Array.from(ensureCtx(ctx).agents.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function listAlerts(ctx: TenantContext): Alert[] {
  return Array.from(ensureCtx(ctx).alerts.values()).sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
  );
}

export function listVulnerabilities(ctx: TenantContext): Vulnerability[] {
  return Array.from(ensureCtx(ctx).vulns.values()).sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
  );
}

export function listFimEvents(ctx: TenantContext): FimEvent[] {
  return Array.from(ensureCtx(ctx).fimEvents.values()).sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
  );
}

export function listRules(ctx: TenantContext): Rule[] {
  return Array.from(ensureCtx(ctx).rules.values());
}

export function listCompliance(ctx: TenantContext): ComplianceControl[] {
  const rng = rngFor(ctx.id + ":compliance");
  const out: ComplianceControl[] = [];
  for (const fw of COMPLIANCE_FRAMEWORKS) {
    for (let i = 0; i < 3; i++) {
      const r = rng();
      out.push({
        id: `${ctx.id}-c${fw.replace(/\s+/g, "")}${i}`,
        framework: fw,
        control: `Control ${fw.split(" ")[0]} ${i + 1}`,
        description: `${fw} control covering common security policy.`,
        status: r < 0.6 ? "pass" : r < 0.85 ? "fail" : "unknown",
        evidence: Math.floor(rng() * 200),
        tenantId: ctx.id
      });
    }
  }
  return out;
}

export function listThreatIntel(ctx: TenantContext): ThreatActor[] {
  const rng = rngFor(ctx.id + ":threat");
  return THREAT_NAMES.map((name, i) => ({
    id: `${ctx.id}-ta${i}`,
    name,
    origin: rand(rng, ORIGINS),
    targets: [rand(rng, TARGETS), rand(rng, TARGETS)],
    lastSeen: new Date(Date.now() - Math.floor(rng() * 3600_000 * 24 * 30)).toISOString(),
    severity: severityFromLevel(3 + Math.floor(rng() * 12)),
    description: `Threat actor ${name} known for targeting ${rand(rng, TARGETS)} organizations.`,
    tenantId: ctx.id
  }));
}

export function listMitre(ctx: TenantContext): MitreTactic[] {
  const rng = rngFor(ctx.id + ":mitre");
  return MITRE_TACTICS.map(t => {
    const detected = Math.floor(rng() * 5);
    const total = 4 + Math.floor(rng() * 6);
    return {
      id: t.id,
      name: t.name,
      detected,
      total,
      techniques: Array.from({ length: 3 }).map((_, i) => ({
        id: `${t.id}.${100 + i * 10 + Math.floor(rng() * 9)}`,
        name: `Technique ${i + 1}`,
        detected: rng() < 0.4
      })),
      tenantId: ctx.id
    };
  });
}

export function listLogs(ctx: TenantContext, limit = 100): LogLine[] {
  const rng = rngFor(ctx.id + ":logs:" + Math.floor(Date.now() / 60_000));
  const ts = ensureCtx(ctx);
  const agents = Array.from(ts.agents.values());
  const out: LogLine[] = [];
  for (let i = 0; i < limit; i++) {
    const agent = agents[Math.floor(rng() * agents.length)]!;
    const level = 1 + Math.floor(rng() * 14);
    out.push({
      id: `${ctx.id}-log${Date.now()}-${i}`,
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      level: severityFromLevel(level),
      agentId: agent.id,
      message: rand(rng, [
        "agent.status=ok",
        "syscheck.path=/etc/passwd changed",
        "wazuh-modulesd:vulnerability-scan ok",
        "rule.91042 fired (level=8)",
        "auth: failed login from 10.0.0.5",
        "agent.disconnected: heartbeat lost"
      ]),
      tenantId: ctx.id
    });
  }
  return out;
}

// ---------- Internal: direct state access for the action dispatcher ----------

export function _getState(ctx: TenantContext): TenantState {
  return ensureCtx(ctx);
}
