"use client";
import { useState } from "react";
import { Drawer, Button, Badge, Tabs, Card, ConfirmDialog } from "@/components/ui";
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
          {!acked && <Button size="sm" variant="primary" onClick={onAck}>Acknowledge</Button>}
          <Button size="sm" variant="secondary" onClick={() => setEscalate(true)}>Escalate</Button>
          <Button size="sm" variant="ghost" onClick={onArchive}>Archive</Button>
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
                <Button size="sm" variant="secondary" onClick={copyId}>Copy ID</Button>
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

      <ConfirmDialog
        open={escalate}
        onClose={() => setEscalate(false)}
        onConfirm={onEscalateConfirm}
        title="Escalate to L2"
        body={`${alert.id} (${severityLabel(alert.rule.level)} - ${alert.rule.level}) will be sent to the on-call L2 analyst via PagerDuty. Continue?`}
        confirmLabel="Send to L2"
      />
    </Drawer>
  );
}
