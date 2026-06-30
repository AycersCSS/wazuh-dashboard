"use client";

// Browser-side hook that polls a /api/wazuh/* route and returns typed data.
// Mirrors the useConnectorStats pattern: loading state, stale detection, and
// a manual refetch().
//
// The hook deliberately returns `data: null` (not an error) when the proxy
// route returns its local-test empty shape — the consuming page can render
// its normal empty state and the data layer doesn't need to special-case it.

import { useCallback, useEffect, useRef, useState } from "react";

export type WazuhResourceStatus =
  | "IDLE"
  | "LOADING"
  | "READY"
  | "STALE"
  | "UNAUTHENTICATED"
  | "ERROR";

export interface UseWazuhResourceResult<T> {
  status: WazuhResourceStatus;
  lastFetchedAt: number | null;
  data: T | null;
  error: string | null;
  refetch: () => void;
}

type Fetcher = (url: string) => Promise<unknown>;

let fetcher: Fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err: Error & { status?: number } = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
};

export function setWazuhFetcher(fn: Fetcher): void {
  fetcher = fn;
}

const POLL_MS = 30_000;
const STALE_MS = 60_000;

export function useWazuhResource<T>(
  path: string | null,
  options: { pollMs?: number; staleMs?: number } = {}
): UseWazuhResourceResult<T> {
  const [status, setStatus] = useState<WazuhResourceStatus>(path ? "LOADING" : "IDLE");
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const staleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const statusRef = useRef(status);
  const pathRef = useRef(path);
  const pollMs = options.pollMs ?? POLL_MS;
  const staleMs = options.staleMs ?? STALE_MS;

  const doFetch = useCallback(async (url: string) => {
    try {
      const res = (await fetcher(url)) as T;
      if (!mountedRef.current) return;
      setData(res);
      setError(null);
      setStatus("READY");
      setLastFetchedAt(Date.now());
    } catch (e) {
      if (!mountedRef.current) return;
      const err = e as Error & { status?: number };
      if (err.status === 401) {
        setStatus("UNAUTHENTICATED");
      } else {
        setStatus("ERROR");
        setError(err.message ?? "Unknown error");
      }
    }
  }, []);

  const refetch = useCallback(() => {
    if (!pathRef.current) return;
    setStatus("LOADING");
    void doFetch(pathRef.current);
  }, [doFetch]);

  useEffect(() => {
    mountedRef.current = true;
    pathRef.current = path;
    statusRef.current = status;
    if (!path) {
      setStatus("IDLE");
      setData(null);
      return;
    }
    setStatus("LOADING");
    void doFetch(path);
    intervalRef.current = setInterval(() => { void doFetch(path); }, pollMs);
    staleRef.current = setInterval(() => {
      setLastFetchedAt((prev) => {
        if (prev !== null && Date.now() - prev > staleMs && statusRef.current === "READY") {
          setStatus("STALE");
        }
        return prev;
      });
    }, 5_000);
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (staleRef.current) clearInterval(staleRef.current);
    };
    // We intentionally only re-run when the path changes; pollMs/staleMs are
    // captured in the closures above and re-running on every render would
    // restart the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => { statusRef.current = status; }, [status]);

  return { status, lastFetchedAt, data, error, refetch };
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
