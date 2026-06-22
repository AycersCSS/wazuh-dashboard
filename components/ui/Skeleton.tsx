import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("bg-slate-200 rounded-md animate-pulse-soft", className)} />;
}
