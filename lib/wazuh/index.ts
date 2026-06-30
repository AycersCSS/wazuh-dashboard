// Public surface of the Wazuh client layer for browser/React code.
//
// IMPORTANT: this barrel does NOT re-export the server-only symbols
// (wazuhFetch, WazuhError, safeQuery, proxyWazuh, isAuthenticated,
// isLocalTestToken). Those live in ./client and ./proxy and pull in
// `next/headers` + `server-only`, so they must only be imported from
// Next.js API route handlers (app/**/route.ts). Browser code consumes the
// hooks + types from here; the API routes consume the server functions
// directly from the leaf modules.

export * from "./types";
export {
  useWazuhResource,
  setWazuhFetcher,
  buildPath,
  type UseWazuhResourceResult,
  type WazuhResourceStatus
} from "./useWazuhResource";
export {
  useIntegrationHealth,
  useIntegrationStates,
  type UseIntegrationHealthResult,
  type IntegrationConnectionState,
  type IntegrationStates
} from "./useIntegrationHealth";
