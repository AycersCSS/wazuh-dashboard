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
      <div className="w-12 h-12 rounded-xl bg-navy-200 border border-navy-500 grid place-items-center mb-3">
        <Icon size={20} className="text-navy-600" />
      </div>
      <div className="text-sm font-semibold text-cream">{title}</div>
      {description && <div className="text-xs text-navy-600 mt-1 max-w-sm">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
