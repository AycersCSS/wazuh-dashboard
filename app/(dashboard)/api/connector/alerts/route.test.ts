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
let cookieStore: Map<string, { value: string }>;

beforeEach(() => {
  mockFetch.mockReset();
  cookieStore = new Map();
  mockCookies.mockImplementation(() => ({
    get: (name: string) => cookieStore.get(name) ?? undefined,
    set: () => {},
  }) as never);
});

describe("GET /api/connector/alerts", () => {
  it("returns 401 when no session cookie is present", async () => {
    const res = await GET(new Request("http://localhost/api/connector/alerts") as never);
    expect(res.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("forwards only allowed query params to the connector", async () => {
    cookieStore.set("connector_jwt", { value: "real-jwt" });
    mockFetch.mockResolvedValue({ critical: [], high: [], warning: [], total: 0 });
    await GET(new Request("http://localhost/api/connector/alerts?limit=200&time_range=7d&tenant=acme-corp&__debug=1&__admin=true") as never);
    const called = mockFetch.mock.calls[0];
    // Unknown keys (__debug, __admin) are stripped
    expect(called[0]).toBe("/alerts?limit=200&time_range=7d&tenant=acme-corp");
  });

  it("returns bucketed payload", async () => {
    cookieStore.set("connector_jwt", { value: "real-jwt" });
    mockFetch.mockResolvedValue({
      critical: [{ id: "a1", level: 14 }],
      high: [{ id: "a2", level: 12 }],
      warning: [],
      total: 2
    });
    const res = await GET(new Request("http://localhost/api/connector/alerts") as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBe(2);
  });

  it("returns 503 with a generic error when the connector fails", async () => {
    cookieStore.set("connector_jwt", { value: "real-jwt" });
    const { ConnectorError } = await import("@/lib/connector/client");
    mockFetch.mockRejectedValue(new ConnectorError(502, "Wazuh down — internal host prod-conn-01.internal:55000"));
    const res = await GET(new Request("http://localhost/api/connector/alerts") as never);
    expect(res.status).toBe(502);
    const json = await res.json();
    // Error body must NOT contain the raw upstream text
    expect(json.error).toBe("connector_unavailable");
  });
});
