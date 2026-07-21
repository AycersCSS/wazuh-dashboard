"use client";
import Link from "next/link";
import type { ReactNode } from "react";

export interface Crumb {
  href?: string;
  label: string;
}

/** design.md page header + 28px breadcrumb strip feel */
export function Page({
  breadcrumb,
  title,
  description,
  actions,
  children,
}: {
  breadcrumb?: Crumb[];
  icon?: unknown;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="min-w-0">
            {breadcrumb && breadcrumb.length > 0 && (
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1 h-7 text-[11px] uppercase tracking-[0.08em] text-navy-600 mb-1"
              >
                {breadcrumb.map((c, i) => (
                  <span key={c.href ?? c.label} className="flex items-center gap-1">
                    {c.href ? (
                      <Link href={c.href} className="hover:text-cream transition-colors">
                        {c.label}
                      </Link>
                    ) : (
                      <span className="text-sage">{c.label}</span>
                    )}
                    {i < breadcrumb.length - 1 && <span className="text-navy-600/70">/</span>}
                  </span>
                ))}
              </nav>
            )}
            <h1 className="text-[26px] leading-8 font-medium tracking-[-0.02em] text-cream truncate">
              {title}
            </h1>
            {description && <p className="text-[13px] text-navy-600 mt-1">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
