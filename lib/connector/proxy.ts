// Server-only proxy to the MergeIT-WazuhConnector.
//
// Every dashboard /api/* route is a thin forwarder. This helper handles:
//   1. Reading the customer JWT from the connector_jwt cookie.
//   2. Building the upstream URL from CONNECTOR_BASE_URL + path.
//   3. Forwarding the Authorization header and any whitelisted query params.
//   4. Returning the upstream response with the same status code and JSON body.
//
// 401 from the connector means the customer JWT is invalid/expired — we clear
// the cookie so the user is forced to re-auth. Other non-2xx responses are
// passed through unchanged so the dashboard can render specific error states
// (e.g. 503 "not_connected" from /integrations/:id).

import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = process.env.CONNECTOR_JWT_COOKIE ?? "connector_jwt";
const BASE = process.env.CONNECTOR_BASE_URL;
const isProd = process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// Startup SSRF guard — assert CONNECTOR_BASE_URL is a safe internal origin.
// Evaluated once at module load time so misconfiguration fails loudly during
// the Next.js build / cold start rather than silently at request time.
// ---------------------------------------------------------------------------
function getBase(): string {
  if (!BASE) {
    throw new Error("CONNECTOR_BASE_URL is not set");
  }
  let parsed: URL;
  try {
    parsed = new URL(BASE);
  } catch {
    throw new Error(`CONNECTOR_BASE_URL is not a valid URL: ${BASE}`);
  }
  // Only allow http/https — no file://, ftp://, etc.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`CONNECTOR_BASE_URL must use http or https, got: ${parsed.protocol}`);
  }
  return BASE.replace(/\/+$/, "");
}

const VALIDATED_BASE = getBase();

export function isAuthenticated(): boolean {
  return !!cookies().get(COOKIE_NAME)?.value;
}

export interface ProxyOptions {
  /** Connector path, e.g. "/agents". Must start with "/". */
  path: string;
  /** Allowed query-param keys for this route. Others are dropped. */
  allowedQuery?: Set<string>;
  /** HTTP method. Defaults to GET. */
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** JSON body to forward. Only used for non-GET. */
  body?: unknown;
  /** Override init headers (added on top of the bearer). */
  headers?: Record<string, string>;
  /**
   * Optional response transform. The connector returns the Wazuh body shape
   * ({data: {affected_items, total_affected_items}}); the dashboard consumes
   * a flatter shape ({agents, total}). Use this to map the two until the
   * connector normalizes itself.
   */
  transform?: (upstream: unknown) => unknown;
}

/**
 * Forward the current request to the connector. Returns a NextResponse with
 * the upstream status and body. Sets a "x-connector-error" header on non-2xx
 * for easier client-side logging, but otherwise passes the body through.
 */
export async function proxyConnector(
  req: Request,
  opts: ProxyOptions
): Promise<Response> {
  // Guard against path traversal / SSRF: path must be a simple absolute path.
  if (!opts.path.startsWith("/") || opts.path.includes("..") || opts.path.includes("//")) {
    console.error("[proxy] rejected unsafe path:", opts.path);
    return NextResponse.json(
      { ok: false, error: "bad_gateway" },
      { status: 502 }
    );
  }

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
  const upstream = `${VALIDATED_BASE}${opts.path}${qs ? `?${qs}` : ""}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers ?? {})
  };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const init: RequestInit = {
    method: opts.method ?? "GET",
    headers,
    cache: "no-store"
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

  // Clear the cookie on 401 so the user is forced to re-auth.
  // Use the same flags as session.ts to properly expire the cookie.
  if (res.status === 401 && jwt) {
    try {
      cookieStore.set({
        name: COOKIE_NAME,
        value: "",
        httpOnly: true,
        sameSite: "strict",
        secure: isProd,
        path: "/",
        maxAge: 0
      });
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
      return NextResponse.json(
        { ok: false, error: "transform_failed" },
        { status: 502 }
      );
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
