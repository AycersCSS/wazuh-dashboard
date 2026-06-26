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

beforeEach(() => { mockFetch.mockReset(); });

describe("GET /api/connector/tenants", () => {
  it("returns tenant list", async () => {
    mockFetch.mockResolvedValue({ tenants: ["acme-corp", "globex-inc"] });
    const res = await GET(new Request("http://localhost/api/connector/tenants") as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tenants).toEqual(["acme-corp", "globex-inc"]);
  });

  it("forwards 401 from connector", async () => {
    const { ConnectorError } = await import("@/lib/connector/client");
    mockFetch.mockRejectedValue(new ConnectorError(401, "Unauthorized"));
    const res = await GET(new Request("http://localhost/api/connector/tenants") as never);
    expect(res.status).toBe(401);
  });
});
