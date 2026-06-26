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

describe("GET /api/connector/agents/count", () => {
  it("returns total_agents on success", async () => {
    mockFetch.mockResolvedValue({ total_agents: 152 });
    const res = await GET(new Request("http://localhost/api/connector/agents/count") as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ total_agents: 152 });
  });

  it("forwards query params", async () => {
    mockFetch.mockResolvedValue({ total_agents: 42 });
    await GET(new Request("http://localhost/api/connector/agents/count?status=active&tenant=acme-corp") as never);
    const called = mockFetch.mock.calls[0];
    expect(called[0]).toBe("/stats/agents?status=active&tenant=acme-corp");
  });

  it("returns 401 when connector returns 401", async () => {
    const { ConnectorError } = await import("@/lib/connector/client");
    mockFetch.mockRejectedValue(new ConnectorError(401, "Unauthorized"));
    const res = await GET(new Request("http://localhost/api/connector/agents/count") as never);
    expect(res.status).toBe(401);
  });

  it("returns 502 when connector returns 502", async () => {
    const { ConnectorError } = await import("@/lib/connector/client");
    mockFetch.mockRejectedValue(new ConnectorError(502, "Wazuh down"));
    const res = await GET(new Request("http://localhost/api/connector/agents/count") as never);
    expect(res.status).toBe(502);
  });
});
