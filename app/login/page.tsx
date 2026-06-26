"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";

const PORTAL_NAME = process.env.NEXT_PUBLIC_PORTAL_NAME ?? "MergeIT Client Portal";

type Stage = "request" | "verify" | "sending" | "verifying";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]   = useState("");
  const [code,  setCode]    = useState("");
  const [stage, setStage]   = useState<Stage>("request");
  const [error, setError]   = useState<string | null>(null);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStage("sending");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "send_failed");
      }
      setStage("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "send_failed");
      setStage("request");
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStage("verifying");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "verify_failed");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "verify_failed");
      setStage("verify");
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-navy text-cream px-4">
      <div className="w-full max-w-[400px] bg-navy-100 border border-navy-400 rounded-xl shadow-pop p-6">
        <div className="mb-6">
          <div className="font-oswald font-medium tracking-wide text-sage text-sm">MERGEIT</div>
          <div className="text-[9.5px] uppercase tracking-[0.18em] text-navy-600 font-mono mb-3">CLIENT PORTAL</div>
          <h1 className="text-lg font-semibold text-cream">{PORTAL_NAME}</h1>
          <p className="text-[12px] text-sage mt-1 leading-relaxed">
            Sign in with your work email. We&apos;ll send a one-time code to your inbox.
          </p>
        </div>

        {stage !== "verify" && stage !== "verifying" && (
          <form onSubmit={sendCode} className="space-y-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-navy-600 font-semibold mb-1">Email</div>
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button type="submit" loading={stage === "sending"} className="w-full">
              Send code
            </Button>
          </form>
        )}

        {(stage === "verify" || stage === "verifying") && (
          <form onSubmit={verifyCode} className="space-y-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-navy-600 font-semibold mb-1">
                Code sent to
              </div>
              <div className="text-[12.5px] text-cream font-mono">{email}</div>
            </div>
            <div>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
              />
            </div>
            <Button type="submit" loading={stage === "verifying"} className="w-full">
              Verify and sign in
            </Button>
            <button
              type="button"
              onClick={() => { setStage("request"); setCode(""); setError(null); }}
              className="text-[11px] text-navy-600 hover:text-cream w-full text-center"
            >
              Use a different email
            </button>
          </form>
        )}

        {error && (
          <div className="mt-4 px-3 h-9 flex items-center rounded-md bg-severity-critical/15 border border-severity-critical/40">
            <span className="text-[11px] text-severity-critical">{humanizeError(error)}</span>
          </div>
        )}

        <div className="border-t border-navy-400 mt-6 pt-4">
          <p className="text-[10.5px] text-navy-600">
            <span className="font-mono text-sage">Dev mode:</span> OTP codes are printed to the server terminal.
          </p>
        </div>
      </div>
    </main>
  );
}

function humanizeError(code: string): string {
  switch (code) {
    case "invalid_email": return "Please enter a valid email address.";
    case "no_code":       return "No code was sent to that address yet.";
    case "expired":       return "That code has expired. Request a new one.";
    case "locked":        return "Too many attempts. Request a new code.";
    case "mismatch":      return "That code didn't match. Try again.";
    case "invalid_code":  return "Codes are 6 digits.";
    case "user_not_found":return "No account is registered for that email.";
    case "send_failed":   return "Couldn't send the code. Please try again.";
    case "verify_failed": return "Couldn't verify the code. Please try again.";
    default:              return "Something went wrong. Please try again.";
  }
}
