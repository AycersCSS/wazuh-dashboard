/** Shared normalizers so API routes never hand partial/wrong shapes to the UI. */

export function asString(v: unknown, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

export function asNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}

export function severityBucketFromLabel(v: unknown): "critical" | "high" | "medium" | "low" | "info" {
  const s = asString(v, "info").toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "medium" || s === "warning") return "medium";
  if (s === "low") return "low";
  return "info";
}

export function normalizeAgent(raw: unknown): {
  id: string;
  name: string;
  ip: string;
  status: string;
  version: string;
  lastKeepAlive: string;
  region: string;
  manager: string;
  os: { name: string; version: string; arch: string };
  group: string[];
} {
  const a = (raw ?? {}) as Record<string, unknown>;
  const osRaw = (a.os ?? {}) as Record<string, unknown>;
  const status = asString(a.status, "never_connected");
  return {
    id: asString(a.id, "000"),
    name: asString(a.name, asString(a.id, "unknown")),
    ip: asString(a.ip, ""),
    status,
    version: asString(a.version, ""),
    lastKeepAlive: asString(a.lastKeepAlive ?? a.last_keep_alive, new Date().toISOString()),
    region: asString(a.region, "—"),
    manager: asString(a.manager, "—"),
    os: {
      name: asString(osRaw.name, "Unknown"),
      version: asString(osRaw.version, ""),
      arch: asString(osRaw.arch, "x86_64"),
    },
    group: asStringArray(a.group ?? a.groups).length
      ? asStringArray(a.group ?? a.groups)
      : ["default"],
  };
}

export function normalizeAlert(raw: unknown, bucket?: string): Record<string, unknown> {
  const a = (raw ?? {}) as Record<string, unknown>;
  const rule = (a.rule ?? {}) as Record<string, unknown>;
  const agent = (a.agent ?? {}) as Record<string, unknown>;
  return {
    id: asString(a.id, `alert-${Date.now()}`),
    timestamp: asString(a.timestamp, new Date().toISOString()),
    rule: {
      id: asString(rule.id, ""),
      level: asNumber(rule.level, 0),
      description: asString(rule.description, ""),
      groups: asStringArray(rule.groups),
      mitre: rule.mitre ?? undefined,
    },
    agent: {
      id: asString(agent.id, ""),
      name: asString(agent.name, "unknown"),
      ip: asString(agent.ip, ""),
    },
    location: asString(a.location, ""),
    data: a.data,
    full_log: a.full_log,
    ...(bucket ? { _bucket: bucket } : {}),
  };
}

export function normalizeVuln(raw: unknown): Record<string, unknown> {
  const v = (raw ?? {}) as Record<string, unknown>;
  return {
    cve: asString(v.cve ?? v.name, "CVE-UNKNOWN"),
    title: asString(v.title, "Untitled"),
    severity: severityBucketFromLabel(v.severity),
    cvss: asNumber(v.cvss, 0),
    package: asString(v.package, "—"),
    version: asString(v.version, ""),
    fixedVersion: v.fixedVersion ?? v.fixed_version ?? undefined,
    agentCount: asNumber(v.agentCount ?? v.agent_count, 0),
    publishedAt: asString(v.publishedAt ?? v.published, new Date().toISOString()),
  };
}

export function normalizeFim(raw: unknown): Record<string, unknown> {
  const e = (raw ?? {}) as Record<string, unknown>;
  const agent = e.agent;
  const agentName =
    typeof agent === "string"
      ? agent
      : asString((agent as Record<string, unknown> | undefined)?.name, "unknown");
  const actionRaw = asString(e.action, "modified").toLowerCase();
  const action =
    actionRaw === "added" || actionRaw === "deleted" || actionRaw === "modified"
      ? actionRaw
      : "modified";
  return {
    id: asString(e.id ?? e.path, `fim-${Date.now()}`),
    timestamp: asString(e.timestamp ?? e.mtime, new Date().toISOString()),
    agent: agentName,
    path: asString(e.path, ""),
    action,
    user: asString(e.user ?? e.uname, "—"),
    size: asNumber(e.size, 0),
  };
}

export function normalizeRule(raw: unknown): Record<string, unknown> {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: asString(r.id, "0"),
    description: asString(r.description, ""),
    level: asNumber(r.level, 0),
    groups: asStringArray(r.groups),
    status: asString(r.status, "enabled") === "disabled" ? "disabled" : "enabled",
    modified: asString(r.modified ?? r.timestamp, new Date().toISOString()),
    hits24h: asNumber(r.hits24h ?? r.fired, 0),
  };
}

export function normalizeLog(raw: unknown, index = 0): Record<string, unknown> {
  const e = (raw ?? {}) as Record<string, unknown>;
  const level = asString(e.severity ?? e.level, "info").toLowerCase();
  let severity: string = "info";
  if (level === "error" || level === "critical" || level === "high") severity = level === "error" ? "high" : level;
  else if (level === "warning" || level === "medium") severity = "medium";
  else if (level === "low") severity = "low";
  return {
    id: asString(e.id, `log-${index}`),
    timestamp: asString(e.timestamp, new Date().toISOString()),
    source: asString(e.source ?? e.component, "manager"),
    agent: asString(e.agent, "—"),
    severity,
    message: asString(e.message, ""),
  };
}

export function normalizeThreatActor(raw: unknown): Record<string, unknown> {
  const a = (raw ?? {}) as Record<string, unknown>;
  return {
    id: asString(a.id, `actor-${Date.now()}`),
    name: asString(a.name, "Unknown"),
    origin: asString(a.origin, "—"),
    targetSectors: asStringArray(a.targetSectors),
    ttps: asStringArray(a.ttps),
    observed24h: asNumber(a.observed24h, 0),
  };
}

export function normalizeIntegration(raw: unknown, id: string): Record<string, unknown> {
  const d = (raw ?? {}) as Record<string, unknown>;
  const recentRaw = Array.isArray(d.recent) ? d.recent : [];
  const kpisRaw = Array.isArray(d.kpis) ? d.kpis : [];
  return {
    id: asString(d.id, id),
    name: asString(d.name, id),
    vendor: asString(d.vendor, "—"),
    status: asString(d.status, "Disconnected") as "Connected" | "Degraded" | "Disconnected",
    lastSyncAt: asString(d.lastSyncAt, new Date().toISOString()),
    kpis: kpisRaw.map((k) => {
      const item = (k ?? {}) as Record<string, unknown>;
      return {
        label: asString(item.label, "—"),
        value: asString(item.value, "—"),
        trend: item.trend,
      };
    }),
    recent: recentRaw.map((e, i) => {
      const item = (e ?? {}) as Record<string, unknown>;
      return {
        id: asString(item.id, `evt-${i}`),
        time: asString(item.time ?? item.timestamp, "—"),
        severity: severityBucketFromLabel(item.severity),
        tenant: asString(item.tenant, "—"),
        primary: asString(item.primary ?? item.user ?? item.title, "—"),
        description: asString(item.description ?? item.title, ""),
        wazuhRuleId: asString(item.wazuhRuleId, "—"),
      };
    }),
    healthMetrics: Array.isArray(d.healthMetrics) ? d.healthMetrics : [],
  };
}

const FW_LABEL: Record<string, string> = {
  pci_dss: "PCI DSS",
  hipaa: "HIPAA",
  gdpr: "GDPR",
  "nist_800-53": "NIST 800-53",
  iso_27001: "ISO 27001",
};

export function normalizeCompliance(raw: unknown, frameworkSlug: string): {
  framework: string;
  controls: Record<string, unknown>[];
} {
  const body = (raw ?? {}) as Record<string, unknown>;
  const fw =
    asString(body.framework, "") ||
    FW_LABEL[frameworkSlug] ||
    frameworkSlug ||
    "PCI DSS";
  if (Array.isArray(body.controls)) {
    return {
      framework: fw,
      controls: body.controls.map((c) => normalizeControl(c, fw)),
    };
  }
  const data = (body.data ?? {}) as Record<string, unknown>;
  const items = Array.isArray(data.affected_items) ? data.affected_items : [];
  return {
    framework: fw,
    controls: items.map((c) => normalizeControl(c, fw)),
  };
}

function normalizeControl(raw: unknown, framework: string): Record<string, unknown> {
  const c = (raw ?? {}) as Record<string, unknown>;
  const status = asString(c.status, "").toLowerCase();
  const pass = asNumber(c.pass, status === "passed" ? 1 : 0);
  const fail = asNumber(c.fail, status === "failed" ? 1 : 0);
  const total = asNumber(c.total, Math.max(pass + fail, 1));
  return {
    framework,
    control: asString(c.control ?? c.requirement ?? c.id, "—"),
    title: asString(c.title ?? c.description, ""),
    pass,
    fail,
    total,
  };
}
