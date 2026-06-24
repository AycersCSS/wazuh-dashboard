import type { ReactNode } from "react";

export function EmptyState({
  title, description, action
}: {
  icon?: unknown;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="text-sm font-semibold text-cream">{title}</div>
      {description && <div className="text-xs text-navy-600 mt-1 max-w-sm">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
