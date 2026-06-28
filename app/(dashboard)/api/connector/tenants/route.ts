import { NextResponse } from "next/server";
import { connectorFetch, ConnectorError } from "@/lib/connector/client";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = process.env.CONNECTOR_JWT_COOKIE ?? "connector_jwt";

export async function GET(): Promise<Response> {
  // Gate on the session cookie so unauthenticated callers can't probe the
  // connector's error paths (security audit finding #2).
  const jwt = cookies().get(COOKIE_NAME)?.value;
  if (!jwt) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  try {
    const data = await connectorFetch("/tenants");
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof ConnectorError) {
      // Do not echo the raw upstream body to the browser
      return NextResponse.json({ ok: false, error: "connector_unavailable" }, { status: e.status });
    }
    return NextResponse.json({ ok: false, error: "connector_unavailable" }, { status: 500 });
  }
}
