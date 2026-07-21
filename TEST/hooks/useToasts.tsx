"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type ToastVariant = "success" | "info" | "warn" | "error" | "action";
export type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
};

type Ctx = {
  push: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  toasts: Toast[];
};

const variantClass: Record<NonNullable<Toast["variant"]>, string> = {
  info:    "border-severity-info/40 bg-severity-info/15 text-sky-900",
  success: "border-emerald-400/40 bg-emerald-400/15 text-emerald-900",
  warn:    "border-severity-medium/40 bg-severity-medium/15 text-amber-900",
  error:   "border-severity-critical/40 bg-severity-critical/15 text-rose-900",
  action:  "border-severity-info/40 bg-severity-info/15 text-indigo-900"
};

const variantAccent: Record<NonNullable<Toast["variant"]>, string> = {
  info:    "text-severity-info",
  success: "text-emerald-400",
  warn:    "text-severity-medium",
  error:   "text-severity-critical",
  action:  "text-severity-info"
};

const ToastCtx = createContext<Ctx | null>(null);

export function useToasts() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToasts must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(curr => curr.filter(t => t.id !== id));
  }, []);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2, 10);
    const toast: Toast = { variant: "info", duration: 4000, ...t, id };
    setToasts(curr => [...curr, toast]);
    if (toast.duration && toast.duration > 0) {
      window.setTimeout(() => dismiss(id), toast.duration);
    }
    return id;
  }, [dismiss]);

  const value = useMemo<Ctx>(() => ({ push, dismiss, toasts }), [push, dismiss, toasts]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastCtx.Provider>
  );
}

function ToastViewport() {
  const ctx = useContext(ToastCtx);
  if (!ctx) return null;
  return (
    <div className="fixed z-[60] bottom-4 right-4 flex flex-col gap-2 w-[360px] max-w-[92vw] pointer-events-none">
      {ctx.toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={() => ctx.dismiss(t.id)} />)}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const variant = toast.variant ?? "info";
  const accent = variantClass[variant];
  const accentText = variantAccent[variant];

  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-auto bg-navy-100 border border-navy-400 border-l-2 shadow-pop rounded-lg p-3 flex items-start gap-2.5 animate-slide-up",
        accent
      )}
    >
      <span className={cn("mt-0.5 flex-none text-[10px] font-semibold uppercase", accentText)}>{variant}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] text-cream font-medium">{toast.title}</div>
        {toast.description && <div className="text-[11.5px] text-sage mt-0.5 leading-snug">{toast.description}</div>}
        {toast.actionLabel && toast.onAction && (
          <button type="button" onClick={() => { toast.onAction!(); onDismiss(); }} className="mt-1.5 text-[11.5px] text-emerald-400 hover:text-severity-info font-medium">
            {toast.actionLabel} -&gt;
          </button>
        )}
      </div>
      <button type="button" onClick={onDismiss} className="px-1.5 h-6 rounded text-[10px] text-navy-600 hover:text-sage hover:bg-navy-200" aria-label="Dismiss">
        close
      </button>
    </div>
  );
}
