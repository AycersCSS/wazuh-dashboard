"use client";
import { useEffect } from "react";

/**
 * Starts the MSW browser worker when NEXT_PUBLIC_USE_MOCKS === "1".
 * Renders nothing. Mounted as a child of <body> in app/layout.tsx
 * so MSW is ready before any client hook fires its first fetch.
 *
 * Production safety: if NEXT_PUBLIC_USE_MOCKS is "1" in a production
 * build, we throw on mount. Dev should never deploy with mocks on.
 * NEXT_PUBLIC_* env vars are inlined at build time, so the check
 * runs against the build-time value (not the runtime value).
 */
export function MockWorkerBoot() {
  useEffect(() => {
    const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "1";
    const isProd = process.env.NODE_ENV === "production";

    if (useMocks && isProd) {
      throw new Error(
        "NEXT_PUBLIC_USE_MOCKS=1 in a production build. " +
        "The MSW worker would intercept real fetches. " +
        "Set NEXT_PUBLIC_USE_MOCKS=0 in the production build env."
      );
    }

    if (useMocks) {
      import("@/mocks/browser")
        .then(({ startMocks }) => startMocks())
        .catch((e) => console.error("[MSW] failed to start", e));
    }
  }, []);
  return null;
}
