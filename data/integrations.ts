// Integrations feed the 5 use-case pages. Mock data only.
// Need to change to API request when available
export type IntegrationStatus = "Connected" | "Degraded" | "Disconnected";

export interface IntegrationHealth {
  id: string;
  name: string;
  vendor: string;
  status: IntegrationStatus;
  lastSyncAt: string;
  healthMetrics: { label: string; value: string; tone?: "ok" | "warn" | "down" }[];
  wazuhMapping: { label: string; href: string }[];
  description: string;
}

export const integrations: IntegrationHealth[] = [
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    vendor: "Microsoft Graph API",
    status: "Connected",
    lastSyncAt: new Date(Date.now() - 90 * 1000).toISOString(),
    healthMetrics: [
      { label: "API latency p95",   value: "412 ms",  tone: "ok" },
      { label: "Throttle headroom", value: "84%",      tone: "ok" },
      { label: "Tenants linked",    value: "4 / 4",   tone: "ok" },
      { label: "Webhook health",    value: "Nominal", tone: "ok" }
    ],
    wazuhMapping: [
      { label: "Azure AD sign-in events -> Alerts",      href: "/alerts" },
      { label: "MFA-disabled users -> Vulnerabilities",  href: "/vulnerabilities" },
      { label: "OAuth consent -> Rules (custom 918xx)",  href: "/rules" },
      { label: "Risky sign-in -> Threat Intel actors",   href: "/threat-intel" }
    ],
    description: "Pulls Azure AD sign-in, audit, and identity protection logs into Wazuh for SOC correlation. Surfaces failed sign-ins, MFA gaps, OAuth consent grants, and risky-user detections across every tenant in the fleet."
  },
  {
    id: "ninjaone",
    name: "NinjaOne",
    vendor: "NinjaOne RMM API",
    status: "Connected",
    lastSyncAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    healthMetrics: [
      { label: "Devices seen",       value: "152",      tone: "ok" },
      { label: "Sync interval",      value: "5 min",    tone: "ok" },
      { label: "Tenants linked",     value: "4 / 4",    tone: "ok" },
      { label: "Agent drift",        value: "6 devices", tone: "warn" }
    ],
    wazuhMapping: [
      { label: "Endpoint inventory -> Agents",            href: "/agents" },
      { label: "Patch overdue -> Vulnerabilities",        href: "/vulnerabilities" },
      { label: "Config drift -> File Integrity (rules)",  href: "/fim" },
      { label: "Agent offline -> Alerts (custom 921xx)",  href: "/alerts" }
    ],
    description: "Compares NinjaOne's RMM device inventory with Wazuh's agent list. Highlights endpoints reporting to NinjaOne but not Wazuh (coverage gap) and vice versa (shadow agent). Flags patching overdue and agent drift across the fleet."
  },
  {
    id: "bitdefender",
    name: "Bitdefender",
    vendor: "GravityZone API",
    status: "Degraded",
    lastSyncAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    healthMetrics: [
      { label: "Endpoints reporting", value: "146 / 152", tone: "warn" },
      { label: "Engines out of date",  value: "9",         tone: "down" },
      { label: "Active threats",      value: "2",         tone: "down" },
      { label: "Blocked (24h)",       value: "1,284",     tone: "ok" }
    ],
    wazuhMapping: [
      { label: "EDR detection -> Alerts",                 href: "/alerts" },
      { label: "Quarantine event -> FIM (file hash)",     href: "/fim" },
      { label: "Threat intel IOC -> Threat Intel",        href: "/threat-intel" },
      { label: "Engine status -> Compliance (control 7)", href: "/compliance" }
    ],
    description: "Correlates Bitdefender GravityZone endpoint detections with Wazuh alerts. Joins process, file, and network telemetry from both sides so the SOC sees one timeline per incident. Engine-out-of-date endpoints are flagged for the MSP patching queue."
  },
  {
    id: "cyber-essentials",
    name: "Cyber Essentials Plus",
    vendor: "MergeIT evidence pack",
    status: "Connected",
    lastSyncAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    healthMetrics: [
      { label: "Controls tracked",   value: "5 / 5",     tone: "ok" },
      { label: "Evidence collected", value: "1,284",     tone: "ok" },
      { label: "Tenants certified", value: "3 / 4",     tone: "warn" },
      { label: "Next assessment",    value: "in 41 d",  tone: "ok" }
    ],
    wazuhMapping: [
      { label: "Patch control -> Vulnerabilities",        href: "/vulnerabilities" },
      { label: "Access control -> Compliance",            href: "/compliance" },
      { label: "Malware protection -> Alerts (EDR)",      href: "/alerts" },
      { label: "Boundary firewalls -> Rules (FIM)",        href: "/fim" }
    ],
    description: "Auto-builds the Cyber Essentials Plus evidence pack from Wazuh data: patch levels, MFA coverage, EDR health, FIM coverage on critical paths, and access-control posture. One report per tenant, refreshed nightly."
  },
  {
    id: "customer-portal",
    name: "Customer Portal (beta)",
    vendor: "MergeIT portal API",
    status: "Connected",
    lastSyncAt: new Date(Date.now() - 60 * 1000).toISOString(),
    healthMetrics: [
      { label: "API calls (24h)",   value: "12,408",  tone: "ok" },
      { label: "Tenants onboarded", value: "4 / 4",   tone: "ok" },
      { label: "Active API keys",   value: "7",       tone: "ok" },
      { label: "Last data sync",    value: "1m ago",  tone: "ok" }
    ],
    wazuhMapping: [
      { label: "Tenant score -> Compliance",              href: "/compliance" },
      { label: "Open incidents -> Alerts",                href: "/alerts" },
      { label: "Top findings -> Vulnerabilities",         href: "/vulnerabilities" },
      { label: "MSSP overview -> Overview (raw)",         href: "/" }
    ],
    description: "Read-only API consumed by the future MergeIT customer portal. Surfaces per-tenant security score, open incidents, top findings, and compliance rollups. This page is the proof-of-concept for the portal's data shape."
  }
];

export function getIntegration(id: string): IntegrationHealth | undefined {
  return integrations.find(i => i.id === id);
}
