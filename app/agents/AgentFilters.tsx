"use client";
import { SearchInput, Select } from "@/components/ui";
import { cn } from "@/lib/cn";

const STATUSES: { value: "all" | "active" | "disconnected" | "pending" | "never_connected"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "disconnected", label: "Disconnected" },
  { value: "pending", label: "Pending" },
  { value: "never_connected", label: "Never connected" }
];

export interface AgentFilters {
  search: string;
  status: "all" | "active" | "disconnected" | "pending" | "never_connected";
  os: string;
}

export function AgentFiltersBar({ value, onChange, osOptions }: { value: AgentFilters; onChange: (v: AgentFilters) => void; osOptions: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
      <div className="flex-1 min-w-[200px] max-w-md">
        <SearchInput value={value.search} onChange={v => onChange({ ...value, search: v })} placeholder="Search by name, IP, OS..." />
      </div>
      <Select
        value={value.status}
        onChange={e => onChange({ ...value, status: e.target.value as AgentFilters["status"] })}
        options={STATUSES}
      />
      <Select
        value={value.os}
        onChange={e => onChange({ ...value, os: e.target.value })}
        options={[{ value: "all", label: "All OS" }, ...osOptions]}
      />
    </div>
  );
}
