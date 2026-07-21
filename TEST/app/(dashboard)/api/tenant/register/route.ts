import { NextResponse } from "next/server";
import { proxyConnector } from "@/lib/connector/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const upstream = await proxyConnector(req, {
    path: "/customer/register",
    method: "POST"
  });

  if (upstream.status === 201 || upstream.status === 200) {
    return NextResponse.json({ ok: true });
  }

  const errBody = (await upstream.json().catch(() => ({}))) as { error?: string };
  return NextResponse.json(
    { ok: false, error: errBody.error ?? `HTTP ${upstream.status}` },
    { status: upstream.status }
  );
}
