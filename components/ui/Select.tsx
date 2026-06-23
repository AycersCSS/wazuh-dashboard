"use client";
import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface Option { value: string; label: string; }
interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: Option[];
  className?: string;
}

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { options, className, ...rest }, ref
) {
  return (
    <div className={cn("relative inline-block", className)}>
      <select
        ref={ref}
        className="appearance-none h-9 pl-3 pr-8 bg-navy-100 border border-navy-400 rounded-lg text-sm text-cream hover:border-navy-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400"
        {...rest}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-navy-600 pointer-events-none" />
    </div>
  );
});
