import { NextResponse } from "next/server";
import { withSession } from "@/lib/api-helpers";
import { listThreatIntel } from "@/lib/wazuh/client";

export const dynamic = "force-dynamic";

export async function GET() {
  return withSession(async (_session, ctx) => {
    return NextResponse.json({ ok: true, data: listThreatIntel(ctx) });
  });
}
