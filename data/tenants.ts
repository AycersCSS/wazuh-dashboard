export type TenantTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface Tenant {
  id: string;
  name: string;
  tier: TenantTier;
  securityScore: number;     // 0-100
  openIncidents: number;
  lastSyncAt: string;
  alerts24h: number;
  cveCount: number;
}

const now = Date.now();
const min = 60_000;
const hr = 60 * min;

export const tenants: Tenant[] = [
  { id: "acme",    name: "Acme Corp",        tier: "Platinum", securityScore: 87, openIncidents: 3, lastSyncAt: new Date(now - 1  * min).toISOString(),  alerts24h: 412, cveCount: 28 },
  { id: "stark",   name: "Stark Industries", tier: "Platinum", securityScore: 92, openIncidents: 1, lastSyncAt: new Date(now - 4  * min).toISOString(),  alerts24h: 188, cveCount: 14 },
  { id: "globex",  name: "Globex",           tier: "Gold",     securityScore: 74, openIncidents: 7, lastSyncAt: new Date(now - 12 * min).toISOString(), alerts24h: 612, cveCount: 41 },
  { id: "initech", name: "Initech",          tier: "Silver",   securityScore: 61, openIncidents: 12, lastSyncAt: new Date(now - 38 * min).toISOString(), alerts24h: 814, cveCount: 67 }
];
