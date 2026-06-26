import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";
import { POST } from "./route";

const mockCookies = vi.mocked(cookies);
let cookieStore: Map<string, { value: string; maxAge?: number }>;

beforeEach(() => {
  cookieStore = new Map();
  cookieStore.set("connector_jwt", { value: "old-jwt" });
  mockCookies.mockImplementation(() => ({
    get: (name: string) => cookieStore.get(name) ?? undefined,
    set: (opts: { name: string; value: string; maxAge?: number }) => {
      cookieStore.set(opts.name, { value: opts.value, maxAge: opts.maxAge });
    },
  }) as never);
});

describe("POST /api/connector/auth/logout", () => {
  it("clears the cookie and returns ok", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
    expect(cookieStore.get("connector_jwt")?.maxAge).toBe(0);
  });
});
