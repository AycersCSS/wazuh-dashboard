/**
 * MergeIT Dashboard — Site & Tenant Configuration
 *
 * Single source of truth for everything the dashboard needs to know
 * about the organisation and its tenants. Edit this file (not the code)
 * when onboarding a new customer or rebranding.
 *
 * The connector returns only tenant IDs (e.g. "acme-corp"); display
 * names and tiers are a dashboard concern defined here.
 */

export const SITE = {
  name: "MergeIT",
  subtitle: "SOC",
  shortName: "MERGEIT",
  description: "Managed Security Operations Center Dashboard",
  // Meta page title suffix (appended to every page title)
  titleSuffix: "MergeIT Wazuh Dashboard",
} as const;

export type TenantTier = "Bronze" | "Silver" | "Gold" | "Platinum";

/**
 * tenantId → display config.
 * The connector supplies live tenant IDs; this map enriches them for the UI.
 * Unknown tenants fall back to their raw ID and "Silver" tier.
 */
export const TENANTS: Record<string, { name: string; tier: TenantTier }> = {
  "acme-corp":        { name: "Acme Corp",       tier: "Platinum" },
  "globex-inc":       { name: "Globex",          tier: "Gold" },
  "initech":          { name: "Initech",         tier: "Silver" },
  "stark-industries": { name: "Stark Industries", tier: "Platinum" },
};

/**
 * Integration use-case display metadata.
 * id → { label, tag?, oneLiner }
 */
export type UseCaseTag = "new" | "beta" | undefined;

export interface UseCaseMeta {
  label: string;
  href: string;
  tag?: UseCaseTag;
  oneLiner: string;
}

export const USE_CASES: Record<string, UseCaseMeta> = {
  "microsoft-365": {
    label: "Microsoft 365",
    href: "/microsoft-365",
    oneLiner: "Identity, sign-in, and OAuth posture for every tenant in the fleet.",
  },
  "ninjaone": {
    label: "NinjaOne",
    href: "/ninjaone",
    oneLiner: "Reconcile RMM device inventory with Wazuh agent coverage.",
  },
  "bitdefender": {
    label: "Bitdefender",
    href: "/bitdefender",
    oneLiner: "Correlate GravityZone EDR detections with Wazuh alerts.",
  },
  "cyber-essentials": {
    label: "Cyber Essentials",
    href: "/cyber-essentials",
    tag: "beta",
    oneLiner: "Audit-ready evidence pack, auto-built from Wazuh data.",
  },
  "customer-portal": {
    label: "Customer Portal",
    href: "/customer-portal",
    tag: "beta",
    oneLiner: "Per-tenant security snapshot for the future MergeIT portal.",
  },
};
