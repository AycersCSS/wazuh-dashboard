"use client";

import { useCallback, useEffect, useState } from "react";

export interface UseSessionResult {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { username: string } | null;
  signIn: (creds: { username: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
}

export function useSession(): UseSessionResult {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ username: string } | null>(null);

  const check = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/connector/health");
      setIsAuthenticated(res.ok);
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void check(); }, [check]);

  const signIn = useCallback(async (creds: { username: string; password: string }) => {
    const res = await fetch("/api/connector/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds)
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (res.ok && body.ok) {
      setIsAuthenticated(true);
      setUser({ username: creds.username });
      return { ok: true } as const;
    }
    return { ok: false, error: body.error ?? `HTTP ${res.status}` } as const;
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/connector/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return { isAuthenticated, isLoading, user, signIn, signOut };
}
