"use client";

import { useCallback, useEffect, useState } from "react";

export type WazuhResourceStatus =
  | "IDLE"
  | "LOADING"
  | "READY"
  | "UNAUTHENTICATED"
  | "ERROR";

export interface UseWazuhResourceResult<T> {
  status: WazuhResourceStatus;
  data: T | null;
  error: string | null;
  refetch: () => void;
}

const POLL_MS = 30_000;

/**
 * Polls `path` every POLL_MS and returns typed JSON. The local-test empty
 * shape (`{ data: null }`) is returned as `null` rather than an error so
 * consuming pages can render their normal empty state without a special case.
 */
export function useWazuhResource<T>(
  path: string | null
): UseWazuhResourceResult<T> {
  const [status, setStatus] = useState<WazuhResourceStatus>(path ? "LOADING" : "IDLE");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) {
      setStatus("IDLE");
      setData(null);
      return;
    }
    let cancelled = false;
    setStatus("LOADING");
    fetch(path)
      .then(async (res) => {
        if (res.status === 401) throw Object.assign(new Error("Unauthorized"), { status: 401 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        if (cancelled) return;
        // Proxy returns `{ data: null }` for local-test tokens. Treat as empty.
        if (body && typeof body === "object" && "data" in body && body.data === null) {
          setData(null);
        } else {
          setData(body as T);
        }
        setError(null);
        setStatus("READY"); // ← was missing on the null-body branch too
      })
      .catch((e: Error & { status?: number }) => {
        if (cancelled) return;
        if (e.status === 401) setStatus("UNAUTHENTICATED");
        else { setStatus("ERROR"); setError(e.message); }
      });
    return () => { cancelled = true; };
  }, [path, tick]);

  // Poll on a fixed interval; the effect's `tick` dependency restarts the fetch.
  useEffect(() => {
    if (!path) return;
    const id = window.setInterval(() => setTick((t) => t + 1), POLL_MS);
    return () => window.clearInterval(id);
  }, [path]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { status, data, error, refetch };
}

/**
 * Build a query string from a typed params object. Stable key order so the
 * hook's useEffect dep is reliable.
 */
export function buildPath(base: string, params: Record<string, string | number | undefined | null> = {}): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const tail = qs.toString();
  return tail ? `${base}?${tail}` : base;
}
