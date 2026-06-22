"use client";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { IconBadge } from "./IconBadge";

export interface Crumb { href?: string; label: string; }

export function Page({
  breadcrumb, icon, title, description, actions, children
}: {
  breadcrumb?: Crumb[];
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <IconBadge icon={icon} tone="indigo" />
          <div className="min-w-0">
            {breadcrumb && breadcrumb.length > 0 && (
              <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                {breadcrumb.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {c.href ? <Link href={c.href} className="hover:text-slate-900">{c.label}</Link> : <span>{c.label}</span>}
                    {i < breadcrumb.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
                  </span>
                ))}
              </nav>
            )}
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 truncate">{title}</h1>
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
