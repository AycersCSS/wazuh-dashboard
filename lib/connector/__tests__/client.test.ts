import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";
import { connectorFetch, ConnectorError } from "../client";

const mockCookies = vi.mocked(cookies);

beforeEach(() => {
  vi.unstubAllGlobals();
  process.env.CONNECTOR_BASE_URL = "http://connector.test:5000";
  mockCookies.mockReset();
});

describe("connectorFetch", () => {
  it("throws if CONNECTOR_BASE_URL is not set", async () => {
    delete process.env.CONNECTOR_BASE_URL;
    await expect(connectorFetch("/tenants")).rejects.toBeInstanceOf(ConnectorError);
  });

  it("adds Authorization: Bearer when cookie is present", async () => {
    mockCookies.mockReturnValue({
      get: (name: string) => name === "connector_jwt" ? { value: "test-jwt" } : undefined,
    } as never);

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ tenants: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await connectorFetch("/tenants");
    const called = fetchMock.mock.calls[0];
    expect(called[0]).toBe("http://connector.test:5000/tenants");
    const init = called[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-jwt");
  });

  it("does not add Authorization when cookie is missing", async () => {
    mockCookies.mockReturnValue({
      get: () => undefined,
    } as never);

    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await connectorFetch("/tenants");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("returns parsed JSON on 2xx", async () => {
    mockCookies.mockReturnValue({ get: () => undefined } as never);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ tenants: ["acme-corp"] }), { status: 200 })
    ));

    const result = await connectorFetch<{ tenants: string[] }>("/tenants");
    expect(result.tenants).toEqual(["acme-corp"]);
  });

  it("throws ConnectorError on non-2xx", async () => {
    mockCookies.mockReturnValue({ get: () => undefined } as never);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("Unauthorized", { status: 401 })
    ));

    await expect(connectorFetch("/tenants")).rejects.toMatchObject({
      status: 401,
      body: "Unauthorized",
    });
  });

  it("clears the cookie on 401 for a real token", async () => {
    const setSpy = vi.fn();
    mockCookies.mockReturnValue({
      get: (name: string) => name === "connector_jwt" ? { value: "real-jwt" } : undefined,
      set: setSpy,
    } as never);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("Unauthorized", { status: 401 })
    ));

    await expect(connectorFetch("/tenants")).rejects.toMatchObject({ status: 401 });
    expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ maxAge: 0 }));
  });

  it("does not clear the cookie on 401 for a local-test token", async () => {
    const setSpy = vi.fn();
    mockCookies.mockReturnValue({
      get: (name: string) => name === "connector_jwt" ? { value: "local-test.payload" } : undefined,
      set: setSpy,
    } as never);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("Unauthorized", { status: 401 })
    ));

    await expect(connectorFetch("/tenants")).rejects.toMatchObject({ status: 401 });
    expect(setSpy).not.toHaveBeenCalled();
  });
});
