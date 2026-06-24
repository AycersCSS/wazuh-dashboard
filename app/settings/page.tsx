"use client";
import { useState } from "react";
import { Page, Card, CardTitle, Button, Badge, Tooltip } from "@/components/ui";
import { useToasts } from "@/hooks/useToasts";
import { useReset, useAlertsStore } from "@/hooks/useAlertsStore";
import { alerts } from "@/data/seed";

const integrations = [
  { name: "VirusTotal",   status: "connected",  desc: "Hash and URL lookups" },
  { name: "Slack",        status: "connected",  desc: "Critical alert notifications" },
  { name: "PagerDuty",    status: "connected",  desc: "On-call escalation" },
  { name: "Jira",         status: "disconnected", desc: "Ticket creation" }
];

export default function SettingsPage() {
  const toasts = useToasts();
  const reset = useReset();
  useAlertsStore();
  const [confirmReset, setConfirmReset] = useState(false);

  function doExport() {
    try {
      const data = { alerts, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `sentinel-stack-alerts-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toasts.push({ variant: "success", title: "Export complete", description: `${alerts.length} alerts downloaded` });
    } catch (e) {
      toasts.push({ variant: "error", title: "Export failed" });
    }
  }

  return (
    <Page
      breadcrumb={[{ label: "Configure" }, { label: "Settings" }]}
      title="Settings"
      description="Cluster, integrations, profile, and data"
    >
      <Card padded={false}>
        <div className="px-4 h-11 flex items-center border-b border-navy-400">
          <CardTitle>Cluster</CardTitle>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-navy-600">Manager</span><span className="font-mono text-cream">prod-01</span></div>
          <div className="flex items-center justify-between"><span className="text-navy-600">Workers</span><span className="font-mono text-cream">3 / 3</span></div>
          <div className="flex items-center justify-between"><span className="text-navy-600">Indexer</span><span className="font-mono text-cream">opensearch 2.15</span></div>
          <div className="flex items-center justify-between"><span className="text-navy-600">API latency p95</span><span className="font-mono text-cream">38 ms</span></div>
        </div>
      </Card>

      <Card padded={false}>
        <div className="px-4 h-11 flex items-center border-b border-navy-400">
          <CardTitle>Integrations</CardTitle>
        </div>
        <ul className="divide-y divide-navy-400/60">
          {integrations.map(i => (
            <li key={i.name} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-cream">{i.name}</div>
                <div className="text-xs text-navy-600">{i.desc}</div>
              </div>
              <Badge tone={i.status === "connected" ? "low" : "neutral"} dot>{i.status}</Badge>
              <Button size="sm" variant="secondary" onClick={() => toasts.push({ variant: "info", title: `Configuring ${i.name} (coming soon)` })}>Configure</Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card padded={false}>
        <div className="px-4 h-11 flex items-center border-b border-navy-400">
          <CardTitle>Profile</CardTitle>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-cream">Theme</div>
              <div className="text-xs text-navy-600">Light is the only supported theme this release.</div>
            </div>
            <Tooltip content="Dark mode coming soon"><span><Badge tone="neutral">Light (locked)</Badge></span></Tooltip>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-cream">Default time range</div>
              <div className="text-xs text-navy-600">Used when you open a page.</div>
            </div>
            <span className="text-sage">Last 24 hours</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-cream">Default environment</div>
              <div className="text-xs text-navy-600">Selected at sign-in.</div>
            </div>
            <span className="text-sage">production - us-east-1</span>
          </div>
        </div>
      </Card>

      <Card padded={false}>
        <div className="px-4 h-11 flex items-center border-b border-navy-400">
          <CardTitle>Data</CardTitle>
        </div>
        <div className="p-4 flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={doExport}>Export alerts as JSON</Button>
          <Button variant="danger" onClick={() => setConfirmReset(true)}>Reset to defaults</Button>
        </div>
      </Card>

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button type="button" aria-label="Close dialog" onClick={() => setConfirmReset(false)} className="absolute inset-0 bg-black/55" />
          <div className="relative bg-navy-100 border border-navy-400 rounded-xl shadow-drawer max-w-md w-full mx-4 p-5">
            <div className="text-base font-semibold text-cream">Reset to defaults?</div>
            <div className="text-sm text-sage mt-2">This clears all your acknowledgements, archived alerts, rule toggles, and CVE status changes. The page will reload.</div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => { reset(); toasts.push({ variant: "success", title: "Reset complete" }); setConfirmReset(false); }}>Reset</Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
