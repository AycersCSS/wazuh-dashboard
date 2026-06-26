import { describe, it, expect } from "vitest";
import { withIsolatedDatabase, db, USERS } from "@/test-utils/db";
import { issueOtp, verifyOtp, getOtp } from "@/lib/otp";

withIsolatedDatabase();

describe("otp", () => {
  it("issues a 6-digit code and stores it", () => {
    const code = issueOtp(USERS[0]!.email);
    expect(code).toMatch(/^\d{6}$/);
    const row = getOtp(USERS[0]!.email);
    expect(row?.code).toBe(code);
    expect(row?.attempts).toBe(0);
  });

  it("replaces a prior code on a new issue", () => {
    const first  = issueOtp(USERS[0]!.email);
    const second = issueOtp(USERS[0]!.email);
    expect(first).not.toBe(second);
    const row = getOtp(USERS[0]!.email);
    expect(row?.code).toBe(second);
  });

  it("verifies a correct code and deletes the row", () => {
    const code = issueOtp(USERS[0]!.email);
    const result = verifyOtp(USERS[0]!.email, code);
    expect(result).toEqual({ ok: true });
    expect(getOtp(USERS[0]!.email)).toBeNull();
  });

  it("rejects a wrong code and increments attempts", () => {
    const code = issueOtp(USERS[0]!.email);
    const wrong = String((Number(code) + 1) % 1_000_000).padStart(6, "0");
    const result = verifyOtp(USERS[0]!.email, wrong);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("mismatch");
    expect(getOtp(USERS[0]!.email)?.attempts).toBe(1);
  });

  it("locks after 5 failed attempts", () => {
    issueOtp(USERS[0]!.email);
    for (let i = 0; i < 5; i++) {
      verifyOtp(USERS[0]!.email, "000000");
    }
    const result = verifyOtp(USERS[0]!.email, "000000");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("locked");
  });

  it("returns no_code for an unknown email", () => {
    const result = verifyOtp("nobody@nowhere.test", "000000");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no_code");
  });

  it("rejects an expired code", () => {
    const code = issueOtp(USERS[0]!.email);
    db().prepare("UPDATE otp_codes SET expires_at = ? WHERE email = ?")
      .run(Math.floor(Date.now() / 1000) - 60, USERS[0]!.email);
    const result = verifyOtp(USERS[0]!.email, code);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("expired");
  });
});
