// Public surface of the connector layer. Consumers should import
// from "@/lib/connector" only — never reach into leaf files.

export * from "./types";
export { ConnectorError } from "./client";
export {
  useConnectorStats,
  setStatsFetcher,
  type StatsStatus,
  type UseConnectorStatsResult
} from "./useConnectorStats";
export {
  useConnectorAlerts,
  setAlertsFetcher,
  type AlertsStatus,
  type UseConnectorAlertsResult,
  type AlertCounts
} from "./useConnectorAlerts";
