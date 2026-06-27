"use client";

import { useMemo, useState } from "react";
import {
  Page, Card, CardTitle, CardSubtitle, Button, Badge,
  DataGrid, type Column, SearchInput, Select,
  Drawer, EmptyState
} from "@/components/ui";
import { useAuditEvents, clearAuditLog, recordAudit } from "@/hooks/useAudit";
import { useConnectorStats } from "@/lib/connector/useConnectorStats";
import { useSession } from "@/lib/auth/useSession";
import { displayNameFor } from "@/lib/tenantDisplay";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { AuditEvent, AuditScope } from "@/types";

const SCOPE_FILTERS: { value: AuditScope | "all"; label: string }[] = [
  { value: "all",          label: "All" },
  { value: "auth",         label: "Auth" },
  { value: "alert",        label: "Alerts" },
  { value: "agent",        label: "Agents" },
  { value: "vuln",         label: "Vulns" },
  { value: "rule",         label: "Rules" },
  { value: "tenant",       label: "Tenants" },
  { value: "ui",           label: "UI" },
  { value: "data",         label: "Data" },
  { value: "integration",  label: "Integrations" },
  { value: "navigation",   label: "Nav" },
  { value: "help",         label: "Help" },
  { value: "notifications",label: "Notif" },
  { value: "review",       label: "Review" },
  { value: "log",          label: "Logs" },
  { value: "fim",          label: "FIM" }
];

const SCOPE_TONE: Record<AuditScope, "low" | "medium" | "high" | "critical" | "info" | "neutral"> = {
  auth:          "high",
  alert:         "critical",
  agent:         "info",
  vuln:          "medium",
  rule:          "medium",
  tenant:        "low",
  ui:            "neutral",
  data:          "high",
  integration:   "info",
  navigation:    "neutral",
  help:          "neutral",
  notifications: "neutral",
  review:        "low",
  log:           "info",
  fim:           "info"
};

export default function AuditPage() {
  const { events } = useAuditEvents();
  const { user } = useSession();
  const { tenants: liveTenantIds } = useConnectorStats();
  const [scopeFilter, setScopeFilter] = useState<AuditScope | "all">("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<AuditEvent | null>(null);

  // Derive actor dropdown from the events we have. ADMIN appears for the
  // local-test login; in a real deployment this is the full set of analysts.
  const actors = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(e.actor);
    return Array.from(set).sort();
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter(e => {
      if (scopeFilter !== "all" && e.scope !== scopeFilter) return false;
      if (tenantFilter === "none" && e.tenant !== null) return false;
      if (tenantFilter !== "all" && tenantFilter !== "none" && e.tenant !== tenantFilter) return false;
      if (actorFilter !== "all" && e.actor !== actorFilter) return false;
      if (q && !`${e.summary} ${e.type} ${e.actor} ${e.tenant ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, scopeFilter, tenantFilter, actorFilter, search]);

  const counts = useMemo(() => {
    const byScope: Record<string, number> = {};
    let withTenant = 0;
    for (const e of events) {
      byScope[e.scope] = (byScope[e.scope] ?? 0) + 1;
      if (e.tenant) withTenant++;
    }
    return { total: events.length, byScope, withTenant };
  }, [events]);

  function exportJson() {
    const data = {
      exportedAt: new Date().toISOString(),
      exportedBy: user?.username ?? "anonymous",
      filter: { scope: scopeFilter, tenant: tenantFilter, actor: actorFilter, search },
      events: filtered
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sentinel-stack-audit-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    recordAudit(
      "data",
      "data.export_audit",
      `Exported ${filtered.length} audit events as JSON`,
      { actor: user?.username ?? "anonymous", tenant: null, outcome: "success", meta: { count: filtered.length } }
    );
  }

  function doClear() {
    if (!confirm(`Clear ${events.length} audit events? This cannot be undone.`)) return;
    recordAudit(
      "data",
      "data.clear_audit",
      `Cleared audit log (${events.length} events)`,
      { actor: user?.username ?? "anonymous", tenant: null, outcome: "success", meta: { previousCount: events.length } }
    );
    clearAuditLog();
  }

  // The detail-drawer copy buttons. Each deep-links to a pre-filtered view of
  // the audit table by mutating filter state in-place and closing the drawer.
  function drillBy(actor: string) {
    setActorFilter(actor);
    setActive(null);
  }
  function drillTenant(id: string) {
    setTenantFilter(id);
    setActive(null);
  }
  function drillType(type: string) {
    setSearch(type);
    setActive(null);
  }

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Operate" }, { label: "Audit log" }]}
      title="Audit log"
      description={`${counts.total} events recorded - ${counts.withTenant} scoped to a tenant - ${actors.length} ${actors.length === 1 ? "actor" : "actors"}`}
      actions={
        <>
          <Button variant="secondary" onClick={exportJson} disabled={filtered.length === 0}>Export JSON</Button>
          <Button variant="danger" onClick={doClear} disabled={events.length === 0}>Clear log</Button>
        </>
      }
    >
      <Card padded={false}>
        <div className="p-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {SCOPE_FILTERS.map(f => {
              const count = f.value === "all" ? events.length : (counts.byScope[f.value] ?? 0);
              const active = scopeFilter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setScopeFilter(f.value)}
                  className={cn(
                    "h-7 px-2.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
                    active
                      ? "bg-emerald-400/15 border-emerald-400/40 text-emerald-400"
                      : "bg-navy-100 border-navy-400 text-sage hover:bg-navy-200"
                  )}
                >
                  {f.label}
                  <span className={cn(
                    "text-[10px] font-mono px-1 rounded",
                    active ? "bg-emerald-400/20 text-emerald-400" : "bg-navy-200 text-navy-600"
                  )}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex-1 min-w-[200px] max-w-md">
            <SearchInput value={search} onChange={setSearch} placeholder="Search summary, type, actor..." />
          </div>
          <Select
            value={tenantFilter}
            onChange={e => setTenantFilter(e.target.value)}
            options={[
              { value: "all", label: "All tenants" },
              { value: "none", label: "(no tenant)" },
              ...liveTenantIds.map(t => ({ value: t, label: displayNameFor(t) }))
            ]}
            aria-label="Filter by tenant"
          />
          <Select
            value={actorFilter}
            onChange={e => setActorFilter(e.target.value)}
            options={[
              { value: "all", label: "All actors" },
              ...actors.map(a => ({ value: a, label: a }))
            ]}
            aria-label="Filter by actor"
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title={events.length === 0 ? "No events recorded yet" : "No events match the current filters"}
          description={events.length === 0
            ? "Audit events appear here as the user signs in, switches tenants, acks alerts, isolates agents, and takes other actions."
            : "Try clearing the search, switching scope, or selecting a different tenant/actor."}
          action={events.length === 0 ? undefined : (
            <Button variant="secondary" onClick={() => { setScopeFilter("all"); setTenantFilter("all"); setActorFilter("all"); setSearch(""); }}>Clear filters</Button>
          )}
        />
      ) : (
        <Card padded={false}>
          <DataGrid
            rows={filtered.map((e, i) => ({ ...e, _idx: i }))}
            rowKey={e => e.id}
            onRowClick={e => setActive(e as unknown as AuditEvent)}
            columns={auditColumns(setTenantFilter, setActive)}
            emptyState={<EmptyState title="No events match" />}
          />
        </Card>
      )}

      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? (
          <div className="flex items-center gap-2 min-w-0">
            <Badge tone={SCOPE_TONE[active.scope]} dot>{active.scope}</Badge>
            <span className="font-mono text-xs text-cream truncate">{active.type}</span>
          </div>
        ) : ""}
        actions={active ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => drillBy(active.actor)}>All by {active.actor}</Button>
            {active.tenant && <Button size="sm" variant="secondary" onClick={() => drillTenant(active.tenant!)}>All in {displayNameFor(active.tenant)}</Button>}
            <Button size="sm" variant="ghost" onClick={() => drillType(active.type)}>All of {active.type}</Button>
          </>
        ) : null}
      >
        {active && (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-navy-600 mb-1">Summary</div>
              <div className="text-cream">{active.summary}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-navy-600 mb-1">When</div>
                <div className="text-cream font-mono text-xs">{new Date(active.ts).toISOString()}</div>
                <div className="text-[11px] text-navy-600 mt-0.5">{formatRelativeTime(active.ts)}</div>
              </div>
              <div>
                <div className="text-xs text-navy-600 mb-1">Actor</div>
                <div className="text-cream font-mono text-xs">{active.actor}</div>
              </div>
              <div>
                <div className="text-xs text-navy-600 mb-1">Tenant</div>
                <div className="text-cream font-mono text-xs">
                  {active.tenant ? displayNameFor(active.tenant) : <span className="text-navy-600">(no tenant)</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-navy-600 mb-1">Outcome</div>
                <div className="text-cream font-mono text-xs">{active.outcome ?? "—"}</div>
              </div>
            </div>
            {active.target && (
              <div>
                <div className="text-xs text-navy-600 mb-1">Target</div>
                <div className="text-cream font-mono text-xs">{active.target.kind} <span className="text-navy-600">·</span> {active.target.id}</div>
              </div>
            )}
            {active.meta && Object.keys(active.meta).length > 0 && (
              <div>
                <div className="text-xs text-navy-600 mb-1">Metadata</div>
                <pre className="text-xs bg-navy-100 border border-navy-400 rounded-lg p-3 overflow-x-auto text-sage font-mono">
{JSON.stringify(active.meta, null, 2)}
                </pre>
              </div>
            )}
            <div>
              <div className="text-xs text-navy-600 mb-1">Event id</div>
              <div className="text-cream font-mono text-[10px] break-all">{active.id}</div>
            </div>
          </div>
        )}
      </Drawer>
    </Page>
  );
}

function auditColumns(
  setTenantFilter: (v: string) => void,
  setActive: (e: AuditEvent) => void
): Column<AuditEvent & { _idx: number }>[] {
  return [
    {
      key: "ts", header: "When", width: "140px",
      cell: e => (
        <span className="text-sage" title={e.ts}>{formatRelativeTime(e.ts)}</span>
      )
    },
    {
      key: "actor", header: "Actor", width: "120px",
      cell: e => <span className="font-mono text-cream text-xs">{e.actor}</span>
    },
    {
      key: "tenant", header: "Tenant", width: "140px",
      cell: e => e.tenant ? (
        <button
          type="button"
          onClick={(ev) => { ev.stopPropagation(); setTenantFilter(e.tenant!); }}
          className="text-cream text-xs hover:text-emerald-400 underline-offset-2 hover:underline"
          title={`Filter to ${e.tenant}`}
        >{displayNameFor(e.tenant)}</button>
      ) : <span className="text-navy-600 text-xs">—</span>
    },
    {
      key: "scope", header: "Scope", width: "110px",
      cell: e => <Badge tone={SCOPE_TONE[e.scope]} dot>{e.scope}</Badge>
    },
    {
      key: "type", header: "Type", width: "180px",
      cell: e => <span className="font-mono text-[11px] text-navy-600">{e.type}</span>
    },
    {
      key: "summary", header: "Summary",
      cell: e => (
        <span className="text-sage text-xs">{e.summary}</span>
      )
    }
  ];
}
