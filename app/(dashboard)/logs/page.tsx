"use client";
import { useState, useMemo } from "react";
import { Page, Card, Badge, SearchInput, Select } from "@/components/ui";
import { formatRelativeTime } from "@/lib/format";
import { useWazuhResource, buildPath } from "@/lib/wazuh";
import type { WazuhLogEntry } from "@/lib/wazuh";

interface Row { id: string; ts: string; source: string; agent: string; severity: "low" | "medium" | "high" | "critical" | "info"; message: string; }

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [active, setActive] = useState<Row | null>(null);

  // TODO(replace-when-endpoint-ready): GET /logs/archives — initial 400-row
  // backfill. Live tail will arrive alongside the SSE/poll endpoint.
  const { data, status } = useWazuhResource<{ entries: WazuhLogEntry[]; total: number }>(
    buildPath("/api/wazuh/logs", { limit: 400 })
  );
  const rows: Row[] = (data?.entries ?? []).map(e => ({
    id: e.id, ts: e.timestamp, source: e.source, agent: e.agent,
    severity: e.severity, message: e.message
  }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (source !== "all" && r.source !== source) return false;
      if (severity !== "all" && r.severity !== severity) return false;
      if (q && !(r.id.toLowerCase().includes(q) || r.message.toLowerCase().includes(q) || r.agent.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, search, source, severity]);

  const sources = useMemo(() => Array.from(new Set(rows.map(r => r.source))).sort(), [rows]);

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Configure" }, { label: "Logs" }]}
      title="Logs"
      description={`${rows.length} events${status === "LOADING" ? " - loading..." : ""}`}
    >
      <Card padded={false}>
        <div className="p-3 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px] max-w-md"><SearchInput value={search} onChange={setSearch} placeholder="Search message, agent, id..." /></div>
          <Select value={source} onChange={e => setSource(e.target.value)} options={[{ value: "all", label: "All sources" }, ...sources.map(s => ({ value: s, label: s }))]} />
          <Select value={severity} onChange={e => setSeverity(e.target.value)} options={[
            { value: "all", label: "All severities" },
            { value: "critical", label: "Critical" }, { value: "high", label: "High" },
            { value: "medium", label: "Medium" }, { value: "low", label: "Low" }, { value: "info", label: "Info" }
          ]} />
        </div>
      </Card>

      <Card padded={false}>
        <div className="grid grid-cols-12 px-3 h-9 items-center text-[10.5px] uppercase tracking-wider text-navy-600 font-semibold border-b border-navy-400">
          <div className="col-span-2">Time</div>
          <div className="col-span-2">Source</div>
          <div className="col-span-2">Severity</div>
          <div className="col-span-2">Agent</div>
          <div className="col-span-4">Message</div>
        </div>
        <div className="h-[60vh] overflow-auto">
          {filtered.map(r => (
            <button key={r.id}
              type="button"
              onClick={() => setActive(r)}
              className="grid grid-cols-12 px-3 h-9 items-center text-xs border-b border-navy-400/60 hover:bg-navy-100 cursor-pointer text-left w-full">
              <div className="col-span-2 text-navy-600 font-mono">{formatRelativeTime(r.ts)}</div>
              <div className="col-span-2 text-sage font-mono">{r.source}</div>
              <div className="col-span-2"><Badge tone={r.severity} dot>{r.severity}</Badge></div>
              <div className="col-span-2 text-sage font-mono truncate">{r.agent}</div>
              <div className="col-span-4 text-sage truncate font-mono">{r.message}</div>
            </button>
          ))}
        </div>
      </Card>

      {active && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close event detail" onClick={() => setActive(null)} className="absolute inset-0 bg-black/55" />
          <div onClick={e => e.stopPropagation()} className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-navy-100 shadow-drawer p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-cream">Event {active.id}</div>
              <button type="button" onClick={() => setActive(null)} className="text-xs text-navy-600 hover:text-cream">Close</button>
            </div>
            <pre className="text-xs bg-navy-100 border border-navy-400 rounded-lg p-3 overflow-x-auto text-sage">
{JSON.stringify(active, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </Page>
  );
}
