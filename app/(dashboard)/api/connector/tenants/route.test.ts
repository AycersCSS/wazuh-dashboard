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

describe("GET /api/connector/tenants", () => {
  it("returns 401 when no session cookie is present", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns tenant list", async () => {
    cookieStore.set("connector_jwt", { value: "real-jwt" });
    mockFetch.mockResolvedValue({ tenants: ["acme-corp", "globex-inc"] });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tenants).toEqual(["acme-corp", "globex-inc"]);
  });

  it("forwards 401 from connector with generic error", async () => {
    cookieStore.set("connector_jwt", { value: "real-jwt" });
    const { ConnectorError } = await import("@/lib/connector/client");
    mockFetch.mockRejectedValue(new ConnectorError(401, "Unauthorized — version=1.2.3 internal-host=prod-conn-01"));
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("connector_unavailable");
  });
});
