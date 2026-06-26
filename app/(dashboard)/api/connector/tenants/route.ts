import { NextResponse } from "next/server";
import { connectorFetch, ConnectorError } from "@/lib/connector/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const data = await connectorFetch("/tenants");
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof ConnectorError) {
      return NextResponse.json({ error: e.body }, { status: e.status });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
