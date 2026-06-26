"use client";
import { useEffect, useState, useRef } from "react";
import { Page, Card, Badge, EmptyState } from "@/components/ui";
import type { LogLine, Severity } from "@/lib/wazuh/types";
import { cn } from "@/lib/cn";

const SEV_TONE: Record<Severity, "critical" | "high" | "medium" | "low" | "info"> = {
  critical: "critical", high: "high", medium: "medium", low: "low", info: "info"
};

export default function LogsPage() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch("/api/wazuh/logs")
        .then(r => r.json())
        .then((j: { ok: boolean; data?: LogLine[]; error?: string }) => {
          if (cancelled) return;
          if (!j.ok || !j.data) {
            setError(j.error ?? "load_failed");
            return;
          }
          setLines(j.data);
          setError(null);
        })
        .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "load_failed"); });
    }
    load();
    const id = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  return (
    <Page
      breadcrumb={[{ label: "Monitor" }, { label: "Logs" }]}
      title="Live logs"
      description="Streaming agent logs. Refreshes every 5 seconds."
    >
      <Card padded={false}
        header={
          <>
            <div>
              <div className="text-sm font-semibold text-cream">Log stream</div>
              <div className="text-[10.5px] uppercase tracking-wider text-navy-600 font-semibold">tenant</div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-navy-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
              <span>live</span>
            </div>
          </>
        }
        footer={
          <span className="text-[10.5px] text-navy-600 font-mono">
            {lines.length} lines buffered - 5s refresh
          </span>
        }
      >
        {error && <div className="p-4 text-severity-critical text-sm">Failed: {error}</div>}
        {lines.length === 0 && !error && <EmptyState title="Waiting for logs..." />}
        <div ref={ref} className="font-mono text-[11.5px] max-h-[60vh] overflow-auto p-3 space-y-0.5 bg-navy border-t border-navy-400">
          {lines.map(l => (
            <div key={l.id} className="flex items-start gap-2">
              <span className="text-navy-600 shrink-0 w-[68px]">{new Date(l.timestamp).toLocaleTimeString()}</span>
              <span className="shrink-0"><Badge tone={SEV_TONE[l.level]}>{l.level}</Badge></span>
              <span className="text-sage shrink-0 w-[140px] truncate">{l.agentId}</span>
              <span className="text-cream flex-1 break-all">{l.message}</span>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}
