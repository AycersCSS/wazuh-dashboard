// Server-only proxy to the MergeIT-WazuhConnector.
//
  // When CONNECTOR_BASE_URL is set, each /api/* route forwards to the connector.
  // When it's NOT set (dev mode), every route returns dynamic test data that
  // refreshes uniquely on every request — perfect for a working demo product.
  //
  // Credential safety: The connector JWT is held in an httpOnly cookie; the
  // browser never sees it.

import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = process.env.CONNECTOR_JWT_COOKIE ?? "connector_jwt";
const BASE = process.env.CONNECTOR_BASE_URL;

function isConnectorConfigured(): boolean {
  return !!BASE;
}

export function isAuthenticated(): boolean {
  return !!cookies().get(COOKIE_NAME)?.value;
}

/**
 * Generates unique dynamic test data that changes on every request.
 * Uses timestamp + random suffix to ensure uniqueness per request.
 */
function generateTestData(path: string): unknown {
  const now = Date.now();
  const uniqueId = `${now}-${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date(now).toISOString();
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  // Unique identifiers that change every request
  const testSuffix = `test-${uniqueId}`;
  const testNumber = Math.floor(Math.random() * 1000) + 1;
  const testVariant = `test${testNumber}-${testSuffix}`;

  const baseAgents = Array.from({ length: 5 }, (_, i) => ({
    id: `00${i + 1}`,
    name: `agent-${testVariant}-${i + 1}`,
    ip: `192.168.1.${100 + i}`,
    status: i % 3 === 0 ? "active" : i % 3 === 1 ? "disconnected" : "pending",
    version: "Wazuh v4.9.0",
    os: { name: "Windows 11", version: "23H2", arch: "x86_64" },
    lastKeepAlive: ago(Math.random() * 3600000),
    group: i % 2 === 0 ? ["default", "windows"] : ["default"],
    region: "eu-west-1",
    manager: "wazuh-manager",
  }));

  const baseAlerts = Array.from({ length: 8 }, (_, i) => ({
    id: `alert-${testVariant}-${i + 1}`,
    timestamp: ago(Math.random() * 86400000),
    rule: {
      id: String(100000 + i),
      level: i % 3 === 0 ? 14 : i % 3 === 1 ? 12 : 7,
      description: `Test alert ${testVariant}-${i + 1}`,
      groups: ["test", "syscheck"],
      mitre: i % 2 === 0 ? { id: "T1059", tactic: "Execution", technique: "Command and Scripting Interpreter" } : undefined,
    },
    agent: {
      id: `00${(i % 5) + 1}`,
      name: `agent-${testVariant}-${(i % 5) + 1}`,
      ip: `192.168.1.${100 + (i % 5)}`,
    },
    data: { srcip: `10.0.0.${i + 1}`, dstip: `192.168.1.${50 + i}` },
    location: `/var/log/secure`,
  }));

  const baseVulns = Array.from({ length: 6 }, (_, i) => ({
    cve: `CVE-2024-${10000 + i + testNumber}`,
    title: `Test Vulnerability ${testVariant}-${i + 1}`,
    severity: ["critical", "high", "medium", "low"][i % 4],
    cvss: 9 - (i % 4) * 1.5,
    package: `test-package-${testVariant}-${i + 1}`,
    version: `1.${i}.${testNumber}`,
    fixedVersion: `1.${i}.${testNumber + 1}`,
    agentCount: 1 + (i % 5),
    publishedAt: ago(Math.random() * 86400000 * 30),
  }));

  const fallbacks: Record<string, unknown> = {
    "/stats/agents": {
      total_agents: 47 + (testNumber % 10),
      active: 38 + (testNumber % 5),
      disconnected: 5 + (testNumber % 3),
      pending: 3 + (testNumber % 2),
      never_connected: 1,
      lastRefreshed: timestamp,
      testRun: testVariant,
    },

    "/agents": {
      data: {
        affected_items: baseAgents,
        total_affected_items: baseAgents.length,
      },
      testRun: testVariant,
      timestamp,
    },

    "/agents/status-count": {
      active: 38 + (testNumber % 5),
      disconnected: 5 + (testNumber % 3),
      pending: 3 + (testNumber % 2),
      never_connected: 1,
      testRun: testVariant,
      timestamp,
    },

    "/alerts": {
      critical: baseAlerts.filter(a => a.rule.level >= 12),
      high: baseAlerts.filter(a => a.rule.level >= 7 && a.rule.level < 12),
      warning: baseAlerts.filter(a => a.rule.level >= 4 && a.rule.level < 7),
      total: baseAlerts.length,
      testRun: testVariant,
      timestamp,
    },

    "/vulnerability": {
      data: {
        affected_items: baseVulns,
        total_affected_items: baseVulns.length,
      },
      testRun: testVariant,
      timestamp,
    },

    "/vulnerabilities": {
      data: {
        affected_items: baseVulns,
        total_affected_items: baseVulns.length,
      },
      testRun: testVariant,
      timestamp,
    },

    "/compliance": {
      data: {
        affected_items: Array.from({ length: 4 }, (_, i) => ({
          id: `compliance-${testVariant}-${i + 1}`,
          title: `Test Compliance Check ${testVariant}-${i + 1}`,
          status: i % 2 === 0 ? "passed" : "failed",
          description: `Compliance test for ${testVariant} item ${i + 1}`,
          requirement: `REQ-${testNumber}-${i + 1}`,
          control: `CTRL-${i + 1}`,
          pass: i % 2 === 0 ? 8 : 3,
          fail: i % 2 === 0 ? 0 : 2,
          total: i % 2 === 0 ? 8 : 5,
        })),
        total_affected_items: 4,
      },
      testRun: testVariant,
      timestamp,
    },

    "/fim": {
      data: {
        affected_items: Array.from({ length: 5 }, (_, i) => ({
          id: `syscheck-${testVariant}-${i + 1}`,
          path: `C:\\Windows\\System32\\test-${testVariant}-${i + 1}.dll`,
          type: "file",
          action: i % 3 === 0 ? "modified" : i % 3 === 1 ? "added" : "deleted",
          user: i % 2 === 0 ? "SYSTEM" : "Administrator",
          size: 1024 * (i + 1) * 50,
          timestamp: ago(Math.random() * 86400000),
          mtime: ago(Math.random() * 86400000),
          agent: { id: `00${(i % 5) + 1}`, name: `agent-${testVariant}-${(i % 5) + 1}` },
        })),
        total_affected_items: 5,
      },
      testRun: testVariant,
      timestamp,
    },

    "/experimental/syscheck": {
      data: {
        affected_items: Array.from({ length: 3 }, (_, i) => ({
          id: `syscheck-${testVariant}-${i + 1}`,
          path: `C:\\Windows\\System32\\test-${testVariant}-${i + 1}.dll`,
          type: "file",
          action: "modified",
          user: "SYSTEM",
          size: 4096,
          timestamp: ago(Math.random() * 86400000),
          md5: `md5-${testVariant}-${i + 1}`,
          sha1: `sha1-${testVariant}-${i + 1}`,
          sha256: `sha256-${testVariant}-${i + 1}`,
          mtime: ago(Math.random() * 86400000),
          agent: { id: `agent-${testVariant}-${(i % 5) + 1}`, name: `agent-${testVariant}-${(i % 5) + 1}` },
        })),
        total_affected_items: 3,
      },
      testRun: testVariant,
      timestamp,
    },

    "/rules": {
      data: {
        affected_items: Array.from({ length: 10 }, (_, i) => ({
          id: String(100000 + i),
          level: (i % 15) + 1,
          description: `Test rule ${testVariant}-${i + 1}`,
          groups: ["test", "syscheck"],
          status: i % 4 === 0 ? "disabled" : "enabled",
          modified: ago(i * 3600000),
          hits24h: (i * 17) % 200,
        })),
        total_affected_items: 10,
      },
      testRun: testVariant,
      timestamp,
    },

    "/logs": {
      data: {
        affected_items: Array.from({ length: 20 }, (_, i) => ({
          id: `log-${testVariant}-${i + 1}`,
          timestamp: ago(i * 60000),
          level: i % 4 === 0 ? "error" : i % 4 === 1 ? "warning" : "info",
          severity: i % 4 === 0 ? "high" : i % 4 === 1 ? "medium" : "info",
          message: `Test log entry ${testVariant}-${i + 1}: System check completed`,
          component: "wazuh-manager",
          source: "wazuh-manager",
          agent: "manager",
        })),
        total_affected_items: 20,
      },
      testRun: testVariant,
      timestamp,
    },

    "/manager/logs": {
      data: {
        affected_items: Array.from({ length: 20 }, (_, i) => ({
          id: `log-${testVariant}-${i + 1}`,
          timestamp: ago(i * 60000),
          level: i % 4 === 0 ? "error" : i % 4 === 1 ? "warning" : "info",
          severity: i % 4 === 0 ? "high" : i % 4 === 1 ? "medium" : "info",
          message: `Test log entry ${testVariant}-${i + 1}: System check completed`,
          component: "wazuh-manager",
          source: "wazuh-manager",
          agent: "manager",
        })),
        total_affected_items: 20,
      },
      testRun: testVariant,
      timestamp,
    },

    "/threat-actors": {
      actors: [
        {
          id: `actor-${testVariant}-1`,
          name: "APT Demo-1",
          origin: "Unknown",
          targetSectors: ["Finance", "Healthcare"],
          ttps: ["T1059", "T1078"],
          observed24h: 5 + (testNumber % 5),
        },
        {
          id: `actor-${testVariant}-2`,
          name: "APT Demo-2",
          origin: "Global",
          targetSectors: ["Technology"],
          ttps: ["T1566", "T1190"],
          observed24h: 2 + (testNumber % 3),
        },
      ],
      total: 2,
      testRun: testVariant,
      timestamp,
    },

    "/manager/status": {
      data: {
        affected_items: [
          { name: "wazuh-manager", status: "running", uptime: 86400 * (testNumber % 7 + 1), testRun: testVariant },
          { name: "wazuh-indexer", status: "running", uptime: 86400 * (testNumber % 7 + 1), testRun: testVariant },
          { name: "wazuh-dashboard", status: "running", uptime: 86400 * (testNumber % 7 + 1), testRun: testVariant },
        ],
      },
      testRun: testVariant,
      timestamp,
    },

    "/manager": {
      manager: `wazuh-manager-${testVariant}`,
      workers: { active: 4 + (testNumber % 3), total: 4 + (testNumber % 3) },
      indexer: { name: `wazuh-indexer-${testVariant}`, version: "4.9.0" },
      apiLatencyP95Ms: 42 + (testNumber % 50),
      testRun: testVariant,
      timestamp,
    },

    "/cluster/healthcheck": {
      data: {
        affected_items: [
          { node: `node-1-${testVariant}`, status: "healthy", testRun: testVariant },
          { node: `node-2-${testVariant}`, status: "healthy", testRun: testVariant },
        ],
      },
      testRun: testVariant,
      timestamp,
    },

    "/tenants": {
      tenants: ["acme-corp", "globex-inc", "initech", "stark-industries"],
      testRun: testVariant,
      timestamp,
    },
  };

  // Integration endpoints — exact match per known id with unique data per request
  const integrationDefaults: Record<string, unknown> = {
    "microsoft-365": {
      id: "microsoft-365",
      name: "Microsoft 365",
      vendor: "Microsoft Graph API",
      status: "Connected",
      lastSyncAt: ago(90_000),
      kpis: [
        { label: "Users Synced", value: `${150 + testNumber}`, trend: "up" },
        { label: "Sign-ins (24h)", value: `${1200 + testNumber * 10}`, trend: "up" },
        { label: "Risky Sign-ins", value: `${testNumber % 5}`, trend: "down" },
      ],
      recent: Array.from({ length: 3 }, (_, i) => ({
        id: `ms365-${testVariant}-${i + 1}`,
        type: "signin",
        title: `Test Sign-in ${testVariant}-${i + 1}`,
        time: ago((i + 1) * 3600000),
        timestamp: ago((i + 1) * 3600000),
        severity: "info",
        tenant: "acme-corp",
        primary: `user${i + 1}@acme.example`,
        description: `Test Sign-in ${testVariant}-${i + 1}`,
        wazuhRuleId: String(91000 + i),
      })),
      healthMetrics: [{ label: "Status", value: `Demo mode - ${testVariant}`, tone: "ok" }],
      testRun: testVariant,
      timestamp,
    },
    "ninjaone": {
      id: "ninjaone",
      name: "NinjaOne",
      vendor: "NinjaOne RMM API",
      status: "Connected",
      lastSyncAt: ago(240_000),
      kpis: [
        { label: "Devices", value: `${200 + testNumber}`, trend: "up" },
        { label: "Online", value: `${180 + testNumber}`, trend: "up" },
        { label: "Alerts (24h)", value: `${testNumber % 10}`, trend: "down" },
      ],
      recent: Array.from({ length: 3 }, (_, i) => ({
        id: `ninja-${testVariant}-${i + 1}`,
        type: "device",
        title: `NinjaOne Device ${testVariant}-${i + 1}`,
        timestamp: ago((i + 1) * 7200000),
        severity: "info",
      })),
      healthMetrics: [{ label: "Status", value: `Demo mode - ${testVariant}`, tone: "ok" }],
      testRun: testVariant,
      timestamp,
    },
    "bitdefender": {
      id: "bitdefender",
      name: "Bitdefender",
      vendor: "GravityZone API",
      status: "Degraded",
      lastSyncAt: ago(720_000),
      kpis: [
        { label: "Endpoints", value: `${300 + testNumber}`, trend: "stable" },
        { label: "Infections (24h)", value: `${testNumber % 3}`, trend: "up" },
        { label: "Policy Compliance", value: `${95 + testNumber % 5}%`, trend: "stable" },
      ],
      recent: Array.from({ length: 3 }, (_, i) => ({
        id: `bd-${testVariant}-${i + 1}`,
        type: "threat",
        title: `Bitdefender Detection ${testVariant}-${i + 1}`,
        timestamp: ago((i + 1) * 1800000),
        severity: "high",
      })),
      healthMetrics: [{ label: "Status", value: `Demo mode - ${testVariant}`, tone: "warn" }],
      testRun: testVariant,
      timestamp,
    },
    "cyber-essentials": {
      id: "cyber-essentials",
      name: "Cyber Essentials Plus",
      vendor: "MergeIT evidence pack",
      status: "Connected",
      lastSyncAt: ago(1_320_000),
      kpis: [
        { label: "Controls Passed", value: `${45 + testNumber % 5}`, trend: "up" },
        { label: "Controls Failed", value: `${testNumber % 3}`, trend: "down" },
        { label: "Evidence Items", value: `${120 + testNumber}`, trend: "up" },
      ],
      recent: Array.from({ length: 3 }, (_, i) => ({
        id: `ce-${testVariant}-${i + 1}`,
        type: "evidence",
        title: `Evidence Pack ${testVariant}-${i + 1}`,
        timestamp: ago((i + 1) * 3600000),
        severity: "info",
      })),
      healthMetrics: [{ label: "Status", value: `Demo mode - ${testVariant}`, tone: "ok" }],
      testRun: testVariant,
      timestamp,
    },
    "customer-portal": {
      id: "customer-portal",
      name: "Customer Portal (beta)",
      vendor: "MergeIT portal API",
      status: "Connected",
      lastSyncAt: ago(60_000),
      kpis: [
        { label: "Tenants", value: `${4 + testNumber % 3}`, trend: "up" },
        { label: "API Calls (1h)", value: `${500 + testNumber * 10}`, trend: "up" },
        { label: "Errors (1h)", value: `${testNumber % 5}`, trend: "down" },
      ],
      recent: Array.from({ length: 3 }, (_, i) => ({
        id: `portal-${testVariant}-${i + 1}`,
        type: "api",
        title: `Portal API Call ${testVariant}-${i + 1}`,
        timestamp: ago((i + 1) * 120000),
        severity: "info",
      })),
      healthMetrics: [{ label: "Status", value: `Demo mode - ${testVariant}`, tone: "ok" }],
      testRun: testVariant,
      timestamp,
    },
  };

  // Exact match first (including integration paths)
  if (fallbacks[path]) {
    return fallbacks[path];
  }
  const intMatch = path.match(/^\/integrations\/(.+)$/);
  if (intMatch && integrationDefaults[intMatch[1]]) {
    return integrationDefaults[intMatch[1]];
  }

  // Prefix match for parametric paths like /compliance/pci-dss
  for (const [k, v] of Object.entries(fallbacks)) {
    if (path.startsWith(k)) return v;
  }

  return { data: { affected_items: [] }, testRun: testVariant, timestamp };
}

/**
 * Dev-mode fallback: returns dynamic test data that refreshes uniquely on every request.
 * Each path gets the right shape so the dashboard pages don't crash, but with unique data every time.
 */
function devFallback(path: string): NextResponse {
  return NextResponse.json(generateTestData(path), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "X-Test-Run": `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
  });
}

export interface ProxyOptions {
  path: string;
  allowedQuery?: Set<string>;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  transform?: (upstream: unknown) => unknown;
}

export async function proxyConnector(
  req: Request,
  opts: ProxyOptions
): Promise<Response> {
  if (!opts.path.startsWith("/") || opts.path.includes("..") || opts.path.includes("//")) {
    console.error("[proxy] rejected unsafe path:", opts.path);
    return NextResponse.json({ ok: false, error: "bad_gateway" }, { status: 502 });
  }

  // Dev mode — no connector, return dynamic test data with transform applied
  if (!isConnectorConfigured()) {
    const fallback = devFallback(opts.path);
    if (opts.transform) {
      // Apply transform to the fallback data
      return fallback.json().then((body) => {
        const transformed = opts.transform!(body);
        return NextResponse.json(transformed, {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "X-Test-Run": `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          },
        });
      });
    }
    return fallback;
  }

  const base = BASE!.replace(/\/+$/, "");
  const cookieStore = cookies();
  const jwt = cookieStore.get(COOKIE_NAME)?.value;

  const url = new URL(req.url);
  const params = new URLSearchParams();
  if (opts.allowedQuery) {
    for (const [k, v] of url.searchParams.entries()) {
      if (opts.allowedQuery.has(k)) params.set(k, v);
    }
  }
  const qs = params.toString();
  const upstream = `${base}${opts.path}${qs ? `?${qs}` : ""}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers ?? {}),
  };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const init: RequestInit = {
    method: opts.method ?? "GET",
    headers,
    cache: "no-store",
  };
  if (opts.body !== undefined) {
    init.body = typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(upstream, init);
  } catch (e) {
    console.error("[proxy] connector unreachable:", (e as Error).message);
    return NextResponse.json(
      { ok: false, error: "connector_unreachable" },
      { status: 502 }
    );
  }

  if (res.status === 401 && jwt) {
    try {
      cookieStore.set({ name: COOKIE_NAME, value: "", maxAge: 0, path: "/" });
    } catch {
      // best-effort
    }
  }

  const text = await res.text();
  let body = text ? safeJson(text) : null;
  if (opts.transform) {
    try {
      body = opts.transform(body);
    } catch (e) {
      console.error("[proxy] transform failed:", (e as Error).message);
      return NextResponse.json({ ok: false, error: "transform_failed" }, { status: 502 });
    }
  }
  return NextResponse.json(body, { status: res.status });
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    console.error("[proxy] connector returned non-JSON, length:", s.length);
    return { ok: false, error: "connector_returned_non_json" };
  }
}
