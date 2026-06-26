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

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl grid gap-6 md:grid-cols-2 md:gap-8 items-stretch">
        <Card className="w-full max-w-sm justify-self-center md:justify-self-end">
          <CardTitle>MergeIT SOC sign in</CardTitle>
          <CardSubtitle>Use your Wazuh service account.</CardSubtitle>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div>
              <label htmlFor="username" className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">Username</label>
              <Input id="username" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="password" className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">Password</label>
              <Input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p role="alert" className="text-[12px] text-severity-high">{error}</p>}
            <Button type="submit" variant="primary" size="md" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
          </form>
        </Card>

        <Card className="w-full max-w-sm justify-self-center md:justify-self-start border-severity-info/40">
          <div className="flex items-center gap-2">
            <CardTitle>Local test login</CardTitle>
            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-severity-info/40 text-severity-info">
              dev only
            </span>
          </div>
          <CardSubtitle>
            Temporary sign-in used while the upstream Wazuh connector is unavailable. Will be removed before going live.
          </CardSubtitle>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Username</dt>
              <dd className="font-mono text-cream select-all">ADMIN</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Password</dt>
              <dd className="font-mono text-cream select-all">ADMIN</dd>
            </div>
          </dl>
          <p className="mt-4 text-[11px] text-navy-600">
            Use the form on the left with these credentials. No upstream connector call is made.
          </p>
        </Card>
      </div>
    </div>
  );
}
