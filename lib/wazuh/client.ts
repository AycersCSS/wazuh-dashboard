// Server-only fetch wrapper for the upstream Wazuh API.
// Reads the JWT from the httpOnly cookie (same one the MergeIT-WazuhConnector
// issues), adds Authorization, forwards. Throws WazuhError on non-2xx.
// The browser never imports this file.
//
// WAZUH_API_URL is the upstream Wazuh manager (e.g. https://wazuh:55000).
// Auth: Wazuh's public API uses JWT bearer tokens. The connector issues the
// same token (so the same cookie works for both layers), and we forward it
// as-is.

import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = process.env.CONNECTOR_JWT_COOKIE ?? "connector_jwt";

export class WazuhError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Wazuh error ${status}: ${body}`);
    this.name = "WazuhError";
    this.status = status;
    this.body = body;
  }
}

interface FetchOptions {
  /** Wazuh path under /api/v1 (or whatever base prefix the manager uses). */
  path: string;
  /** Pre-built query string, e.g. "?limit=200&status=active". */
  query?: string;
  /** Override init (method/headers/body). */
  init?: RequestInit;
  /**
   * For local-test tokens: skip the upstream call and throw a 503 so the
   * proxy route returns the same "endpoint not ready" shape it would for a
   * real backend gap. The user can browse the dashboard with mocks instead.
   */
  whenLocalTest?: "fallback-empty" | "throw";
}

export async function wazuhFetch<T>(opts: FetchOptions): Promise<T> {
  const base = process.env.WAZUH_API_URL;
  if (!base) {
    throw new WazuhError(0, "WAZUH_API_URL not set");
  }

  const cookieStore = cookies();
  const jwt = cookieStore.get(COOKIE_NAME)?.value;

  // Local-test token — there is no real upstream. Callers either want a
  // graceful empty result (default for read paths) or a 503 (default for
  // mutating paths, since we don't want to silently drop a write).
  if (jwt && jwt.startsWith("local-test.")) {
    if (opts.whenLocalTest === "throw") {
      throw new WazuhError(503, "local-test token cannot reach upstream Wazuh");
    }
    throw new WazuhError(503, "wazuh_unavailable_local_test");
  }

  const url = `${base}${opts.path}${opts.query ?? ""}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.init?.headers as Record<string, string>) ?? {}),
  };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const res = await fetch(url, { ...opts.init, headers });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 && jwt) {
      // Real connector-issued token rejected by Wazuh — clear it so the
      // user is forced to re-auth. Leave local-test tokens alone.
      if (!jwt.startsWith("local-test.")) {
        try {
          cookieStore.set({ name: COOKIE_NAME, value: "", maxAge: 0, path: "/" });
        } catch {
          // best-effort
        }
      }
    }
    throw new WazuhError(res.status, body);
  }

  return res.json() as Promise<T>;
}

/**
 * Build a safe query string from a base URL and a Record of params.
 * Whitelisted keys only — used by every proxy route below to avoid passing
 * arbitrary query keys upstream.
 */
export function safeQuery(
  source: URLSearchParams | Record<string, string | undefined>,
  allow: Set<string>
): string {
  const qs = new URLSearchParams();
  if (source instanceof URLSearchParams) {
    for (const [k, v] of source.entries()) {
      if (allow.has(k)) qs.set(k, v);
    }
  } else {
    for (const [k, v] of Object.entries(source)) {
      if (v === undefined) continue;
      if (allow.has(k)) qs.set(k, String(v));
    }
  }
  return qs.size > 0 ? `?${qs.toString()}` : "";
}
