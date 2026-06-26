import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { setStatsFetcher, useConnectorStats } from "../useConnectorStats";

let mockTenants: string[] = ["a", "b"];
let mockAgents: number = 100;
let mockTenantsStatus = 200;
let mockAgentsStatus = 200;
let mockTenantsError: Error | null = null;
let mockAgentsError: Error | null = null;

const fetcher = vi.fn(async (path: string) => {
  if (path.startsWith("/api/connector/tenants")) {
    if (mockTenantsError) throw mockTenantsError;
    if (mockTenantsStatus === 401) {
      const e: any = new Error("Unauthorized"); e.status = 401; throw e;
    }
    return { tenants: mockTenants };
  }
  if (path.startsWith("/api/connector/agents/count")) {
    if (mockAgentsError) throw mockAgentsError;
    if (mockAgentsStatus === 500) {
      const e: any = new Error("Wazuh down"); e.status = 500; throw e;
    }
    return { total_agents: mockAgents };
  }
  throw new Error("unexpected path: " + path);
});

beforeEach(() => {
  setStatsFetcher(fetcher);
  mockTenants = ["a", "b"];
  mockAgents = 100;
  mockTenantsStatus = 200;
  mockAgentsStatus = 200;
  mockTenantsError = null;
  mockAgentsError = null;
  fetcher.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useConnectorStats", () => {
  it("fetches on mount and updates state", async () => {
    const { result } = renderHook(() => useConnectorStats());
    await act(async () => { await Promise.resolve(); });
    expect(result.current.tenants).toEqual(["a", "b"]);
    expect(result.current.totalAgents).toBe(100);
    expect(result.current.status).toBe("CONNECTED");
  });

  it("polls every 30 seconds", async () => {
    const { result } = renderHook(() => useConnectorStats());
    await act(async () => { await Promise.resolve(); });
    expect(fetcher).toHaveBeenCalledTimes(2);

    await act(async () => { vi.advanceTimersByTime(30_000); await Promise.resolve(); });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("refetch clears STALE and re-fetches", async () => {
    const { result } = renderHook(() => useConnectorStats());
    await act(async () => { await Promise.resolve(); });
    // Simulate staleness: don't update lastFetchedAt
    await act(async () => { vi.advanceTimersByTime(60_100); });
    expect(result.current.status).toBe("STALE");
    await act(async () => { result.current.refetch(); await Promise.resolve(); });
    expect(result.current.status).toBe("CONNECTED");
  });

  it("returns UNAUTHENTICATED on 401", async () => {
    mockTenantsStatus = 401;
    const { result } = renderHook(() => useConnectorStats());
    await act(async () => { await Promise.resolve(); });
    expect(result.current.status).toBe("UNAUTHENTICATED");
  });

  it("returns ERROR on 5xx", async () => {
    mockAgentsStatus = 500;
    const { result } = renderHook(() => useConnectorStats());
    await act(async () => { await Promise.resolve(); });
    expect(result.current.status).toBe("ERROR");
    expect(result.current.error).toMatch(/Wazuh/);
  });
});
