"use client";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Tab { id: string; label: ReactNode; content: ReactNode; }
interface Props { tabs: Tab[]; defaultId?: string; }

export function Tabs({ tabs, defaultId }: Props) {
  const [active, setActive] = useState(defaultId ?? tabs[0]?.id);
  const current = tabs.find(t => t.id === active) ?? tabs[0];
  return (
    <div>
      <div role="tablist" aria-orientation="horizontal" className="flex gap-1 border-b border-navy-400">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            onClick={() => setActive(t.id)}
            className={cn(
              "px-3 h-9 text-sm font-medium border-b-2 -mb-px transition-colors",
              t.id === active
                ? "border-emerald-400 text-cream"
                : "border-transparent text-navy-600 hover:text-sage"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-4">{current?.content}</div>
    </div>
  );
}
