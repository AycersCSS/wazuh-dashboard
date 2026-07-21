// Hoisted Intl formatters — building one is expensive.
const intlCompact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const intlDate = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" });

export function formatCompact(n: number) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return intlCompact.format(n);
}

export function formatRelativeTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const t = d?.getTime?.();
  if (typeof t !== "number" || !Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return intlDate.format(d);
}
