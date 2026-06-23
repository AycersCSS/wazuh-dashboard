"use client";
import React, { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  actions?: ReactNode;
  width?: "md" | "lg" | "xl";
  children: ReactNode;
}

const widthClass = { md: "max-w-md", lg: "max-w-xl", xl: "max-w-2xl" };

export function Drawer({ open, onClose, title, actions, width = "lg", children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => ref.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      lastFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" data-testid="backdrop" aria-label="Close drawer" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={cn(
          "absolute right-0 top-0 bottom-0 w-full bg-navy-100 shadow-drawer flex flex-col animate-slide-in-right focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
          widthClass[width]
        )}
      >
        {(title || actions) && (
          <header className="flex items-center justify-between gap-3 px-5 h-14 border-b border-navy-400">
            <div className="text-sm font-semibold text-cream truncate">{title}</div>
            <div className="flex items-center gap-2">
              {actions}
              <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-md text-navy-600 hover:text-cream hover:bg-navy-200">
                <X size={16} />
              </button>
            </div>
          </header>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
