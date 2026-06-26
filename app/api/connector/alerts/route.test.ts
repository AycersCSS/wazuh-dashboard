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

import { connectorFetch } from "@/lib/connector/client";
import { GET } from "./route";

const mockFetch = vi.mocked(connectorFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("GET /api/connector/alerts", () => {
  it("forwards query string to connector", async () => {
    mockFetch.mockResolvedValue({ critical: [], high: [], warning: [], total: 0 });
    await GET(new Request("http://localhost/api/connector/alerts?limit=200&time_range=7d&tenant=acme-corp") as never);
    const called = mockFetch.mock.calls[0];
    expect(called[0]).toBe("/alerts?limit=200&time_range=7d&tenant=acme-corp");
  });

  it("returns bucketed payload", async () => {
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
});
