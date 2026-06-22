import type { ReactNode } from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card } from "./Card";
import { cn } from "@/lib/cn";

type Accent = "neutral" | "critical" | "high" | "medium" | "low" | "info";
type Dir = "up" | "down" | "flat";

const accentBar: Record<Accent, string> = {
  neutral: "bg-indigo-600", critical: "bg-rose-600", high: "bg-orange-500",
  medium: "bg-amber-500", low: "bg-emerald-500", info: "bg-sky-500"
};
const accentText: Record<Accent, string> = {
  neutral: "text-indigo-600", critical: "text-rose-600", high: "text-orange-600",
  medium: "text-amber-600", low: "text-emerald-600", info: "text-sky-600"
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
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  const deltaColor = dir === "up" ? "text-emerald-600" : dir === "down" ? "text-rose-600" : "text-slate-500";
  return (
    <Card className="relative overflow-hidden">
      <span className={cn("absolute left-0 top-0 bottom-0 w-[3px]", accentBar[accent])} />
      <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className={cn("text-2xl font-semibold tracking-tight num mt-1.5", accentText[accent])}>{value}</div>
      <div className="flex items-center justify-between mt-1.5">
        {delta ? (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-mono", deltaColor)}>
            <Icon size={11} /> {delta}
          </span>
        ) : <span />}
        {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
      </div>
    </Card>
  );
}
