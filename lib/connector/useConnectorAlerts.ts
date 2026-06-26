"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AlertsStatus = "IDLE" | "LOADING" | "STALE" | "UNAUTHENTICATED" | "ERROR";

export interface AlertCounts {
  critical: number;
  high: number;
  warning: number;
  total: number;
}

export interface UseConnectorAlertsResult {
  status: AlertsStatus;
  lastFetchedAt: number | null;
  alerts: AlertCounts;
  error: string | null;
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

export function setAlertsFetcher(fn: Fetcher): void {
  fetcher = fn;
}

const POLL_MS = 30_000;
const STALE_MS = 60_000;
const LIMIT = 200;
const TIME_RANGE = "7d";

const EMPTY: AlertCounts = { critical: 0, high: 0, warning: 0, total: 0 };

export function useConnectorAlerts(tenantId: string | null): UseConnectorAlertsResult {
  const [status, setStatus] = useState<AlertsStatus>(tenantId ? "LOADING" : "IDLE");
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<AlertCounts>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const staleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const currentTenantRef = useRef(tenantId);

  const doFetch = useCallback(async (tid: string) => {
    try {
      const path = `/api/connector/alerts?tenant=${encodeURIComponent(tid)}&limit=${LIMIT}&time_range=${TIME_RANGE}`;
      const res = (await fetcher(path)) as { critical: unknown[]; high: unknown[]; warning: unknown[]; total: number };
      if (!mountedRef.current || currentTenantRef.current !== tid) return;
      setAlerts({
        critical: res.critical.length,
        high: res.high.length,
        warning: res.warning.length,
        total: res.total
      });
      setError(null);
      // Success: stay in LOADING state. Per spec §5.2, the alerts
      // hook's terminal state is LOADING (poll continues); 60s
      // without a successful response flips to STALE. The
      // "CONNECTED" enum value belongs to useConnectorStats, not
      // here.
      setLastFetchedAt(Date.now());
    } catch (e) {
      if (!mountedRef.current || currentTenantRef.current !== tid) return;
      const err = e as Error & { status?: number };
      if (err.status === 401) {
        setStatus("UNAUTHENTICATED");
      } else {
        setStatus("ERROR");
        setError(err.message ?? "Unknown error");
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    currentTenantRef.current = tenantId;

    if (!tenantId) {
      setStatus("IDLE");
      setAlerts(EMPTY);
      return;
    }

    setStatus("LOADING");
    void doFetch(tenantId);
    intervalRef.current = setInterval(() => { void doFetch(tenantId); }, POLL_MS);
    staleRef.current = setInterval(() => {
      setLastFetchedAt((prev) => {
        if (prev !== null && Date.now() - prev > STALE_MS && statusRef.current !== "STALE") {
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
  }, [tenantId, doFetch]);

  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  // Note: on fetch success we deliberately do NOT change status.
  // The alerts hook's terminal "live" state is LOADING (polling
  // continues); 60s without success flips to STALE. The CONNECTED
  // enum value belongs to useConnectorStats, not here.
  return { status, lastFetchedAt, alerts, error };
}
