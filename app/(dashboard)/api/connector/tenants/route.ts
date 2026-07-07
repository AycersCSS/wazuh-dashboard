import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = process.env.CONNECTOR_JWT_COOKIE ?? "connector_jwt";

export async function GET(): Promise<Response> {
  const jwt = cookies().get(COOKIE_NAME)?.value;
  if (!jwt) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  // In dev mode without a connector, return configured tenants from the config
  if (!process.env.CONNECTOR_BASE_URL) {
    const { TENANTS } = await import("@/config/site");
    return NextResponse.json({ tenants: Object.keys(TENANTS) });
  }

  // With a connector, forward to it
  try {
    const base = process.env.CONNECTOR_BASE_URL.replace(/\/+$/, "");
    const resp = await fetch(`${base}/tenants`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    return NextResponse.json(await resp.json(), { status: resp.status });
  } catch {
    return NextResponse.json(
      { ok: false, error: "connector_unreachable" },
      { status: 503 }
    );
  }
}
