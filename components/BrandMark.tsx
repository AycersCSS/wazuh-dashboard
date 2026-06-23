import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * BrandMark — placeholder text logo for MergeIT.
 * The real logo will land in /public/mergeit-logo.svg later.
 * Swap <ShieldCheck/> for <img src="/mergeit-logo.svg" alt="MergeIT" /> in one line.
 */
export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { box: "w-7 h-7", icon: 14, text: "text-sm",  gap: "gap-2" },
    md: { box: "w-8 h-8", icon: 16, text: "text-sm",  gap: "gap-2.5" },
    lg: { box: "w-10 h-10", icon: 20, text: "text-lg", gap: "gap-3" }
  } as const;
  const s = sizes[size];
  return (
    <Link href="/" aria-label="MergeIT SOC home" className={`flex items-center ${s.gap} min-w-0`}>
      <div className={`${s.box} grid place-items-center rounded-lg bg-emerald-400/15 border border-emerald-400/40`}>
        <ShieldCheck size={s.icon} className="text-emerald-400" />
      </div>
      <div className="leading-tight min-w-0">
        <div className={`font-oswald font-medium tracking-wide text-sage ${s.text} truncate`}>MERGEIT</div>
        <div className="text-[9.5px] uppercase tracking-[0.18em] text-navy-600 font-mono">SOC</div>
      </div>
    </Link>
  );
}
