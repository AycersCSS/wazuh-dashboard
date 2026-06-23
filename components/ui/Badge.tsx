import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "info" | "low" | "medium" | "high" | "critical";

const toneClass: Record<Tone, string> = {
  neutral:  "bg-navy-200 text-sage border-navy-500",
  info:     "bg-severity-info/15 text-severity-info border-severity-info/40",
  low:      "bg-severity-low/15 text-severity-low border-severity-low/40",
  medium:   "bg-severity-medium/15 text-severity-medium border-severity-medium/40",
  high:     "bg-severity-high/15 text-severity-high border-severity-high/40",
  critical: "bg-severity-critical/15 text-severity-critical border-severity-critical/40"
};

const dotClass: Record<Tone, string> = {
  neutral: "bg-navy-600", info: "bg-severity-info", low: "bg-severity-low",
  medium: "bg-severity-medium", high: "bg-severity-high", critical: "bg-severity-critical"
};

export function Badge({ tone = "neutral", dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 h-6 px-2 rounded-md border text-xs font-medium", toneClass[tone], className)}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotClass[tone])} />}
      {children}
    </span>
  );
}
