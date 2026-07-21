"use client";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

/** design.md .btn — 34px, 8px radius, 13px/500; primary = accent + dark text */
const variantClass: Record<Variant, string> = {
  primary: "bg-emerald-400 text-[#121212] border-transparent hover:bg-emerald-500",
  secondary: "bg-transparent text-cream border-navy-400 hover:bg-navy-200 hover:border-navy-500",
  ghost: "bg-transparent text-sage border-transparent hover:bg-navy-200 hover:text-cream",
  danger: "bg-severity-critical/15 text-severity-critical border-severity-critical/40 hover:bg-severity-critical/25",
};

const sizeClass: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12px] gap-1.5 rounded-md",
  md: "h-[34px] px-3 text-[13px] gap-2 rounded-lg font-medium",
  lg: "h-11 px-4 text-base gap-2 rounded-lg font-medium",
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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
