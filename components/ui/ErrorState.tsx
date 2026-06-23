import { AlertOctagon } from "lucide-react";
import { Button } from "./Button";

export function ErrorState({ title = "Something went wrong", description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-xl bg-severity-critical/15 border border-severity-critical/40 grid place-items-center mb-3">
        <AlertOctagon size={20} className="text-severity-critical" />
      </div>
      <div className="text-sm font-semibold text-cream">{title}</div>
      {description && <div className="text-xs text-navy-600 mt-1 max-w-sm">{description}</div>}
      {onRetry && <div className="mt-4"><Button variant="secondary" onClick={onRetry}>Retry</Button></div>}
    </div>
  );
}
