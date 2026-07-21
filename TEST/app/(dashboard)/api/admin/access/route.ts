import { NextResponse } from "next/server";
import { setJwt } from "@/lib/auth/session";
import { proxyConnector } from "@/lib/connector/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return NextResponse.redirect(new URL("/login", "http://localhost"));
}

export async function POST(req: Request): Promise<Response> {
  const upstream = await proxyConnector(req, {
    path: "/customer/login",
    method: "POST",
    body: { username: "admin", password: "admin" }
  });

  if (upstream.status === 200) {
    const data = (await upstream.json().catch(() => ({}))) as { token?: string };
    if (!data.token) {
      return NextResponse.json({ ok: false, error: "Malformed response from connector" }, { status: 502 });
    }
    setJwt(data.token);
    return NextResponse.json({ ok: true, redirect: "/admin" });
  }

  const errBody = (await upstream.json().catch(() => ({}))) as { error?: string };
  return NextResponse.json(
    { ok: false, error: errBody.error ?? `HTTP ${upstream.status}` },
    { status: upstream.status }
  );
}
