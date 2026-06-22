"use client";
import { Server, ShieldAlert } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/format";
import { agentIsolation } from "@/hooks/useAlertsStore";
import type { Agent } from "@/types";

const statusClass: Record<string, { dot: string; text: string }> = {
  active:           { dot: "bg-emerald-500", text: "text-emerald-700" },
  pending:          { dot: "bg-amber-500",   text: "text-amber-700" },
  disconnected:     { dot: "bg-slate-300",   text: "text-slate-500" },
  never_connected:  { dot: "bg-rose-500",    text: "text-rose-600" }
};

export function AgentCard({ agent, alertCount, onClick }: { agent: Agent; alertCount: number; onClick: () => void }) {
  const s = statusClass[agent.status];
  const iso = agentIsolation(agent.id);
  return (
    <button type="button" onClick={onClick} className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-xl">
      <Card className="hover:border-slate-300 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 grid place-items-center">
              <Server size={16} className="text-slate-500" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-mono text-slate-900 truncate">{agent.name}</div>
              <div className="text-[11px] font-mono text-slate-500 truncate">{agent.ip}</div>
            </div>
          </div>
          {iso === "isolated" && <Badge tone="high" dot>isolated</Badge>}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className={cn("inline-flex items-center gap-1.5", s.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", s.dot, agent.status === "active" && "animate-pulse-soft")} />
            {agent.status.replace("_", " ")}
          </div>
          <div className="text-slate-500">{agent.os.name} {agent.os.version}</div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="inline-flex items-center gap-1.5 text-slate-500">
            <ShieldAlert size={12} /> <span className="font-mono text-slate-900">{alertCount}</span> alerts
          </div>
          <div className="text-slate-500">{formatRelativeTime(agent.lastKeepAlive)}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {agent.group.map(g => <span key={g} className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] bg-slate-100 text-slate-600 border border-slate-200">{g}</span>)}
        </div>
      </Card>
    </button>
  );
}
