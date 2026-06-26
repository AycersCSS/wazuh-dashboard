"use client";
import { useEffect } from "react";

/**
 * Starts the MSW browser worker when NEXT_PUBLIC_USE_MOCKS === "1".
 * Renders nothing. Mounted as a child of <body> in app/layout.tsx
 * so MSW is ready before any client hook fires its first fetch.
 *
 * In production builds, the real connector URL is used; MSW is
 * bypassed. NEXT_PUBLIC_* env vars are inlined at build time, so
 * set NEXT_PUBLIC_USE_MOCKS=0 in the prod build env.
 */
export function MockWorkerBoot() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCKS === "1") {
      import("@/mocks/browser")
        .then(({ startMocks }) => startMocks())
        .catch((e) => console.error("[MSW] failed to start", e));
    }
  }, []);
  return null;
}
