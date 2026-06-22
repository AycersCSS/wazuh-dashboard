import type { LucideIcon } from "lucide-react";

export function IconBadge({ icon: Icon, tone = "neutral" }: { icon: LucideIcon; tone?: "neutral" | "indigo" }) {
  const cls = tone === "indigo" ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <div className={`w-9 h-9 rounded-xl border grid place-items-center ${cls}`}>
      <Icon size={18} />
    </div>
  );
}
