// Shared helper for proxying dashboard requests to upstream Wazuh.
// All /api/wazuh/* routes follow the same shape:
//   1. Gate on the session cookie.
//   2. Whitelist known query parameters.
//   3. Call wazuhFetch() and return the JSON, or a sanitized error.
//
// Keeping the wrapper here means every route is ~25 lines and the security
// pattern (cookie gate + query allowlist + safe error body) is uniform.

import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { wazuhFetch, WazuhError, safeQuery } from "./client";

const COOKIE_NAME = process.env.CONNECTOR_JWT_COOKIE ?? "connector_jwt";

export function isAuthenticated(): boolean {
  return !!cookies().get(COOKIE_NAME)?.value;
}

export function isLocalTestToken(): boolean {
  const v = cookies().get(COOKIE_NAME)?.value;
  return !!v && v.startsWith("local-test.");
}

interface ProxyOptions {
  /** Upstream Wazuh path, e.g. "/agents". */
  path: string;
  /** Allowed query-param keys for this route. */
  allowedQuery: Set<string>;
  /**
   * If true, the route returns `{ data: null }` for local-test tokens so the
   * dashboard can render an empty state. If false, the route 503s.
   * Read-only listing endpoints should set this true.
   */
  emptyOnLocalTest?: boolean;
  /** Override init for the upstream call. */
  init?: RequestInit;
}

export async function proxyWazuh<T>(req: Request, opts: ProxyOptions): Promise<Response> {
  if (!isAuthenticated()) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  // Local-test tokens cannot reach the real Wazuh manager. For read-only
  // endpoints we return an empty payload so the dashboard renders its empty
  // state instead of erroring. Mutating endpoints should pass emptyOnLocalTest
  // = false to surface a 503.
  if (isLocalTestToken()) {
    if (opts.emptyOnLocalTest) {
      return NextResponse.json({ data: null, mode: "local-test" } as T);
    }
    return NextResponse.json({ ok: false, error: "wazuh_unavailable_local_test" }, { status: 503 });
  }

  const url = new URL(req.url);
  const query = safeQuery(url.searchParams, opts.allowedQuery);

  try {
    const data = await wazuhFetch<T>({ path: opts.path, query, init: opts.init });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof WazuhError) {
      return NextResponse.json({ ok: false, error: "wazuh_unavailable" }, { status: e.status || 502 });
    }
    return NextResponse.json({ ok: false, error: "unknown_error" }, { status: 500 });
  }
}
