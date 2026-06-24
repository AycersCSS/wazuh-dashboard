import type { ReactNode } from "react";
import { Card } from "./Card";
import { cn } from "@/lib/cn";

type Accent = "neutral" | "critical" | "high" | "medium" | "low" | "info";
type Dir = "up" | "down" | "flat";

const accentBar: Record<Accent, string> = {
  neutral: "bg-emerald-400", critical: "bg-severity-critical", high: "bg-severity-high",
  medium: "bg-severity-medium", low: "bg-severity-low", info: "bg-severity-info"
};
const accentText: Record<Accent, string> = {
  neutral: "text-cream", critical: "text-severity-critical", high: "text-severity-high",
  medium: "text-severity-medium", low: "text-severity-low", info: "text-severity-info"
};

export function StatCard({
  label, value, delta, dir = "up", hint, accent = "neutral"
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  dir?: Dir;
  hint?: ReactNode;
  accent?: Accent;
}) {
  const deltaColor = dir === "up" ? "text-severity-low" : dir === "down" ? "text-severity-critical" : "text-navy-600";
  return (
    <Card className="relative overflow-hidden">
      <span className={cn("absolute left-0 top-0 bottom-0 w-[3px]", accentBar[accent])} />
      <div className="text-[10.5px] uppercase tracking-wider text-navy-600 font-semibold">{label}</div>
      <div className={cn("text-2xl font-medium tracking-tight num mt-1.5 font-oswald", accentText[accent])}>{value}</div>
      <div className="flex items-center justify-between mt-1.5">
        {delta ? (
          <span className={cn("text-xs font-mono", deltaColor)}>
            {delta}
          </span>
        ) : <span />}
        {hint && <span className="text-[11px] text-navy-600">{hint}</span>}
      </div>
    </Card>
  );
}
