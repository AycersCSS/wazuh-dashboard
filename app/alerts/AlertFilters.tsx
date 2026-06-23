"use client";
import { SearchInput } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface AlertFilters {
  severities: Set<"critical" | "high" | "medium" | "low" | "info">;
  search: string;
  showAcked: boolean;
}

const sevOptions: { value: "critical" | "high" | "medium" | "low" | "info"; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "high",     label: "High" },
  { value: "medium",   label: "Medium" },
  { value: "low",      label: "Low" },
  { value: "info",     label: "Info" }
];

const sevToneClass: Record<string, string> = {
  critical: "bg-severity-critical/15 border-severity-critical/40 text-severity-critical",
  high:     "bg-severity-high/15 border-severity-high/40 text-severity-high",
  medium:   "bg-severity-medium/15 border-severity-medium/40 text-severity-medium",
  low:      "bg-emerald-400/15 border-emerald-400/40 text-emerald-400",
  info:     "bg-severity-info/15 border-severity-info/40 text-severity-info"
};
const sevDotClass: Record<string, string> = {
  critical: "bg-severity-critical", high: "bg-severity-high", medium: "bg-severity-medium", low: "bg-emerald-400", info: "bg-severity-info"
};

export function AlertFiltersBar({ value, onChange }: { value: AlertFilters; onChange: (v: AlertFilters) => void }) {
  function toggleSev(s: "critical" | "high" | "medium" | "low" | "info") {
    const next = new Set(value.severities);
    if (next.has(s)) next.delete(s); else next.add(s);
    onChange({ ...value, severities: next });
  }
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-navy-100 border border-navy-400 rounded-xl">
      <div className="flex items-center gap-1.5 mr-2">
        {sevOptions.map(o => {
          const active = value.severities.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggleSev(o.value)}
              className={cn(
                "h-7 px-2.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
                active ? sevToneClass[o.value] : "bg-navy-100 border-navy-400 text-sage hover:bg-navy-100"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", sevDotClass[o.value])} />
              {o.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-w-[200px] max-w-md">
        <SearchInput value={value.search} onChange={v => onChange({ ...value, search: v })} placeholder="Search by ID, rule, agent..." />
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-sage cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value.showAcked}
          onChange={e => onChange({ ...value, showAcked: e.target.checked })}
          className="rounded border-navy-500 text-emerald-400 focus:ring-indigo-500"
        />
        Show acknowledged
      </label>
    </div>
  );
}
