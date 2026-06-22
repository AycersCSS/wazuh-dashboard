"use client";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { leading, error, helper, className, ...rest }, ref
) {
  return (
    <div className="w-full">
      <div className={cn(
        "flex items-center h-9 px-3 bg-white border rounded-lg",
        error ? "border-rose-300 focus-within:ring-2 focus-within:ring-rose-200" : "border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
      )}>
        {leading && <span className="mr-2 text-slate-400 flex-none">{leading}</span>}
        <input
          ref={ref}
          className={cn("flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder:text-slate-400", className)}
          {...rest}
        />
      </div>
      {(error || helper) && <div className={cn("mt-1 text-xs", error ? "text-rose-600" : "text-slate-500")}>{error ?? helper}</div>}
    </div>
  );
});
