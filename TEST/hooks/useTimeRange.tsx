"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type TimeRangeKey = "1h" | "24h" | "7d" | "30d" | "custom";
export type TimeRange = { key: TimeRangeKey; fromMs: number; toMs: number; label: string };

function rangeFromKey(key: TimeRangeKey): TimeRange {
  const to = Date.now();
  const ms =
    key === "1h" ? 60 * 60 * 1000 :
    key === "24h" ? 24 * 60 * 60 * 1000 :
    key === "7d" ? 7 * 24 * 60 * 60 * 1000 :
    key === "30d" ? 30 * 24 * 60 * 60 * 1000 :
    24 * 60 * 60 * 1000;
  const label =
    key === "1h" ? "Last 1 hour" :
    key === "24h" ? "Last 24 hours" :
    key === "7d" ? "Last 7 days" :
    key === "30d" ? "Last 30 days" :
    "Custom range";
  return { key, fromMs: to - ms, toMs: to, label };
}

type Ctx = {
  range: TimeRange;
  setKey: (k: TimeRangeKey) => void;
  setCustom: (fromMs: number, toMs: number) => void;
};

const RangeCtx = createContext<Ctx | null>(null);

export function useTimeRange() {
  const ctx = useContext(RangeCtx);
  if (!ctx) throw new Error("useTimeRange must be used inside <TimeRangeProvider>");
  return ctx;
}

export function TimeRangeProvider({ children }: { children: React.ReactNode }) {
  const [key, setKeyState] = useState<TimeRangeKey>("24h");
  const [custom, setCustomState] = useState<{ fromMs: number; toMs: number } | null>(null);

  const range = useMemo<TimeRange>(() => {
    if (key === "custom" && custom) {
      return { key, fromMs: custom.fromMs, toMs: custom.toMs, label: "Custom range" };
    }
    return rangeFromKey(key);
  }, [key, custom]);

  const setKey = useCallback((k: TimeRangeKey) => { setKeyState(k); setCustomState(null); }, []);
  const setCustom = useCallback((fromMs: number, toMs: number) => {
    setKeyState("custom");
    setCustomState({ fromMs, toMs });
  }, []);

  const value = useMemo<Ctx>(() => ({ range, setKey, setCustom }), [range, setKey, setCustom]);
  return <RangeCtx.Provider value={value}>{children}</RangeCtx.Provider>;
}
