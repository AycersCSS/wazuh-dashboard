import { NextResponse } from "next/server";
import { connectorFetch, ConnectorError } from "@/lib/connector/client";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = process.env.CONNECTOR_JWT_COOKIE ?? "connector_jwt";

// Only these query parameters are forwarded to the upstream connector.
// Rejecting unknown keys prevents probing the connector for debug or admin
// endpoints via query-string injection (security audit finding #1).
const ALLOWED_PARAMS = new Set(["tenant", "limit", "time_range", "since", "until"]);

export async function GET(req: Request): Promise<Response> {
  // Gate on the session cookie so unauthenticated callers can't probe the
  // connector's error paths (security audit finding #2).
  const jwt = cookies().get(COOKIE_NAME)?.value;
  if (!jwt) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const qs = new URLSearchParams();
  for (const [k, v] of url.searchParams.entries()) {
    if (ALLOWED_PARAMS.has(k)) qs.set(k, v);
  }
  const safeQs = qs.size > 0 ? `?${qs.toString()}` : "";

  try {
    const data = await connectorFetch(`/alerts${safeQs}`);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof ConnectorError) {
      // Do not echo the raw upstream body to the browser
      return NextResponse.json({ ok: false, error: "connector_unavailable" }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "unknown_error" }, { status: 500 });
  }
}
