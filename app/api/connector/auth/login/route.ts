import { NextResponse } from "next/server";
import { setJwt } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const base = process.env.CONNECTOR_BASE_URL;
  if (!base) {
    return NextResponse.json({ ok: false, error: "Connector not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const { username, password } = body as { username?: string; password?: string };
  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "username and password are required" }, { status: 400 });
  }

  const res = await fetch(`${base}/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (res.status === 200) {
    const data = (await res.json()) as { token?: string };
    if (!data.token) {
      return NextResponse.json({ ok: false, error: "Malformed response from connector" }, { status: 502 });
    }
    setJwt(data.token);
    return NextResponse.json({ ok: true });
  }

  // Pass through other status codes (401, 502, 503) with a sanitized body
  const errBody = await res.json().catch(() => ({}));
  const error = (errBody as { error?: string }).error ?? `HTTP ${res.status}`;
  return NextResponse.json({ ok: false, error }, { status: res.status });
}
