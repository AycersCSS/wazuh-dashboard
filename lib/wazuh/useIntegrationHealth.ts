"use client";

import { useWazuhResource, buildPath } from "./useWazuhResource";
import type { WazuhIntegrationHealth } from "./types";
import type { WazuhResourceStatus } from "./useWazuhResource";

export type IntegrationConnectionState =
  | "LOADING"
  | "CONNECTED"
  | "DEGRADED"
  | "DISCONNECTED"
  | "NOT_CONNECTED"
  | "UNAUTHENTICATED"
  | "ERROR";

export interface UseIntegrationHealthResult {
  live: WazuhIntegrationHealth | null;
  state: IntegrationConnectionState;
  errorMessage: string | null;
  isLoading: boolean;
  status: WazuhResourceStatus;
  refetch: () => void;
}

export type IntegrationStates = Record<
  string,
  { state: IntegrationConnectionState; errorMessage: string | null; statusName: "Connected" | "Degraded" | "Disconnected" | null }
>;

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

  let state: IntegrationConnectionState = "NOT_CONNECTED";
  let errorMessage: string | null = null;

  if (!KNOWN_IDS.has(id)) {
    errorMessage = `Unknown integration id: ${id}`;
  } else if (status === "LOADING" || status === "IDLE") {
    state = "LOADING";
  } else if (status === "UNAUTHENTICATED") {
    state = "UNAUTHENTICATED";
    errorMessage = "Session expired. Sign in again.";
  } else if (status === "ERROR") {
    state = "ERROR";
    errorMessage = error ?? "Could not reach the integration endpoint.";
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

function toStatus(r: UseIntegrationHealthResult): IntegrationStates[string] {
  return { state: r.state, errorMessage: r.errorMessage, statusName: r.live?.status ?? null };
}

export function useIntegrationStates(): IntegrationStates {
  return {
    "microsoft-365": toStatus(useIntegrationHealth("microsoft-365")),
    "ninjaone":       toStatus(useIntegrationHealth("ninjaone")),
    "bitdefender":    toStatus(useIntegrationHealth("bitdefender")),
    "cyber-essentials": toStatus(useIntegrationHealth("cyber-essentials")),
    "customer-portal":  toStatus(useIntegrationHealth("customer-portal"))
  };
}
