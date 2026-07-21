"use client";

import { useCallback, useEffect, useState } from "react";

export type AlertsStatus = "IDLE" | "LOADING" | "READY" | "UNAUTHENTICATED" | "ERROR";

export interface AlertCounts {
  critical: number;
  high: number;
  warning: number;
  total: number;
}

export interface UseConnectorAlertsResult {
  status: AlertsStatus;
  alerts: AlertCounts;
  error: string | null;
  refetch: () => void;
}

const POLL_MS = 30_000;
const EMPTY: AlertCounts = { critical: 0, high: 0, warning: 0, total: 0 };

function countBucket(v: unknown): number {
  if (Array.isArray(v)) return v.length;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return 0;
}

export function useConnectorAlerts(tenantId: string | null): UseConnectorAlertsResult {
  const [status, setStatus] = useState<AlertsStatus>(tenantId ? "LOADING" : "IDLE");
  const [alerts, setAlerts] = useState<AlertCounts>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!tenantId) {
      setStatus("IDLE");
      setAlerts(EMPTY);
      return;
    }
    let cancelled = false;
    setStatus("LOADING");
    const url = `/api/connector/alerts?tenant=${encodeURIComponent(tenantId)}&limit=200&time_range=7d`;
    fetch(url)
      .then(async (res) => {
        if (res.status === 401) throw Object.assign(new Error("Unauthorized"), { status: 401 });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as Record<string, unknown>;
        if (cancelled) return;
        const critical = countBucket(body.critical);
        const high = countBucket(body.high);
        const warning = countBucket(body.warning);
        const total =
          typeof body.total === "number" && Number.isFinite(body.total)
            ? body.total
            : critical + high + warning;
        setAlerts({ critical, high, warning, total });
        setError(null);
        setStatus("READY");
      })
      .catch((e: Error & { status?: number }) => {
        if (cancelled) return;
        if (e.status === 401) setStatus("UNAUTHENTICATED");
        else {
          setStatus("ERROR");
          setError(e.message);
          setAlerts(EMPTY);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, tick]);

  useEffect(() => {
    if (!tenantId) return;
    const id = window.setInterval(() => setTick((t) => t + 1), POLL_MS);
    return () => window.clearInterval(id);
  }, [tenantId]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { status, alerts, error, refetch };
}
