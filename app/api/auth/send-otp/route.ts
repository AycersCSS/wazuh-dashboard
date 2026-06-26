import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { issueOtp } from "@/lib/otp";

export const dynamic = "force-dynamic";

interface Body { email?: unknown; }

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@") || email.length > 200) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare("SELECT id, email FROM users WHERE email = ?").get(email) as
    | { id: string; email: string } | undefined;

  // Always respond the same way whether or not the email exists, to avoid
  // leaking which addresses are registered. The difference is just whether
  // we actually print a code.
  if (user) {
    const code = issueOtp(user.email);
    // eslint-disable-next-line no-console
    console.log(`\n[portal] OTP for ${user.email}: ${code}\n`);
  }

  return NextResponse.json({ ok: true });
}
