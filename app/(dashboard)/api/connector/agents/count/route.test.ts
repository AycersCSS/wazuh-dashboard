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

describe("GET /api/connector/agents/count", () => {
  it("returns 401 when no session cookie is present", async () => {
    const res = await GET(new Request("http://localhost/api/connector/agents/count") as never);
    expect(res.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns total_agents on success", async () => {
    cookieStore.set("connector_jwt", { value: "real-jwt" });
    mockFetch.mockResolvedValue({ total_agents: 152 });
    const res = await GET(new Request("http://localhost/api/connector/agents/count") as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ total_agents: 152 });
  });

  it("forwards only allowed query params", async () => {
    cookieStore.set("connector_jwt", { value: "real-jwt" });
    mockFetch.mockResolvedValue({ total_agents: 42 });
    await GET(new Request("http://localhost/api/connector/agents/count?status=active&tenant=acme-corp&__debug=1") as never);
    const called = mockFetch.mock.calls[0];
    expect(called[0]).toBe("/stats/agents?status=active&tenant=acme-corp");
  });

  it("returns 401 from connector with generic error", async () => {
    cookieStore.set("connector_jwt", { value: "real-jwt" });
    const { ConnectorError } = await import("@/lib/connector/client");
    mockFetch.mockRejectedValue(new ConnectorError(401, "Unauthorized — user jane.doe was locked"));
    const res = await GET(new Request("http://localhost/api/connector/agents/count") as never);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("connector_unavailable");
  });

  it("returns 502 from connector with generic error", async () => {
    cookieStore.set("connector_jwt", { value: "real-jwt" });
    const { ConnectorError } = await import("@/lib/connector/client");
    mockFetch.mockRejectedValue(new ConnectorError(502, "Wazuh down"));
    const res = await GET(new Request("http://localhost/api/connector/agents/count") as never);
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toBe("connector_unavailable");
  });
});
