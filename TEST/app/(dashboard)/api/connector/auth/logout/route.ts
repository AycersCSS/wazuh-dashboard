import { NextResponse } from "next/server";
import { clearJwt } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  clearJwt();
  return NextResponse.json({ ok: true });
}
