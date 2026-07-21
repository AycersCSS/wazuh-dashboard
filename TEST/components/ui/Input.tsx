"use client";
import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { leading, error, helper, className, ...rest },
  ref
) {
  return (
    <div className="w-full">
      <div
        className={cn(
          "flex items-center h-[34px] px-3 bg-navy-100 border rounded-lg",
          error
            ? "border-severity-critical/60 focus-within:ring-2 focus-within:ring-severity-critical/30"
            : "border-navy-400 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20"
        )}
      >
        {leading && <span className="mr-2 text-navy-600 flex-none">{leading}</span>}
        <input
          ref={ref}
          className={cn(
            "flex-1 bg-transparent outline-none text-[13px] text-cream placeholder:text-navy-600",
            className
          )}
          {...rest}
        />
      </div>
      {(error || helper) && (
        <div className={cn("mt-1 text-xs", error ? "text-severity-critical" : "text-navy-600")}>
          {error ?? helper}
        </div>
      )}
    </div>
  );
});
