import { NextResponse } from "next/server";
import { setJwt } from "@/lib/auth/session";
import { proxyConnector } from "@/lib/connector/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_TEST_USER = "ADMIN";
const LOCAL_TEST_PASS = "ADMIN";
const IS_DEV = process.env.NODE_ENV !== "production" && !process.env.CONNECTOR_BASE_URL;

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "username and password are required" }, { status: 400 });
  }

  // Dev backdoor — only active when no connector is configured and not in production.
  // Uses an unsigned token that health route does NOT trust; requires the real connector.
  if (IS_DEV && username === LOCAL_TEST_USER && password === LOCAL_TEST_PASS) {
    const payload = { sub: username, mode: "local-dev", iat: Math.floor(Date.now() / 1000) };
    const token = `local-dev.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
    setJwt(token);
    return NextResponse.json({ ok: true });
  }

  if (!process.env.CONNECTOR_BASE_URL) {
    return NextResponse.json({ ok: false, error: "Connector not configured" }, { status: 503 });
  }

  // The connector's POST /customer/login returns { token } on success,
  // { error } on failure. We forward, then normalize.
  const upstream = await proxyConnector(req, {
    path: "/customer/login",
    method: "POST",
    body: { username, password }
  });

  if (upstream.status === 200) {
    const data = (await upstream.json().catch(() => ({}))) as { token?: string };
    if (!data.token) {
      return NextResponse.json({ ok: false, error: "Malformed response from connector" }, { status: 502 });
    }
    setJwt(data.token);
    return NextResponse.json({ ok: true });
  }

  const errBody = (await upstream.json().catch(() => ({}))) as { error?: string };
  return NextResponse.json(
    { ok: false, error: errBody.error ?? `HTTP ${upstream.status}` },
    { status: upstream.status }
  );
}
