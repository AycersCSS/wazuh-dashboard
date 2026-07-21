"use client";
import { useState, useMemo, useEffect } from "react";
import { Page, DataGrid, type Column, Card, EmptyState, SearchInput, Button, Badge } from "@/components/ui";
import { VulnDrawer } from "./VulnDrawer";
import { vulnStatus } from "@/hooks/useAlertsStore";
import { useAlertsStore, useHydrateFromLive } from "@/hooks/useAlertsStore";
import { useWazuhResource, buildPath } from "@/lib/wazuh";
import type { Vulnerability } from "@/types";

export default function VulnerabilitiesPage() {
  const [search, setSearch] = useState("");
  const [patchable, setPatchable] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  useAlertsStore();
  const hydrate = useHydrateFromLive();

  // TODO(replace-when-endpoint-ready): GET /vulnerability
  const { data, status } = useWazuhResource<{ vulnerabilities: Vulnerability[]; total: number }>(
    buildPath("/api/wazuh/vulnerabilities", { limit: 500 })
  );
  const vulnerabilities = data?.vulnerabilities ?? [];
  const isLoading = status === "LOADING";

  useEffect(() => {
    if (data?.vulnerabilities) hydrate({ vulns: data.vulnerabilities });
  }, [data, hydrate]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vulnerabilities.filter(v => {
      if (patchable && !v.fixedVersion) return false;
      if (q && !(v.cve.toLowerCase().includes(q) || v.title.toLowerCase().includes(q) || v.package.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [vulnerabilities, search, patchable]);

  const columns: Column<Vulnerability>[] = [
    { key: "cve", header: "CVE", width: "180px", cell: v => <span className="font-mono text-cream">{v.cve}</span> },
    { key: "title", header: "Title", sortable: true, sortValue: v => v.title, cell: v => <span className="text-sage truncate block max-w-[300px]">{v.title}</span> },
    { key: "sev", header: "Severity", width: "120px", cell: v => <Badge tone={v.severity} dot>{v.severity}</Badge> },
    { key: "pkg", header: "Package", cell: v => <span className="font-mono text-sage">{v.package}</span> },
    { key: "ver", header: "Version", cell: v => <span className="font-mono text-sage">{v.version}</span> },
    { key: "fix", header: "Fix", cell: v => v.fixedVersion ? <span className="font-mono text-cream">{v.fixedVersion}</span> : <span className="text-navy-600/70">-</span> },
    { key: "cvss", header: "CVSS", width: "90px", sortable: true, sortValue: v => Number(v.cvss) || 0, cell: v => <span className="font-mono text-cream">{Number.isFinite(Number(v.cvss)) ? Number(v.cvss).toFixed(1) : "—"}</span> },
    { key: "agents", header: "Agents", width: "90px", sortable: true, sortValue: v => Number(v.agentCount) || 0, cell: v => <span className="font-mono text-cream">{Number(v.agentCount) || 0}</span> },
    { key: "status", header: "Status", width: "140px", cell: v => {
      const s = vulnStatus(v.cve);
      return <Badge tone={s === "patched" ? "low" : s === "in_progress" ? "medium" : s === "wont_fix" ? "neutral" : "high"} dot>{s.replace("_", " ")}</Badge>;
    }}
  ];

  const totalOcc = vulnerabilities.reduce((s, v) => s + (Number(v.agentCount) || 0), 0);

  return (
    <Page
      breadcrumb={[{ href: "/", label: "Analyze" }, { label: "Vulnerabilities" }]}
      title="Vulnerabilities"
      description={`${vulnerabilities.length} open CVEs - ${totalOcc} occurrences across the fleet${isLoading ? " - loading..." : ""}`}
      actions={<Button variant="secondary" onClick={() => { setPatchable(p => !p); }}>{patchable ? "Showing patchable only" : "Show patchable only"}</Button>}
    >
      <Card padded={false}>
        <div className="p-3 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[240px] max-w-md"><SearchInput value={search} onChange={setSearch} placeholder="Search CVE, package, title..." /></div>
          <label className="inline-flex items-center gap-2 text-xs text-sage">
            <input type="checkbox" checked={patchable} onChange={e => setPatchable(e.target.checked)} className="rounded border-navy-500 text-emerald-400 focus:ring-indigo-500" />
            Patchable only
          </label>
        </div>
      </Card>

      <DataGrid
        columns={columns}
        rows={filtered}
        rowKey={v => v.cve}
        onRowClick={v => setActive(v.cve)}
        emptyState={<EmptyState title={isLoading ? "Loading vulnerabilities..." : "No CVEs match"} description={isLoading ? "Pulling CVEs from Wazuh." : "Try clearing search or filters."} />}
      />

      <VulnDrawer cve={active} open={!!active} onClose={() => setActive(null)} />
    </Page>
  );
}
