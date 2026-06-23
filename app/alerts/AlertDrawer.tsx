"use client";
import { useState } from "react";
import { Drawer, Button, Badge, Tabs, Card } from "@/components/ui";
import { ShieldCheck, AlertTriangle, Copy, Archive } from "lucide-react";
import { useToasts } from "@/hooks/useToasts";
import { useAcknowledge, useArchive, isAcked } from "@/hooks/useAlertsStore";
import { severityBucket, severityLabel } from "@/types";
import type { Alert } from "@/types";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/format";

export function AlertDrawer({ alert, open, onClose }: { alert: Alert | null; open: boolean; onClose: () => void }) {
  const toasts = useToasts();
  const ack = useAcknowledge();
  const archive = useArchive();
  const [escalate, setEscalate] = useState(false);

  if (!alert) return null;
  const tone = severityBucket(alert.rule.level) as "critical" | "high" | "medium" | "low" | "info";
  const acked = isAcked(alert.id);

  function copyId() {
    navigator.clipboard?.writeText(alert!.id);
    toasts.push({ variant: "success", title: "Copied", description: alert!.id });
  }
  function onAck() {
    ack([alert!.id]);
    toasts.push({ variant: "success", title: "Acknowledged", description: alert!.id });
  }
  function onArchive() {
    archive([alert!.id]);
    toasts.push({ variant: "info", title: "Archived", description: alert!.id });
  }
  function onEscalateConfirm() {
    setEscalate(false);
    toasts.push({ variant: "warn", title: "Escalated to L2", description: "PagerDuty incident #INC-4421 created" });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 min-w-0">
          <Badge tone={tone} dot>{severityLabel(alert.rule.level)} - {alert.rule.level}</Badge>
          <span className="font-mono text-xs text-navy-600 truncate">{alert.id}</span>
        </div>
      }
      actions={
        <>
          {!acked && <Button size="sm" variant="primary" onClick={onAck} icon={<ShieldCheck size={12} />}>Acknowledge</Button>}
          <Button size="sm" variant="secondary" onClick={() => setEscalate(true)} icon={<AlertTriangle size={12} />}>Escalate</Button>
          <Button size="sm" variant="ghost" onClick={onArchive} icon={<Archive size={12} />}>Archive</Button>
        </>
      }
    >
      <Tabs
        tabs={[
          {
            id: "event", label: "Event",
            content: (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-navy-600 mb-1">Description</div>
                  <div className="text-sm text-cream">{alert.rule.description}</div>
                </div>
                <div>
                  <div className="text-xs text-navy-600 mb-1">Raw event</div>
                  <pre className="text-xs bg-navy-100 border border-navy-400 rounded-lg p-3 overflow-x-auto text-sage">
{JSON.stringify({
  id: alert.id,
  timestamp: alert.timestamp,
  rule: alert.rule,
  agent: alert.agent,
  location: alert.location,
  decoder: alert.decoder,
  data: alert.data
}, null, 2)}
                  </pre>
                </div>
                <Button size="sm" variant="secondary" onClick={copyId} icon={<Copy size={12} />}>Copy ID</Button>
              </div>
            )
          },
          {
            id: "agent", label: "Agent",
            content: (
              <Card padded={false}>
                <div className="p-4 space-y-2">
                  <div className="text-sm font-semibold text-cream font-mono">{alert.agent.name}</div>
                  <div className="text-xs text-navy-600 font-mono">{alert.agent.ip}</div>
                  <div className="text-xs text-navy-600">Reported {formatRelativeTime(alert.timestamp)}</div>
                  <div className="pt-2"><Link href="/agents" className="text-xs text-emerald-400 hover:text-severity-info">View agent profile</Link></div>
                </div>
              </Card>
            )
          },
          {
            id: "mitre", label: "MITRE",
            content: alert.rule.mitre ? (
              <Card padded={false}>
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="info" dot>{alert.rule.mitre.id}</Badge>
                    <span className="text-sm font-semibold text-cream">{alert.rule.mitre.tactic}</span>
                  </div>
                  <div className="text-xs text-navy-600 font-mono">{alert.rule.mitre.technique}</div>
                  <div className="pt-2"><Link href="/mitre" className="text-xs text-emerald-400 hover:text-severity-info">View on coverage map</Link></div>
                </div>
              </Card>
            ) : <div className="text-sm text-navy-600">No MITRE mapping for this rule.</div>
          },
          {
            id: "related", label: "Related",
            content: (
              <div className="text-sm text-sage">Other alerts with rule {alert.rule.id} in the last 24h would appear here.</div>
            )
          }
        ]}
      />

      {escalate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <button type="button" aria-label="Close dialog" onClick={() => setEscalate(false)} className="absolute inset-0 bg-black/55" />
          <div className="relative bg-navy-100 border border-navy-400 rounded-xl shadow-drawer max-w-md w-full mx-4 p-5">
            <div className="text-base font-semibold text-cream">Escalate to L2</div>
            <div className="text-sm text-sage mt-2">
              {alert.id} ({severityLabel(alert.rule.level)} - {alert.rule.level}) will be sent to the on-call L2 analyst via PagerDuty. Continue?
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setEscalate(false)}>Cancel</Button>
              <Button variant="primary" onClick={onEscalateConfirm}>Send to L2</Button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
