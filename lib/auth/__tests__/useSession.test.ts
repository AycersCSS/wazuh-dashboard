import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";

import { useSession } from "../useSession";

beforeEach(() => {
  server.resetHandlers();
});

describe("useSession", () => {
  it("starts unauthenticated, finishes isAuthenticated=false after health 401", async () => {
    server.use(
      http.get("/api/connector/health", () => new HttpResponse("{}", { status: 401 }))
    );
    const { result } = renderHook(() => useSession());
    await act(async () => { await Promise.resolve(); });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("signIn then re-check is authenticated", async () => {
    server.use(
      http.get("/api/connector/health", () => new HttpResponse("{}", { status: 401 })),
      http.post("/api/connector/auth/login", () => HttpResponse.json({ ok: true }))
    );
    const { result } = renderHook(() => useSession());
    await act(async () => { await Promise.resolve(); });
    await act(async () => {
      const r = await result.current.signIn({ username: "u", password: "p" });
      expect(r.ok).toBe(true);
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("signIn returns error on 401", async () => {
    server.use(
      http.get("/api/connector/health", () => new HttpResponse("{}", { status: 401 })),
      http.post("/api/connector/auth/login", () =>
        HttpResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 })
      )
    );
    const { result } = renderHook(() => useSession());
    await act(async () => { await Promise.resolve(); });
    await act(async () => {
      const r = await result.current.signIn({ username: "u", password: "wrong" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/Invalid/);
    });
  });
});
