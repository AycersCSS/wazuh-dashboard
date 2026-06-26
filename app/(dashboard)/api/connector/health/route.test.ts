import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/connector/client", () => ({
  connectorFetch: vi.fn(),
  ConnectorError: class ConnectorError extends Error {
    status: number;
    body: string;
    constructor(status: number, body: string) {
      super(`Connector error ${status}: ${body}`);
      this.name = "ConnectorError";
      this.status = status;
      this.body = body;
    }
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";
import { connectorFetch } from "@/lib/connector/client";
import { GET } from "./route";

const mockFetch = vi.mocked(connectorFetch);
const mockCookies = vi.mocked(cookies);
let cookieStore: Map<string, { value: string; maxAge?: number }>;

beforeEach(() => {
  mockFetch.mockReset();
  cookieStore = new Map();
  mockCookies.mockImplementation(() => ({
    get: (name: string) => cookieStore.get(name) ?? undefined,
    set: (opts: { name: string; value: string; maxAge?: number }) => {
      cookieStore.set(opts.name, { value: opts.value, maxAge: opts.maxAge });
    },
  }) as never);
});

describe("GET /api/connector/health", () => {
  it("returns 200 when connector is up", async () => {
    mockFetch.mockResolvedValue({ tenants: [] });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it("returns 503 when connector errors", async () => {
    const { ConnectorError } = await import("@/lib/connector/client");
    mockFetch.mockRejectedValue(new ConnectorError(503, "down"));
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("returns 200 for a local-test token without calling the connector", async () => {
    cookieStore.set("connector_jwt", { value: "local-test.eyJtb2RlIjoibG9jYWwtdGVzdCJ9" });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
