// Response types matching the MergeIT-WazuhConnector endpoints.
// The connector is a Python/Flask service that proxies Wazuh;
// see D:\projects\apiconnector\MergeIT-WazuhConnector\ for source.

export interface Tenant {
  id: string;
  name: string;
  tier?: "Bronze" | "Silver" | "Gold" | "Platinum";
  securityScore: number;
  openIncidents: number;
  lastSyncAt: string;
  alerts24h: number;
  cveCount: number;
}

export interface IntegrationHealth {
  id: string;
  name: string;
  vendor: string;
  status: "Connected" | "Degraded" | "Disconnected";
  lastSyncAt: string;
}

export interface Alert {
  id: string;
  level: number;
  rule: {
    id: string;
    level: number;
    description: string;
  };
  agent: {
    id: string;
    name: string;
    ip?: string;
  };
  timestamp: string;
  full_log: string;
}

export interface AlertBuckets {
  critical: Alert[];
  high: Alert[];
  warning: Alert[];
  total: number;
}

export interface AgentsCount {
  total_agents: number;
}

export interface TenantsList {
  tenants: string[];
}

export type LoginResponse = { ok: true } | { ok: false; error: string };
