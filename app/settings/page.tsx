"use client";
import { useState } from "react";
import { Settings as SettingsIcon, Server, KeyRound, Bell, Palette, Save, Plus, Trash2, Copy, RefreshCcw, Eye, EyeOff, Check } from "lucide-react";
import { Panel } from "@/components/ui/primitives";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/cn";
import { useToasts } from "@/hooks/useToasts";
import { ConfirmDialog, Modal } from "@/components/Modal";

const sections = [
  { id: "general",  label: "General",       icon: SettingsIcon },
  { id: "cluster",  label: "Cluster",       icon: Server },
  { id: "api",      label: "API & Tokens",  icon: KeyRound },
  { id: "notif",    label: "Notifications", icon: Bell },
  { id: "appearance",label: "Appearance",    icon: Palette }
] as const;

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const toasts = useToasts();
  const [active, setActive] = useState<typeof sections[number]["id"]>("general");
  const [slackHook, setSlackHook] = useState("https://hooks.slack.com/services/REPLACE/WITH/YOUR-PATH");
  const [pdKey, setPdKey] = useState("+1 555 0188 4421");
  const [env, setEnv] = useState("us-east-1");
  const [tz, setTz] = useState("UTC");
  const [dateFmt, setDateFmt] = useState("YYYY-MM-DD HH:mm:ss");
  const [density, setDensity] = useState<"Compact"|"Comfortable"|"Spacious">("Comfortable");
  const [showToken, setShowToken] = useState(false);
  const [rotated, setRotated] = useState(false);
  const [notifToggles, setNotifToggles] = useState<{ name: string; channel: string; enabled: boolean }[]>([
    { name: "Critical alerts", channel: "Slack + PagerDuty", enabled: true },
    { name: "Agent down > 15m", channel: "Slack",            enabled: true },
    { name: "Daily digest",     channel: "Email",            enabled: true },
    { name: "Rule errors",      channel: "Slack",            enabled: false }
  ]);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [addingNode, setAddingNode] = useState(false);
  const [newNodeName, setNewNodeName] = useState("manager-prod-04");

  function save() {
    toasts.push({ variant: "success", title: "Settings saved", description: "All sections persisted to user profile" });
  }

  function rotateToken() {
    setRotated(true);
    toasts.push({ variant: "warn", title: "Token rotated", description: "All API clients must re-authenticate within 60s" });
  }

  function copyToken() {
    navigator.clipboard?.writeText("waz_api_***-REDACTED-***");
    toasts.push({ variant: "success", title: "Token copied to clipboard", duration: 1500 });
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2 text-[11px] text-muted font-mono uppercase tracking-wider">
          <span className="text-signal-400">Configure</span><span>·</span><span>Settings</span>
        </div>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight">Settings</h1>
        <p className="text-[12.5px] text-muted">Manage cluster, integrations, and personal preferences.</p>
      </header>

      <div className="grid grid-cols-12 gap-5">
        <aside className="col-span-12 lg:col-span-3">
          <Panel>
            <nav className="p-1.5">
              {sections.map(s => {
                const Icon = s.icon;
                return (
                  <button type="button" key={s.id} onClick={() => setActive(s.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 h-8 px-2.5 rounded-md text-[12.5px] transition-colors",
                      active === s.id ? "surface-3 text-primary" : "text-secondary hover:text-primary hover:surface-2"
                    )}>
                    <Icon size={14} className={active === s.id ? "text-signal-400" : "text-muted"} />
                    {s.label}
                  </button>
                );
              })}
            </nav>
          </Panel>
        </aside>

        <div className="col-span-12 lg:col-span-9 space-y-5">
          {active === "general" && (
            <Panel title="General" subtitle="Defaults for new sessions and dashboards">
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Default time range">
                  <select className="input input-noicon"><option>Last 1 hour</option><option>Last 24 hours</option><option>Last 7 days</option><option>Last 30 days</option></select>
                </Field>
                <Field label="Default environment">
                  <select className="input input-noicon" value={env} onChange={e => setEnv(e.target.value)}>
                    <option>us-east-1</option><option>us-west-2</option><option>eu-west-1</option><option>ap-southeast-1</option>
                  </select>
                </Field>
                <Field label="Timezone">
                  <select className="input input-noicon" value={tz} onChange={e => setTz(e.target.value)}>
                    <option>UTC</option><option>Europe/Istanbul</option><option>America/New_York</option><option>Asia/Tokyo</option>
                  </select>
                </Field>
                <Field label="Date format">
                  <select className="input input-noicon" value={dateFmt} onChange={e => setDateFmt(e.target.value)}>
                    <option>YYYY-MM-DD HH:mm:ss</option><option>MMM d, h:mm a</option><option>DD/MM/YYYY</option>
                  </select>
                </Field>
              </div>
            </Panel>
          )}

          {active === "cluster" && (
            <Panel title="Cluster nodes" subtitle="3 nodes · 1 master / 2 workers"
              actions={<button onClick={() => setAddingNode(true)} className="btn btn-sm"><Plus size={11} />Add node</button>}
              flush
            >
              <ul className="divide-y divide-[var(--border-soft)]">
                {[
                  { name: "manager-prod-01", role: "master",  status: "ok", uptime: "41d 06h" },
                  { name: "manager-prod-02", role: "worker",  status: "ok", uptime: "12d 19h" },
                  { name: "manager-prod-03", role: "worker",  status: "warn", uptime: "03h 22m" }
                ].map(n => (
                  <li key={n.name} className="px-4 py-3 flex items-center gap-3">
                    <span className={n.status === "ok" ? "live-dot" : "live-dot-warn"} />
                    <div className="flex-1">
                      <div className="text-[12.5px] text-primary font-mono">{n.name}</div>
                      <div className="text-[10.5px] text-muted">role: {n.role} · uptime {n.uptime}</div>
                    </div>
                    <button onClick={() => toasts.push({ variant: "info", title: `Restarting ${n.name}…` })} className="btn btn-sm">Restart</button>
                    <button onClick={() => setConfirmRemove(n.name)} className="btn btn-sm btn-danger"><Trash2 size={11} />Remove</button>
                  </li>
                ))}
              </ul>
              <ConfirmDialog
                open={!!confirmRemove}
                onClose={() => setConfirmRemove(null)}
                title={`Remove ${confirmRemove}?`}
                danger
                body="The node will be decommissioned and removed from the cluster. This cannot be undone."
                confirmLabel="Decommission"
                onConfirm={() => toasts.push({ variant: "warn", title: `Node ${confirmRemove} removed` })}
              />
            </Panel>
          )}

          {active === "api" && (
            <Panel title="API & Tokens" subtitle="Use these tokens to integrate with external systems.">
              <div className="p-4 space-y-3">
                <div className="panel p-3">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted">Wazuh API token</div>
                  <div className="font-mono text-[12px] text-primary mt-1 break-all flex items-center gap-2">
                    {showToken
                      ? "waz_api_•••live•••" + Math.random().toString(36).slice(2, 10)
                      : "waz_api_••••••••••••••••••••••••••••••"}
                    <button type="button" onClick={() => setShowToken(s => !s)} className="btn btn-sm btn-icon btn-ghost" aria-label="Toggle visibility">
                      {showToken ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" onClick={rotateToken} className="btn btn-sm"><RefreshCcw size={11} className={rotated ? "animate-spin" : ""} />Rotate</button>
                    <button type="button" onClick={copyToken} className="btn btn-sm"><Copy size={11} />Copy</button>
                    {rotated && <span className="text-[11px] text-low flex items-center gap-1"><Check size={11} />Rotated just now</span>}
                  </div>
                </div>
                <Field label="Slack webhook">
                  <div className="flex gap-2">
                    <input className="input input-noicon" value={slackHook} onChange={e => setSlackHook(e.target.value)} />
                    <button onClick={() => toasts.push({ variant: "success", title: "Test ping sent", description: "Slack channel: #soc-alerts" })} className="btn">Test</button>
                  </div>
                </Field>
                <Field label="PagerDuty key">
                  <div className="flex gap-2">
                    <input className="input input-noicon" value={pdKey} onChange={e => setPdKey(e.target.value)} />
                    <button onClick={() => toasts.push({ variant: "success", title: "Test page sent", description: "PagerDuty: on-call L2" })} className="btn">Test</button>
                  </div>
                </Field>
              </div>
            </Panel>
          )}

          {active === "notif" && (
            <Panel title="Notifications" subtitle="Channels and rules">
              <div className="p-4 space-y-2">
                {notifToggles.map((n, i) => (
                  <div key={n.name} className="panel p-3 flex items-center gap-3">
                    <Bell size={14} className="text-muted" />
                    <div className="flex-1">
                      <div className="text-[12.5px] text-primary">{n.name}</div>
                      <div className="text-[10.5px] text-muted">{n.channel}</div>
                    </div>
                    <Toggle on={n.enabled} onChange={() => {
                      const next = notifToggles.slice();
                      next[i] = { ...n, enabled: !n.enabled };
                      setNotifToggles(next);
                      toasts.push({ variant: "info", title: `${n.name} ${!n.enabled ? "enabled" : "disabled"}` });
                    }} />
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {active === "appearance" && (
            <Panel title="Appearance" subtitle="Personal preferences">
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="panel p-3">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted mb-2">Theme</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => { toggle(); toasts.push({ variant: "info", title: "Theme: dark", duration: 1500 }); }} className="panel p-3 text-left transition-colors">
                      <div className="h-12 rounded-md grid-bg surface-3 mb-2 border border-soft" />
                      <div className="text-[12px] text-primary">Dark</div>
                    </button>
                    <button type="button" onClick={() => { toasts.push({ variant: "info", title: "Theme: light", duration: 1500 }); }} className={cn("panel p-3 text-left transition-colors", theme === "light" && "border-signal-500/50")}>
                      <div className="h-12 rounded-md border border-soft bg-white mb-2" />
                      <div className="text-[12px] text-primary">Light</div>
                    </button>
                  </div>
                </div>
                <div className="panel p-3">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted mb-2">Density</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Compact","Comfortable","Spacious"] as const).map(d => (
                      <button type="button" key={d} onClick={() => { setDensity(d); toasts.push({ variant: "info", title: `Density: ${d}`, duration: 1200 }); }}
                        className={cn("panel p-2.5 text-center hover:border-base text-[11.5px] text-secondary", density === d && "border-signal-500/50 text-primary")}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          )}

          <div className="flex items-center justify-end gap-2">
            <button onClick={() => toasts.push({ variant: "info", title: "Reverted local changes" })} className="btn">Cancel</button>
            <button onClick={save} className="btn btn-primary"><Save size={12} />Save changes</button>
          </div>
        </div>
      </div>

      <Modal open={addingNode} onClose={() => setAddingNode(false)} title="Add cluster node" size="sm"
        footer={
          <>
            <button className="btn" onClick={() => setAddingNode(false)}>Cancel</button>
            <button onClick={() => { toasts.push({ variant: "success", title: `Node ${newNodeName} registered`, description: "Bootstrap script generated" }); setAddingNode(false); }} className="btn btn-primary">Generate bootstrap</button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Node name"><input className="input input-noicon font-mono" value={newNodeName} onChange={e => setNewNodeName(e.target.value)} /></Field>
          <pre className="surface-2 border border-soft rounded p-2 text-[11px] font-mono text-secondary overflow-x-auto">
{`curl -so bootstrap.sh https://manager.sentinelstack.io/cluster/bootstrap?token=•••
sudo bash bootstrap.sh --role worker --name ${newNodeName}`}
          </pre>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button type="button"
      onClick={onChange}
      className={cn("w-9 h-5 rounded-full p-0.5 transition-colors", on ? "bg-signal-500" : "surface-3 border border-soft")}
      role="switch"
      aria-checked={on}
    >
      <span className={cn("block w-4 h-4 rounded-full bg-white transition-transform", on && "translate-x-4")} />
    </button>
  );
}
