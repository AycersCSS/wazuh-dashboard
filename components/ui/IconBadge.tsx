import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function IconBadge({ icon: Icon, tone = "neutral" }: { icon: LucideIcon; tone?: "neutral" | "indigo" | "emerald" }) {
  const cls =
    tone === "emerald" ? "bg-emerald-400/15 text-emerald-400 border-emerald-400/40" :
    tone === "indigo"  ? "bg-severity-info/15 text-severity-info border-severity-info/40" :
                          "bg-navy-200 text-sage border-navy-500";
  return (
    <div className={cn("w-9 h-9 rounded-xl border grid place-items-center", cls)}>
      <Icon size={18} />
    </div>
  );
}
