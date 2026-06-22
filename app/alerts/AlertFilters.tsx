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
  critical: "bg-rose-50 border-rose-200 text-rose-700",
  high:     "bg-orange-50 border-orange-200 text-orange-700",
  medium:   "bg-amber-50 border-amber-200 text-amber-700",
  low:      "bg-emerald-50 border-emerald-200 text-emerald-700",
  info:     "bg-sky-50 border-sky-200 text-sky-700"
};
const sevDotClass: Record<string, string> = {
  critical: "bg-rose-500", high: "bg-orange-500", medium: "bg-amber-500", low: "bg-emerald-500", info: "bg-sky-500"
};

export function AlertFiltersBar({ value, onChange }: { value: AlertFilters; onChange: (v: AlertFilters) => void }) {
  function toggleSev(s: "critical" | "high" | "medium" | "low" | "info") {
    const next = new Set(value.severities);
    if (next.has(s)) next.delete(s); else next.add(s);
    onChange({ ...value, severities: next });
  }
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
      <div className="flex items-center gap-1.5 mr-2">
        {sevOptions.map(o => {
          const active = value.severities.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggleSev(o.value)}
              className={cn(
                "h-7 px-2.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
                active ? sevToneClass[o.value] : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
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
      <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value.showAcked}
          onChange={e => onChange({ ...value, showAcked: e.target.checked })}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        Show acknowledged
      </label>
    </div>
  );
}
