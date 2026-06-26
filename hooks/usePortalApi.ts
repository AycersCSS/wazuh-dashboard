"use client";
import { useEffect, useState, useCallback } from "react";
import { useToasts } from "@/components/providers/ToastProvider";

interface UseResourceResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useResource<T>(url: string): UseResourceResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then((j: { ok: boolean; data?: T; error?: string }) => {
        if (cancelled) return;
        if (!j.ok || j.data === undefined) {
          setError(j.error ?? "load_failed");
          setData(null);
        } else {
          setData(j.data);
          setError(null);
        }
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "load_failed");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url, tick]);

  const refresh = useCallback(() => setTick(t => t + 1), []);
  return { data, loading, error, refresh };
}

export type ActionType =
  | "acknowledgeAlert"
  | "archiveAlert"
  | "escalateAlert"
  | "isolateAgent"
  | "unisolateAgent"
  | "restartAgent"
  | "setVulnStatus"
  | "markFimReviewed"
  | "toggleRule";

export function usePortalAction() {
  const toasts = useToasts();
  return useCallback(async (type: ActionType, targetId: string, payload?: { status?: string }) => {
    try {
      const res = await fetch("/api/wazuh/actions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, targetId, payload })
      });
      const j = (await res.json()) as { ok: boolean; error?: string };
      if (!j.ok) {
        toasts.push({ title: "Action failed", description: j.error ?? "unknown", variant: "error" });
        return false;
      }
      toasts.push({ title: "Done", variant: "success" });
      return true;
    } catch (err) {
      toasts.push({
        title: "Action failed",
        description: err instanceof Error ? err.message : "unknown",
        variant: "error"
      });
      return false;
    }
  }, [toasts]);
}
