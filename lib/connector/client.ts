// Server-only fetch wrapper for the MergeIT-WazuhConnector.
// Reads the JWT from the httpOnly cookie, adds Authorization, forwards.
// Throws ConnectorError on non-2xx. The browser never imports this file.

import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = process.env.CONNECTOR_JWT_COOKIE ?? "connector_jwt";

export class ConnectorError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`Connector error ${status}: ${body}`);
    this.name = "ConnectorError";
    this.status = status;
    this.body = body;
  }
}

export async function connectorFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = process.env.CONNECTOR_BASE_URL;
  if (!base) {
    throw new ConnectorError(0, "CONNECTOR_BASE_URL not set");
  }

  const cookieStore = cookies();
  const jwt = cookieStore.get(COOKIE_NAME)?.value;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const res = await fetch(`${base}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401) {
      // Clear the cookie on 401 to prevent retry loops — but only for real
      // connector-issued tokens. The dev-only "local-test." token is not
      // accepted by the upstream connector, so the first data call would
      // always 401; clearing the cookie in that case would also bounce the
      // user off the dashboard. See app/(auth)/login/page.tsx.
      if (jwt && !jwt.startsWith("local-test.")) {
        try {
          cookieStore.set({ name: COOKIE_NAME, value: "", maxAge: 0, path: "/" });
        } catch {
          // cookies() may throw in some contexts; best-effort
        }
      }
    }
    throw new ConnectorError(res.status, body);
  }

  return res.json() as Promise<T>;
}
