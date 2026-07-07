"use client";

import { useCallback, useEffect, useState } from "react";

export interface UseSessionResult {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { username: string } | null;
  signIn: (creds: { username: string; password: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
}

/**
 * Decode the JWT payload from the cookie. The cookie is httpOnly so we
 * cannot read it from JS directly — instead we call /api/connector/health
 * which returns the decoded username in its JSON body when the session is
 * valid. Falls back to null on any parse failure.
 */
function parseUsernameFromResponse(body: unknown): string | null {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.username === "string" && b.username) return b.username;
    // Some connectors nest it under `user.username`
    if (b.user && typeof b.user === "object") {
      const u = b.user as Record<string, unknown>;
      if (typeof u.username === "string" && u.username) return u.username;
    }
  }
  return null;
}

export function useSession(): UseSessionResult {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ username: string } | null>(null);

  const check = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/connector/health");
      if (res.ok) {
        setIsAuthenticated(true);
        // Hydrate username from the health response so hard refreshes
        // don't lose the session user. If the endpoint doesn't return a
        // username we keep whatever was previously set.
        const body = await res.json().catch(() => null);
        const username = parseUsernameFromResponse(body);
        if (username) setUser({ username });
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch {
      setIsAuthenticated(false);
      setUser(null);
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
