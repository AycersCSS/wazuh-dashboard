"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type StatsStatus = "CONNECTING" | "CONNECTED" | "STALE" | "UNAUTHENTICATED" | "ERROR";

export interface UseConnectorStatsResult {
  status: StatsStatus;
  lastFetchedAt: number | null;
  tenants: string[];
  totalAgents: number | null;
  error: string | null;
  refetch: () => void;
}

type Fetcher = (path: string) => Promise<unknown>;

let fetcher: Fetcher = async (path) => {
  const res = await fetch(path);
  if (!res.ok) {
    const err: Error & { status?: number } = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
};

export function setStatsFetcher(fn: Fetcher): void {
  fetcher = fn;
}

const POLL_MS = 30_000;
const STALE_MS = 60_000;

export function useConnectorStats(): UseConnectorStatsResult {
  const [status, setStatus] = useState<StatsStatus>("CONNECTING");
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [tenants, setTenants] = useState<string[]>([]);
  const [totalAgents, setTotalAgents] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const staleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const doFetch = useCallback(async () => {
    try {
      const [tenantsRes, agentsRes] = await Promise.all([
        fetcher("/api/connector/tenants"),
        fetcher("/api/connector/agents/count")
      ]);
      if (!mountedRef.current) return;
      setTenants((tenantsRes as { tenants: string[] }).tenants);
      setTotalAgents((agentsRes as { total_agents: number }).total_agents);
      setError(null);
      setStatus("CONNECTED");
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
    setStatus("CONNECTING");
    void doFetch();
  }, [doFetch]);

  useEffect(() => {
    mountedRef.current = true;
    void doFetch();
    intervalRef.current = setInterval(() => { void doFetch(); }, POLL_MS);
    staleRef.current = setInterval(() => {
      setLastFetchedAt((prev) => {
        if (prev !== null && Date.now() - prev > STALE_MS && statusRef.current === "CONNECTED") {
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
  }, [doFetch]);

  // Keep a ref to status so the stale interval sees the current value
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  return { status, lastFetchedAt, tenants, totalAgents, error, refetch };
}
