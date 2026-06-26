"use client";

import Link from "next/link";

export type BannerStatus = "CONNECTING" | "CONNECTED" | "STALE" | "UNAUTHENTICATED" | "ERROR";

export interface ConnectionBannerProps {
  status: BannerStatus;
  lastFetchedAt: number | null;
}

function formatAgo(ts: number, now: number): string {
  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  return `${mins}m ago`;
}

export function ConnectionBanner({ status, lastFetchedAt }: ConnectionBannerProps) {
  const now = Date.now();
  let label: React.ReactNode;
  let tone: string;
  switch (status) {
    case "CONNECTING":
      label = "Connecting…";
      tone = "text-slate-300 border-slate-500/40";
      break;
    case "CONNECTED":
      label = `Live${lastFetchedAt ? ` — updated ${formatAgo(lastFetchedAt, now)}` : ""}`;
      tone = "text-emerald-400 border-emerald-400/40";
      break;
    case "STALE":
      label = `Stale — last update ${lastFetchedAt ? formatAgo(lastFetchedAt, now) : "never"}`;
      tone = "text-amber-300 border-amber-300/40";
      break;
    case "ERROR":
      label = "Connector error — retrying…";
      tone = "text-severity-high border-severity-high/40";
      break;
    case "UNAUTHENTICATED":
      label = <>Not signed in — <Link href="/login" className="underline">Sign in</Link></>;
      tone = "text-severity-high border-severity-high/40";
      break;
  }
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="connection-banner"
      className={`text-[11px] font-mono inline-flex items-center gap-1.5 px-2 py-1 rounded border bg-navy-200/40 ${tone}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </div>
  );
}
