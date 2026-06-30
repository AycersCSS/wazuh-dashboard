"use client";

// Shared hook for the 5 integration pages (microsoft-365, ninjaone,
// bitdefender, cyber-essentials, customer-portal). All five pages have the
// same shape (status card + KPIs + recent activity), and they all hit the
// same per-id route, so they share a hook to keep the proxy call consistent.
//
// The hook no longer returns a seeded fallback. The proxy route returns
// real status — Connected / Degraded / Disconnected, plus error states for
// 401 (unauthenticated) and 503 (not_connected, e.g. local-test token or
// upstream not configured). Pages render explicit UI for each.

import { useWazuhResource, buildPath } from "@/lib/wazuh";
import type { WazuhIntegrationHealth, WazuhResourceStatus } from "@/lib/wazuh";

export type IntegrationConnectionState =
  | "LOADING"
  | "CONNECTED"      // live record returned, status === "Connected"
  | "DEGRADED"       // live record returned, status === "Degraded"
  | "DISCONNECTED"   // live record returned, status === "Disconnected"
  | "NOT_CONNECTED"  // 503 from the proxy — local-test or no upstream yet
  | "UNAUTHENTICATED"// 401 from the proxy
  | "ERROR";         // any other failure (network, 500, etc.)

export interface UseIntegrationHealthResult {
  live: WazuhIntegrationHealth | null;
  state: IntegrationConnectionState;
  errorMessage: string | null;
  isLoading: boolean;
  status: WazuhResourceStatus;
  refetch: () => void;
}

const KNOWN_IDS = new Set([
  "microsoft-365",
  "ninjaone",
  "bitdefender",
  "cyber-essentials",
  "customer-portal"
]);

export function useIntegrationHealth(id: string): UseIntegrationHealthResult {
  const path = KNOWN_IDS.has(id) ? buildPath(`/api/wazuh/integrations/${id}`) : null;
  const { data, status, error, refetch } = useWazuhResource<WazuhIntegrationHealth>(path);

  // Map resource status + live record into a connection state.
  // Default to NOT_CONNECTED — that is the truthful state until the API
  // tells us otherwise. NO seeded Connected/Degraded badges.
  let state: IntegrationConnectionState = "NOT_CONNECTED";
  let errorMessage: string | null = null;

  if (!KNOWN_IDS.has(id)) {
    state = "NOT_CONNECTED";
    errorMessage = `Unknown integration id: ${id}`;
  } else if (status === "LOADING" || status === "IDLE") {
    state = "LOADING";
  } else if (status === "UNAUTHENTICATED") {
    state = "UNAUTHENTICATED";
    errorMessage = "Session expired. Sign in again.";
  } else if (status === "ERROR" || status === "STALE") {
    // The proxy returns 503 with `{ ok: false, error: "not_connected" }`
    // for local-test tokens. The hook reports that distinctly so the page
    // can render the correct message.
    if (error && /503/.test(error)) {
      state = "NOT_CONNECTED";
      errorMessage = "Integration is not connected. Configure it in Settings → Integrations to start receiving data.";
    } else {
      state = "ERROR";
      errorMessage = error ?? "Could not reach the integration endpoint.";
    }
  } else if (data) {
    if (data.status === "Connected") state = "CONNECTED";
    else if (data.status === "Degraded") state = "DEGRADED";
    else state = "DISCONNECTED";
  }

  return {
    live: data ?? null,
    state,
    errorMessage,
    isLoading: state === "LOADING",
    status,
    refetch
  };
}

/**
 * Polls all known integration endpoints in parallel and returns a map of
 * id -> { state, errorMessage }. Used by the Overview page so the 5
 * integration cards reflect the real connection state of each, not the
 * seeded "Connected" placeholder.
 */
const ALL_IDS = [
  "microsoft-365",
  "ninjaone",
  "bitdefender",
  "cyber-essentials",
  "customer-portal"
] as const;

export type IntegrationStates = Record<
  string,
  { state: IntegrationConnectionState; errorMessage: string | null; statusName: "Connected" | "Degraded" | "Disconnected" | null }
>;

export function useIntegrationStates(): IntegrationStates {
  // Five independent polls. Each result is independent (one slow endpoint
  // doesn't block the others from rendering).
  const m365 = useIntegrationHealth("microsoft-365");
  const nj   = useIntegrationHealth("ninjaone");
  const bd   = useIntegrationHealth("bitdefender");
  const ce   = useIntegrationHealth("cyber-essentials");
  const cp   = useIntegrationHealth("customer-portal");

  return {
    "microsoft-365": toStatus(m365),
    "ninjaone":       toStatus(nj),
    "bitdefender":    toStatus(bd),
    "cyber-essentials": toStatus(ce),
    "customer-portal":  toStatus(cp)
  };
}

function toStatus(r: UseIntegrationHealthResult): IntegrationStates[string] {
  return {
    state: r.state,
    errorMessage: r.errorMessage,
    statusName: r.live?.status ?? null
  };
}
