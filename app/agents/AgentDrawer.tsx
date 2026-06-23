"use client";
import { useState } from "react";
import { Drawer, Button, Card, Badge, Tabs } from "@/components/ui";
import { Server, PowerOff, Lock, FileText } from "lucide-react";
import { useToasts } from "@/hooks/useToasts";
import { useIsolateAgent, agentIsolation } from "@/hooks/useAlertsStore";
import { formatRelativeTime } from "@/lib/format";
import Link from "next/link";
import { alerts, fimEvents, vulnerabilities } from "@/data/seed";
import type { Agent } from "@/types";

export function AgentDrawer({ agent, open, onClose }: { agent: Agent | null; open: boolean; onClose: () => void }) {
  const toasts = useToasts();
  const isolate = useIsolateAgent();
  const [confirm, setConfirm] = useState<null | "isolate" | "restart">(null);

  if (!agent) return null;
  const iso = agentIsolation(agent.id);
  const myAlerts = alerts.filter(a => a.agent.id === agent.id).slice(0, 8);
  const myFim    = fimEvents.filter(f => f.agent === agent.name).slice(0, 5);
  const myVulns  = vulnerabilities.filter(v => v.agentCount > 0).slice(0, 5);

  function doIsolate() {
    isolate(agent!.id, "isolated");
    toasts.push({ variant: "warn", title: "Agent isolated", description: agent!.name });
    setConfirm(null);
  }
  function doRestart() {
    toasts.push({ variant: "info", title: "Restart requested", description: `${agent!.name} - will report in ~60s` });
    setConfirm(null);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-navy-200 border border-navy-400 grid place-items-center"><Server size={16} className="text-navy-600" /></div>
          <div className="min-w-0">
            <div className="text-sm font-mono text-cream truncate">{agent.name}</div>
            <div className="text-[11px] font-mono text-navy-600 truncate">{agent.ip} - {agent.os.name} {agent.os.version}</div>
          </div>
        </div>
      }
      actions={
        <>
          <Button size="sm" variant={iso === "isolated" ? "primary" : "secondary"} onClick={() => setConfirm("isolate")} icon={<Lock size={12} />}>
            {iso === "isolated" ? "Unisolate" : "Isolate"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setConfirm("restart")} icon={<PowerOff size={12} />}>Restart</Button>
        </>
      }
    >
      <Tabs
        tabs={[
          { id: "overview", label: "Overview", content: (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><div className="text-navy-600">Status</div><div className="text-cream">{agent.status.replace("_", " ")}</div></div>
                <div><div className="text-navy-600">Last seen</div><div className="text-cream">{formatRelativeTime(agent.lastKeepAlive)}</div></div>
                <div><div className="text-navy-600">Region</div><div className="text-cream">{agent.region}</div></div>
                <div><div className="text-navy-600">Manager</div><div className="text-cream">{agent.manager}</div></div>
                <div><div className="text-navy-600">Version</div><div className="text-cream font-mono">{agent.version}</div></div>
                <div><div className="text-navy-600">Arch</div><div className="text-cream font-mono">{agent.os.arch}</div></div>
              </div>
              <div>
                <div className="text-xs text-navy-600 mb-1">Groups</div>
                <div className="flex flex-wrap gap-1">
                  {agent.group.map(g => <span key={g} className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] bg-navy-200 text-sage border border-navy-400">{g}</span>)}
                </div>
              </div>
            </div>
          )},
          { id: "alerts", label: `Alerts (${myAlerts.length})`, content: (
            myAlerts.length === 0 ? <div className="text-sm text-navy-600">No recent alerts.</div> : (
              <ul className="divide-y divide-navy-400/60 -mx-1">
                {myAlerts.map(a => (
                  <li key={a.id} className="px-1 py-2 text-xs flex items-center gap-2">
                    <Badge tone={a.rule.level >= 13 ? "critical" : a.rule.level >= 10 ? "high" : a.rule.level >= 7 ? "medium" : "low"} dot>{a.rule.level}</Badge>
                    <span className="font-mono text-navy-600">{a.id}</span>
                    <span className="text-cream truncate flex-1">{a.rule.description}</span>
                    <span className="text-navy-600">{formatRelativeTime(a.timestamp)}</span>
                  </li>
                ))}
              </ul>
            )
          )},
          { id: "fim", label: `FIM (${myFim.length})`, content: (
            myFim.length === 0 ? <div className="text-sm text-navy-600">No FIM events.</div> : (
              <ul className="divide-y divide-navy-400/60 -mx-1">
                {myFim.map(f => (
                  <li key={f.id} className="px-1 py-2 text-xs flex items-center gap-2">
                    <FileText size={12} className="text-navy-600" />
                    <span className="font-mono text-sage">{f.path}</span>
                    <span className="text-navy-600 ml-auto">{f.action}</span>
                    <span className="text-navy-600">{formatRelativeTime(f.timestamp)}</span>
                  </li>
                ))}
              </ul>
            )
          )},
          { id: "vulns", label: `Vulnerabilities (${myVulns.length})`, content: (
            <ul className="divide-y divide-navy-400/60 -mx-1">
              {myVulns.map(v => (
                <li key={v.cve} className="px-1 py-2 text-xs flex items-center gap-2">
                  <Badge tone={v.severity} dot>{v.severity}</Badge>
                  <span className="font-mono text-sage">{v.cve}</span>
                  <span className="text-cream truncate flex-1">{v.title}</span>
                </li>
              ))}
            </ul>
          )}
        ]}
      />

      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <button type="button" aria-label="Close dialog" onClick={() => setConfirm(null)} className="absolute inset-0 bg-black/55" />
          <div className="relative bg-navy-100 border border-navy-400 rounded-xl shadow-drawer max-w-md w-full mx-4 p-5">
            <div className="text-base font-semibold text-cream">{confirm === "isolate" ? "Isolate agent" : "Restart agent"}</div>
            <div className="text-sm text-sage mt-2">
              {confirm === "isolate"
                ? `${agent.name} will be cut off from the network. Investigate before isolating.`
                : `${agent.name} will be restarted. Active sessions will be dropped.`}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button variant="primary" onClick={confirm === "isolate" ? doIsolate : doRestart}>
                {confirm === "isolate" ? "Isolate" : "Restart"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
