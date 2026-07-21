"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/useSession";
import { Button, Input, Card, CardTitle, CardSubtitle } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyAdmin, setBusyAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signIn({ username, password });
    setBusy(false);
    if (result.ok) {
      router.push("/");
    } else {
      setError(result.error);
    }
  }

  async function onAdminAccess(e: React.FormEvent) {
    e.preventDefault();
    setBusyAdmin(true);
    setError(null);
    setAdminError(null);
    try {
      const res = await fetch("/api/admin/access", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        router.push(body.redirect ?? "/admin");
      } else {
        setAdminError(body.error ?? "Admin access failed");
      }
    } finally {
      setBusyAdmin(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-10 bg-navy">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] bg-emerald-400/15 border border-emerald-400/40 text-emerald-400 font-mono text-sm mb-3">
          MI
        </div>
        <h1 className="text-[22px] font-medium tracking-[-0.02em] text-cream">MergeIT SOC</h1>
        <p className="text-[12px] text-navy-600 mt-1 uppercase tracking-[0.12em]">Security operations</p>
      </div>
      <div className="w-full max-w-4xl grid gap-6 md:grid-cols-2 md:gap-8 items-stretch">
        <Card className="w-full max-w-sm justify-self-center md:justify-self-end">
          <CardTitle>Customer sign in</CardTitle>
          <CardSubtitle>
            Company user — any credentials. Opens the SOC overview; use Customer Portal for one company.
          </CardSubtitle>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div>
              <label
                htmlFor="username"
                className="block text-[11px] font-mono uppercase tracking-[0.08em] text-navy-600 mb-1"
              >
                Username
              </label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-[11px] font-mono uppercase tracking-[0.08em] text-navy-600 mb-1"
              >
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p role="alert" className="text-[12px] text-severity-high">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" size="md" disabled={busy}>
              {busy ? "Signing in…" : "Sign in as customer"}
            </Button>
          </form>
        </Card>
        <Card className="w-full max-w-sm justify-self-center md:justify-self-start">
          <CardTitle>Admin access</CardTitle>
          <CardSubtitle>MSP admin — fleet overview of every company, plus user registration.</CardSubtitle>
          <form onSubmit={onAdminAccess} className="mt-4 space-y-3">
            {adminError && (
              <p role="alert" className="text-[12px] text-severity-high">
                {adminError}
              </p>
            )}
            <Button type="submit" variant="secondary" size="md" disabled={busyAdmin || busy}>
              {busyAdmin ? "Entering…" : "Admin access (all tenants)"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
