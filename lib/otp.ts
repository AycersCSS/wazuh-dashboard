import { getDb } from "@/lib/db";
import { randomInt } from "node:crypto";

const TTL_SECONDS  = 10 * 60;   // 10 minutes
const MAX_ATTEMPTS = 5;          // after this, code is invalidated

export interface OtpRecord {
  email: string;
  code: string;
  attempts: number;
  expiresAt: number;
}

/**
 * Generates a new 6-digit code, replaces any prior code for this email,
 * and returns the code. The caller is responsible for delivering the code
 * (e.g. printing to console in dev).
 */
export function issueOtp(email: string): string {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const db = getDb();
  db.prepare(`
    INSERT INTO otp_codes (email, code, attempts, expires_at)
    VALUES (?, ?, 0, ?)
    ON CONFLICT(email) DO UPDATE SET
      code = excluded.code,
      attempts = 0,
      expires_at = excluded.expires_at
  `).run(email.toLowerCase(), code, expiresAt);
  return code;
}

export function getOtp(email: string): OtpRecord | null {
  const db = getDb();
  const row = db
    .prepare("SELECT email, code, attempts, expires_at FROM otp_codes WHERE email = ?")
    .get(email.toLowerCase()) as
    | { email: string; code: string; attempts: number; expires_at: number }
    | undefined;
  if (!row) return null;
  return {
    email:     row.email,
    code:      row.code,
    attempts:  row.attempts,
    expiresAt: row.expires_at
  };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "no_code" | "expired" | "locked" | "mismatch" };

/**
 * Verifies a submitted code, incrementing the attempt counter on failure.
 * On success, deletes the row.
 */
export function verifyOtp(email: string, code: string): VerifyResult {
  const db = getDb();
  const normalized = email.toLowerCase();
  const row = db
    .prepare("SELECT email, code, attempts, expires_at FROM otp_codes WHERE email = ?")
    .get(normalized) as
    | { email: string; code: string; attempts: number; expires_at: number }
    | undefined;
  if (!row) return { ok: false, reason: "no_code" };

  const now = Math.floor(Date.now() / 1000);
  if (row.expires_at < now) {
    db.prepare("DELETE FROM otp_codes WHERE email = ?").run(normalized);
    return { ok: false, reason: "expired" };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    db.prepare("DELETE FROM otp_codes WHERE email = ?").run(normalized);
    return { ok: false, reason: "locked" };
  }
  if (row.code !== code) {
    db.prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE email = ?").run(normalized);
    return { ok: false, reason: "mismatch" };
  }
  db.prepare("DELETE FROM otp_codes WHERE email = ?").run(normalized);
  return { ok: true };
}
