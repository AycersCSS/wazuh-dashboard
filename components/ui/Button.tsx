"use client";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary:   "bg-indigo-600 text-white border-transparent hover:bg-indigo-700",
  secondary: "bg-white text-slate-900 border-slate-200 hover:bg-slate-50 hover:border-slate-300",
  ghost:     "bg-transparent text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900",
  danger:    "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
};

const sizeClass: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  md: "h-9 px-3 text-sm gap-2 rounded-lg",
  lg: "h-11 px-4 text-base gap-2 rounded-lg"
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
});
