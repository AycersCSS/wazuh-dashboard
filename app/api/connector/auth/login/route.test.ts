import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";
import { POST } from "./route";

const mockCookies = vi.mocked(cookies);
let cookieStore: Map<string, { value: string; maxAge?: number }>;

beforeEach(() => {
  vi.unstubAllGlobals();
  process.env.CONNECTOR_BASE_URL = "http://connector.test:5000";
  cookieStore = new Map();
  mockCookies.mockImplementation(() => ({
    get: (name: string) => cookieStore.get(name) ?? undefined,
    set: (opts: { name: string; value: string; maxAge?: number }) => {
      cookieStore.set(opts.name, { value: opts.value, maxAge: opts.maxAge });
    },
  }) as never);
});

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/connector/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" }
  });
}

describe("POST /api/connector/auth/login", () => {
  it("returns 400 if username or password missing", async () => {
    const res = await POST(makeRequest({ username: "u" }) as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("forwards to connector and sets cookie on 200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: "real-jwt" }), { status: 200 })
    ));

    const res = await POST(makeRequest({ username: "u", password: "p" }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
    expect(cookieStore.get("connector_jwt")?.value).toBe("real-jwt");
  });

  it("passes through 401 from connector without setting cookie", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 })
    ));

    const res = await POST(makeRequest({ username: "u", password: "p" }) as never);
    expect(res.status).toBe(401);
    expect(cookieStore.get("connector_jwt")).toBeUndefined();
  });

  it("passes through 503 from connector (unreachable)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("Connector down", { status: 503 })
    ));

    const res = await POST(makeRequest({ username: "u", password: "p" }) as never);
    expect(res.status).toBe(503);
  });
});
