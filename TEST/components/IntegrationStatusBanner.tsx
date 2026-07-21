"use client";

// Shared status banner for the 5 integration pages. Renders the current
// connection state with an honest, explicit message:
//   - LOADING              -> spinner + "Checking connection..."
//   - CONNECTED            -> small green pill (no banner needed; page renders normally)
//   - DEGRADED             -> amber banner: "Connected but degraded"
//   - DISCONNECTED         -> red banner: "Disconnected — no data"
//   - NOT_CONNECTED        -> red banner: "Not connected"
//   - UNAUTHENTICATED      -> red banner: sign in
//   - ERROR                -> red banner with the error message
//
// Pages call this above the page body. The banner never fakes a
// "Connected" state — it always reflects the API result.

import { Card, CardTitle, CardSubtitle, Button } from "@/components/ui";
import type { IntegrationConnectionState } from "@/lib/wazuh/useIntegrationHealth";

export function IntegrationStatusBanner({
  state,
  errorMessage,
  integrationName,
  onRetry
}: {
  state: IntegrationConnectionState;
  errorMessage: string | null;
  integrationName: string;
  onRetry?: () => void;
}) {
  if (state === "LOADING") {
    return (
      <Card>
        <div className="p-4 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
          <div>
            <CardTitle>Checking {integrationName} connection</CardTitle>
            <CardSubtitle>Reaching the integration endpoint…</CardSubtitle>
          </div>
        </div>
      </Card>
    );
  }

  if (state === "CONNECTED") {
    // No banner — the page renders the normal content.
    return null;
  }

  if (state === "DEGRADED") {
    return (
      <Card className="border-amber-400/40">
        <div className="p-4 flex items-start gap-3">
          <div className="w-2 h-2 mt-2 rounded-full bg-amber-400" />
          <div className="flex-1">
            <CardTitle>{integrationName} is degraded</CardTitle>
            <CardSubtitle>
              Connected but reporting partial data. Recent events may be missing.
              {onRetry && <> <button type="button" onClick={onRetry} className="text-emerald-400 hover:underline">Retry</button></>}
            </CardSubtitle>
          </div>
        </div>
      </Card>
    );
  }

  // DISCONNECTED / NOT_CONNECTED / UNAUTHENTICATED / ERROR all get a red
  // banner with an honest message.
  const { title, body } = (() => {
    switch (state) {
      case "DISCONNECTED":
        return {
          title: `${integrationName} is disconnected`,
          body: "The integration is configured but currently not reporting. No live data is shown below."
        };
      case "NOT_CONNECTED":
        return {
          title: `${integrationName} is not connected`,
          body: errorMessage ?? "This integration has not been configured. Set it up in Settings → Integrations to start receiving data."
        };
      case "UNAUTHENTICATED":
        return {
          title: "Session expired",
          body: errorMessage ?? "Sign in again to view integration data."
        };
      case "ERROR":
      default:
        return {
          title: `Could not load ${integrationName}`,
          body: errorMessage ?? "The integration endpoint returned an unexpected error. Try again in a moment."
        };
    }
  })();

  return (
    <Card className="border-severity-critical/40">
      <div className="p-4 flex items-start gap-3">
        <div className="w-2 h-2 mt-2 rounded-full bg-severity-critical" />
        <div className="flex-1">
          <CardTitle>{title}</CardTitle>
          <CardSubtitle>{body}</CardSubtitle>
        </div>
        {onRetry && (
          <Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>
        )}
      </div>
    </Card>
  );
}
