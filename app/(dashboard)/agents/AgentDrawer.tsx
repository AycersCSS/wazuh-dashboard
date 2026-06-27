"use client";
import { useState } from "react";
import { Drawer, Button, Badge, Tabs, ConfirmDialog } from "@/components/ui";
import { useToasts } from "@/hooks/useToasts";
import { useIsolateAgent, agentIsolation } from "@/hooks/useAlertsStore";
import { useAudit } from "@/hooks/useAudit";
import { formatRelativeTime } from "@/lib/format";
import Link from "next/link";
import { alerts, fimEvents, vulnerabilities } from "@/data/seed";
import type { Agent } from "@/types";

export function AgentDrawer({ agent, open, onClose }: { agent: Agent | null; open: boolean; onClose: () => void }) {
  const toasts = useToasts();
  const isolate = useIsolateAgent();
  const audit = useAudit();
  const [confirm, setConfirm] = useState<null | "isolate" | "restart">(null);

  if (!agent) return null;
  const iso = agentIsolation(agent.id);
  const myAlerts = alerts.filter(a => a.agent.id === agent.id).slice(0, 8);
  const myFim    = fimEvents.filter(f => f.agent === agent.name).slice(0, 5);
  const myVulns  = vulnerabilities.filter(v => v.agentCount > 0).slice(0, 5);

  function doIsolate() {
    const next = iso === "isolated" ? "unisolate" : "isolate";
    audit.record({
      scope: "agent",
      type: next === "isolate" ? "agent.isolate" : "agent.unisolate",
      summary: `${next === "isolate" ? "Isolated" : "Unisolated"} agent ${agent!.name} (${agent!.ip})`,
      outcome: "success",
      target: { kind: "agent", id: agent!.id },
      meta: { agentName: agent!.name, ip: agent!.ip, os: agent!.os.name, action: next }
    });
    isolate(agent!.id, "isolated");
    toasts.push({ variant: "warn", title: next === "isolate" ? "Agent isolated" : "Agent released", description: agent!.name });
    setConfirm(null);
  }
  function doRestart() {
    audit.record({
      scope: "agent",
      type: "agent.restart",
      summary: `Restart requested for ${agent!.name}`,
      outcome: "requested",
      target: { kind: "agent", id: agent!.id },
      meta: { agentName: agent!.name, ip: agent!.ip }
    });
    toasts.push({ variant: "info", title: "Restart requested", description: `${agent!.name} - will report in ~60s` });
    setConfirm(null);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-navy-200 border border-navy-400 grid place-items-center text-[10px] font-mono text-navy-600">
            {agent.os.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-mono text-cream truncate">{agent.name}</div>
            <div className="text-[11px] font-mono text-navy-600 truncate">{agent.ip} - {agent.os.name} {agent.os.version}</div>
          </div>
        </div>
      }
      actions={
        <>
          <Button size="sm" variant={iso === "isolated" ? "primary" : "secondary"} onClick={() => setConfirm("isolate")}>
            {iso === "isolated" ? "Unisolate" : "Isolate"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setConfirm("restart")}>Restart</Button>
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
                    <span className="text-[10px] font-mono text-navy-600 uppercase">FIM</span>
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

      <ConfirmDialog
        open={confirm === "isolate"}
        onClose={() => setConfirm(null)}
        onConfirm={doIsolate}
        title="Isolate agent"
        body={`${agent.name} will be cut off from the network. Investigate before isolating.`}
        confirmLabel="Isolate"
      />
      <ConfirmDialog
        open={confirm === "restart"}
        onClose={() => setConfirm(null)}
        onConfirm={doRestart}
        title="Restart agent"
        body={`${agent.name} will be restarted. Active sessions will be dropped.`}
        confirmLabel="Restart"
      />
    </Drawer>
  );
}
