export type TenantTier = "Bronze" | "Silver" | "Gold" | "Platinum";

/**
 * Single source of truth for turning connector-supplied tenant IDs into
 * dashboard-side display strings. The MergeIT-WazuhConnector returns only
 * tenant IDs (e.g. "acme-corp"); display names and tier are a dashboard
 * concern. Both the Topbar dropdown and the Overview page consume this
 * module so a new tenant ID added to the connector renders the same way
 * everywhere.
 */

export const ALL_TENANTS_KEY = "all" as const;
export type AllTenantsKey = typeof ALL_TENANTS_KEY;

/**
 * id -> human-readable tenant name. Falls back to the raw ID for any
 * tenant the connector reports that we don't have a label for yet.
 */
export const TENANT_LABELS: Record<string, string> = {
  "acme-corp":        "Acme Corp",
  "globex-inc":       "Globex",
  "initech":          "Initech",
  "stark-industries": "Stark Industries"
};

/**
 * id -> service tier. Honest about missing data: returns `null` rather
 * than a default; call sites decide their fallback UX.
 */
export const TIER_BY_TENANT: Record<string, TenantTier> = {
  "acme-corp":        "Platinum",
  "globex-inc":       "Gold",
  "initech":          "Silver",
  "stark-industries": "Platinum"
};

export function displayNameFor(tenantId: string): string {
  return TENANT_LABELS[tenantId] ?? tenantId;
}

export function tierFor(tenantId: string): TenantTier | null {
  return TIER_BY_TENANT[tenantId] ?? null;
}

export const ALL_TENANTS_ROW = {
  key: ALL_TENANTS_KEY,
  label: "All tenants",
  sub: "Fleet-wide view"
} as const;

export interface TenantOption {
  key: string;
  label: string;
  sub: string;
}

/**
 * Shape the live tenant ID list into the { key, label, sub } rows the
 * Topbar dropdown renders. The "all" pseudo-tenant is prepended. Per-tenant
 * sub-lines show tier; the "all" row carries the global agent count because
 * the connector only ships an aggregate (not per-tenant counts).
 */
export function buildTenantOptions(
  ids: string[],
  totalAgents: number | null
): TenantOption[] {
  const agentSub = totalAgents !== null
    ? `${totalAgents.toLocaleString()} agents`
    : "—";
  const realRows: TenantOption[] = ids.map((id) => ({
    key: id,
    label: displayNameFor(id),
    sub: tierFor(id) ? `${tierFor(id)} tier` : ""
  }));
  return [
    { ...ALL_TENANTS_ROW, sub: `${agentSub} · ${ALL_TENANTS_ROW.sub}` },
    ...realRows
  ];
}
