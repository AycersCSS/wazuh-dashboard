import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon, title, description, action
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 grid place-items-center mb-3">
        <Icon size={20} className="text-slate-400" />
      </div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {description && <div className="text-xs text-slate-500 mt-1 max-w-sm">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
