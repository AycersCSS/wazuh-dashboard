import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  header?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}

/** design.md .card — bg-1, 1px border, 10px radius, 20px pad */
export function Card({ header, footer, padded = true, className, children }: Props) {
  return (
    <section className={cn("bg-navy-100 border border-navy-400 rounded-[10px] shadow-card", className)}>
      {header && (
        <header className="flex items-center justify-between gap-3 px-5 h-12 border-b border-navy-400">
          {header}
        </header>
      )}
      <div className={cn(padded ? "p-5" : "")}>{children}</div>
      {footer && (
        <footer className="px-5 h-11 border-t border-navy-400 flex items-center">{footer}</footer>
      )}
    </section>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className="text-[15px] font-medium text-sage truncate tracking-[-0.02em]">{children}</div>;
}

export function CardSubtitle({ children }: { children: ReactNode }) {
  return <div className="text-[12px] text-navy-600 truncate">{children}</div>;
}
