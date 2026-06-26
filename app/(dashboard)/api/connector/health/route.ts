import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectorFetch, ConnectorError } from "@/lib/connector/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = process.env.CONNECTOR_JWT_COOKIE ?? "connector_jwt";

export async function GET(): Promise<Response> {
  // Local test login — see app/(auth)/login/page.tsx and the login API route.
  // The local-test token is not a real upstream JWT, so the connector will 401.
  // Treat the user as authenticated for health-check purposes so the AuthGate
  // keeps them on the dashboard. Will be removed before going live.
  const jwt = cookies().get(COOKIE_NAME)?.value;
  if (jwt && jwt.startsWith("local-test.")) {
    return NextResponse.json({ ok: true, mode: "local-test" });
  }

  try {
    await connectorFetch("/tenants");
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ConnectorError) {
      return NextResponse.json({ ok: false, error: e.body }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "Unknown" }, { status: 503 });
  }
}
