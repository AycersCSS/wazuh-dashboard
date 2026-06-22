import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "info" | "low" | "medium" | "high" | "critical";

const toneClass: Record<Tone, string> = {
  neutral:  "bg-slate-100 text-slate-700 border-slate-200",
  info:     "bg-sky-50 text-sky-700 border-sky-200",
  low:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium:   "bg-amber-50 text-amber-700 border-amber-200",
  high:     "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-rose-50 text-rose-700 border-rose-200"
};

const dotClass: Record<Tone, string> = {
  neutral: "bg-slate-400", info: "bg-sky-500", low: "bg-emerald-500",
  medium: "bg-amber-500", high: "bg-orange-500", critical: "bg-rose-500"
};

export function Badge({ tone = "neutral", dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-xs font-medium", toneClass[tone], className)}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotClass[tone])} />}
      {children}
    </span>
  );
}
