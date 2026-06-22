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
        className="appearance-none h-9 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
        {...rest}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
});
