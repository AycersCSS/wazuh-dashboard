"use client";

import { useCallback, useEffect, useState } from "react";

export type StatsStatus = "CONNECTING" | "CONNECTED" | "UNAUTHENTICATED" | "ERROR";

export interface UseConnectorStatsResult {
  status: StatsStatus;
  tenants: string[];
  totalAgents: number | null;
  error: string | null;
  refetch: () => void;
}

const POLL_MS = 30_000;

/**
 * Polls /api/connector/tenants + /api/connector/agents/count every 30s and
 * returns the aggregate. The Topbar (tenant dropdown + chrome pill) and
 * the Sidebar (top-tenant widget) both consume this; nothing else does.
 */
export function useConnectorStats(): UseConnectorStatsResult {
  const [status, setStatus] = useState<StatsStatus>("CONNECTING");
  const [tenants, setTenants] = useState<string[]>([]);
  const [totalAgents, setTotalAgents] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tRes, aRes] = await Promise.all([
          fetch("/api/connector/tenants"),
          fetch("/api/connector/agents/count")
        ]);
        if (cancelled) return;
        if (tRes.status === 401 || aRes.status === 401) {
          setStatus("UNAUTHENTICATED");
          return;
        }
        if (!tRes.ok || !aRes.ok) {
          setStatus("ERROR");
          setError(`HTTP ${tRes.status}/${aRes.status}`);
          return;
        }
        const tBody = await tRes.json() as { tenants?: string[] };
        const aBody = await aRes.json() as {
          total_agents?: number;
          active?: number;
          disconnected?: number;
          pending?: number;
          never_connected?: number;
        };
        setTenants(Array.isArray(tBody.tenants) ? tBody.tenants : []);
        const raw = aBody.total_agents;
        const derived =
          typeof raw === "number" && Number.isFinite(raw)
            ? raw
            : [
                aBody.active,
                aBody.disconnected,
                aBody.pending,
                aBody.never_connected,
              ].every((n) => typeof n === "number")
              ? (aBody.active as number)
                + (aBody.disconnected as number)
                + (aBody.pending as number)
                + (aBody.never_connected as number)
              : null;
        setTotalAgents(derived);
        setError(null);
        setStatus("CONNECTED");
      } catch (e) {
        if (cancelled) return;
        setStatus("ERROR");
        setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [tick]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { status, tenants, totalAgents, error, refetch };
}
