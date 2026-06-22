"use client";
import { useEffect, useRef, useState } from "react";

/** Tiny client-only live ticker. Counts up to a target over a short interval. */
export function CountUp({ to, durationMs = 700, prefix = "", suffix = "" }: { to: number; durationMs?: number; prefix?: string; suffix?: string }) {
  const [v, setV] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    let raf: number;
    const tick = (t: number) => {
      if (start.current === null) start.current = t;
      const p = Math.min(1, (t - start.current) / durationMs);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, durationMs]);
  return <span className="text-slate-900">{prefix}{v.toLocaleString()}{suffix}</span>;
}
