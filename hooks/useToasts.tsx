"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X, ShieldAlert } from "lucide-react";
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
  info:    "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warn:    "border-amber-200 bg-amber-50 text-amber-900",
  error:   "border-rose-200 bg-rose-50 text-rose-900",
  action:  "border-indigo-200 bg-indigo-50 text-indigo-900"
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
  const Icon = variant === "success" ? CheckCircle2
    : variant === "warn" ? AlertTriangle
    : variant === "error" ? ShieldAlert
    : variant === "action" ? CheckCircle2
    : Info;
  const accent = variantClass[variant];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-auto bg-white border border-slate-200 border-l-2 shadow-pop rounded-lg p-3 flex items-start gap-2.5 animate-slide-up",
        accent
      )}
    >
      <Icon size={14} className="mt-0.5 flex-none" />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] text-slate-900 font-medium">{toast.title}</div>
        {toast.description && <div className="text-[11.5px] text-slate-600 mt-0.5 leading-snug">{toast.description}</div>}
        {toast.actionLabel && toast.onAction && (
          <button type="button" onClick={() => { toast.onAction!(); onDismiss(); }} className="mt-1.5 text-[11.5px] text-indigo-600 hover:text-indigo-700 font-medium">
            {toast.actionLabel} →
          </button>
        )}
      </div>
      <button type="button" onClick={onDismiss} className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Dismiss">
        <X size={12} />
      </button>
    </div>
  );
}
