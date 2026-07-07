import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = process.env.CONNECTOR_JWT_COOKIE ?? "connector_jwt";

export async function GET(_req: Request): Promise<Response> {
  const jwt = cookies().get(COOKIE_NAME)?.value;
  if (!jwt) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  // In dev mode without a connector, just return OK — the user already
  // authenticated via the dev backdoor in the login route.
  if (!process.env.CONNECTOR_BASE_URL) {
    return NextResponse.json({ ok: true });
  }

  // With a connector, verify by calling /tenants (cheapest authed call).
  try {
    const base = process.env.CONNECTOR_BASE_URL.replace(/\/+$/, "");
    const resp = await fetch(`${base}/tenants`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (resp.ok) return NextResponse.json({ ok: true });
    if (resp.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "connector_unavailable" }, { status: 503 });
  } catch {
    return NextResponse.json({ ok: false, error: "connector_unreachable" }, { status: 503 });
  }
}
