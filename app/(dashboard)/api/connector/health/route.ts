import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { proxyConnector } from "@/lib/connector/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = process.env.CONNECTOR_JWT_COOKIE ?? "connector_jwt";

export async function GET(req: Request): Promise<Response> {
  const jwt = cookies().get(COOKIE_NAME)?.value;
  if (!jwt) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  // /tenants is the cheapest authenticated call; success = reachable + authed.
  const upstream = await proxyConnector(req, { path: "/tenants" });
  if (upstream.status === 200) {
    return NextResponse.json({ ok: true });
  }
  if (upstream.status === 401) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.json({ ok: false, error: "connector_unavailable" }, { status: 503 });
}
