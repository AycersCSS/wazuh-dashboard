import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";
import { getJwt, setJwt, clearJwt } from "../session";

const mockCookies = vi.mocked(cookies);
let store: Map<string, { value: string; maxAge?: number }>;

beforeEach(() => {
  store = new Map();
  mockCookies.mockImplementation(() => ({
    get: (name: string) => store.get(name) ?? undefined,
    set: (opts: { name: string; value: string; maxAge?: number; path?: string }) => {
      store.set(opts.name, { value: opts.value, maxAge: opts.maxAge });
    },
  }) as never);
});

describe("session", () => {
  it("getJwt returns null when no cookie", () => {
    expect(getJwt()).toBeNull();
  });

  it("setJwt then getJwt returns the token", () => {
    setJwt("abc-123");
    expect(getJwt()).toBe("abc-123");
    expect(store.get("connector_jwt")?.value).toBe("abc-123");
  });

  it("clearJwt empties the cookie", () => {
    setJwt("abc-123");
    clearJwt();
    expect(store.get("connector_jwt")?.maxAge).toBe(0);
  });
});
