// Server-only proxy to the MergeIT-WazuhConnector.
//
// When CONNECTOR_BASE_URL is set, each /api/* route forwards to the connector.
// When it's NOT set (dev mode), every route returns empty/noop data so the
// dashboard UI renders without a live backend — pages show "no data" states
// instead of error banners.
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
 * Dev-mode fallback: returns a "no connector" response that the frontend
 * treats as empty data rather than an error. Each path gets the right shape
 * so the dashboard pages don't crash.
 */
function devFallback(path: string): NextResponse {
  // Map connector paths to the shape the dashboard expects
  const fallbacks: Record<string, unknown> = {
    "/stats/agents":     { total_agents: 0 },
    "/agents":           { data: { affected_items: [], total_affected_items: 0 } },
    "/alerts":           { critical: [], high: [], warning: [], total: 0 },
    "/vulnerability":    { data: { affected_items: [], total_affected_items: 0 } },
    "/compliance":       { data: { affected_items: [], total_affected_items: 0 } },
    "/experimental/syscheck": { data: { affected_items: [], total_affected_items: 0 } },
    "/rules":            { data: { affected_items: [], total_affected_items: 0 } },
    "/manager/logs":     { data: { affected_items: [], total_affected_items: 0 } },
    "/manager/status":   { data: { affected_items: [] } },
    "/cluster/healthcheck": { data: { affected_items: [] } },
    "/tenants":          { tenants: [] },
  };

  // Exact match first
  if (fallbacks[path]) {
    return NextResponse.json(fallbacks[path]);
  }

  // Prefix match for parametric paths like /compliance/pci-dss
  for (const [k, v] of Object.entries(fallbacks)) {
    if (path.startsWith(k)) return NextResponse.json(v);
  }

  return NextResponse.json({ data: { affected_items: [] } });
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

  // Dev mode — no connector, return empty data
  if (!isConnectorConfigured()) {
    return devFallback(opts.path);
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
