import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  header?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({ header, footer, padded = true, className, children }: Props) {
  return (
    <section className={cn("bg-navy-100 border border-navy-400 rounded-xl shadow-card", className)}>
      {header && <header className="flex items-center justify-between gap-3 px-4 h-11 border-b border-navy-400">{header}</header>}
      <div className={cn(padded ? "p-4" : "")}>{children}</div>
      {footer && <footer className="px-4 h-10 border-t border-navy-400 flex items-center">{footer}</footer>}
    </section>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className="text-sm font-semibold text-cream truncate">{children}</div>;
}
export function CardSubtitle({ children }: { children: ReactNode }) {
  return <div className="text-xs text-navy-600 truncate">{children}</div>;
}
