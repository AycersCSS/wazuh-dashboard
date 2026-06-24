"use client";
import type { ReactNode } from "react";
import { Button } from "./Button";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <button type="button" aria-label="Close dialog" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative bg-navy-100 border border-navy-400 rounded-xl shadow-drawer max-w-md w-full mx-4 p-5">
        <div className="text-base font-semibold text-cream">{title}</div>
        {body && <div className="text-sm text-sage mt-2">{body}</div>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>{cancelLabel}</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
