import { NextResponse } from "next/server";
import { connectorFetch, ConnectorError } from "@/lib/connector/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
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
