// Hoisted Intl formatters — building one is expensive.
const intlNumber = new Intl.NumberFormat("en-US");
const intlCompact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const intlTime = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const intlDate = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" });
const intlNumberCache = new Map<string, Intl.NumberFormat>();
function getIntlNumber(opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(opts);
  let f = intlNumberCache.get(key);
  if (!f) { f = new Intl.NumberFormat("en-US", opts); intlNumberCache.set(key, f); }
  return f;
}

export function formatNumber(n: number, opts?: Intl.NumberFormatOptions) {
  if (opts) return getIntlNumber(opts).format(n);
  return intlNumber.format(n);
}

export function formatCompact(n: number) {
  return intlCompact.format(n);
}

export function formatPercent(n: number, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatRelativeTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
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

export function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return intlTime.format(d);
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return intlDate.format(d);
}
