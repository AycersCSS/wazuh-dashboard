import { NextResponse } from "next/server";
import { setJwt } from "@/lib/auth/session";
import { proxyConnector } from "@/lib/connector/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IS_DEV = process.env.NODE_ENV !== "production" && !process.env.CONNECTOR_BASE_URL;

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "username and password are required" }, { status: 400 });
  }

  // Dev backdoor — only active when no connector is configured and not in production.
  // Accepts ANY credentials so you can sign in with demo / demo straight away.
  if (IS_DEV) {
    const payload = { sub: username, mode: "local-dev", iat: Math.floor(Date.now() / 1000) };
    const token = `local-dev.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
    setJwt(token);
    return NextResponse.json({ ok: true });
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
