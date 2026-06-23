"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Modal({
  open, onClose, title, subtitle, children, footer, size = "md"
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => ref.current?.focus(), 30);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;
  const w = size === "sm" ? "max-w-[420px]" : size === "lg" ? "max-w-[820px]" : "max-w-[560px]";

  return (
    <div className="fixed inset-0 z-50 animate-slide-in-right" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
      <button type="button" aria-label="Close dialog" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div className="relative grid h-full place-items-center p-4">
        <div
          ref={ref}
          tabIndex={-1}
          className={cn("relative w-full bg-navy-100 border border-navy-500 rounded-xl shadow-drawer outline-none text-cream", w)}
        >
          {(title || subtitle) && (
            <header className="flex items-start justify-between gap-3 p-4 border-b border-navy-400">
              <div>
                {title && <div className="text-base font-semibold text-cream">{title}</div>}
                {subtitle && <div className="text-sm text-sage mt-0.5">{subtitle}</div>}
              </div>
              <button type="button" onClick={onClose} className="p-1 rounded-md text-navy-600 hover:text-cream hover:bg-navy-200" aria-label="Close"><X size={14} /></button>
            </header>
          )}
          <div className="p-4">{children}</div>
          {footer && <footer className="flex items-center justify-end gap-2 p-3 border-t border-navy-400">{footer}</footer>}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, body, confirmLabel = "Confirm", danger = false
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <button type="button" className="px-3 h-9 rounded-md bg-navy-100 text-sage border border-navy-400 hover:bg-navy-200 text-sm font-medium" onClick={onClose}>Cancel</button>
          <button type="button"
            className={danger
              ? "px-3 h-9 rounded-md bg-severity-critical text-cream hover:brightness-110 text-sm font-medium"
              : "px-3 h-9 rounded-md bg-emerald-500 text-[#0A2947] hover:bg-emerald-600 text-sm font-medium"}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-sage">{body}</div>
    </Modal>
  );
}
