import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { setAlertsFetcher, useConnectorAlerts } from "../useConnectorAlerts";

let mockResponse = { critical: [{ id: "c1", level: 14 }], high: [], warning: [], total: 1 };
let mockStatus = 200;

const fetcher = vi.fn(async (path: string) => {
  if (mockStatus === 401) {
    const e: any = new Error("Unauthorized"); e.status = 401; throw e;
  }
  return mockResponse;
});

beforeEach(() => {
  setAlertsFetcher(fetcher);
  mockResponse = { critical: [{ id: "c1", level: 14 }], high: [], warning: [], total: 1 };
  mockStatus = 200;
  fetcher.mockClear();
  vi.useFakeTimers();
});

afterEach(() => { vi.useRealTimers(); });

describe("useConnectorAlerts", () => {
  it("is IDLE when tenantId is null", () => {
    const { result } = renderHook(() => useConnectorAlerts(null));
    expect(result.current.status).toBe("IDLE");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fetches on mount when tenantId is set", async () => {
    const { result } = renderHook(() => useConnectorAlerts("acme-corp"));
    await act(async () => { await Promise.resolve(); });
    expect(fetcher).toHaveBeenCalledWith("/api/connector/alerts?tenant=acme-corp&limit=200&time_range=7d");
    expect(result.current.alerts.critical).toBe(1);
    expect(result.current.alerts.total).toBe(1);
  });

  it("refetches when tenantId changes", async () => {
    const { rerender } = renderHook(({ id }) => useConnectorAlerts(id), {
      initialProps: { id: "acme-corp" }
    });
    await act(async () => { await Promise.resolve(); });
    rerender({ id: "globex-inc" });
    await act(async () => { await Promise.resolve(); });
    const last = fetcher.mock.calls[fetcher.mock.calls.length - 1][0];
    expect(last).toContain("tenant=globex-inc");
  });

  it("polls every 30 seconds", async () => {
    renderHook(() => useConnectorAlerts("acme-corp"));
    await act(async () => { await Promise.resolve(); });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(30_000); await Promise.resolve(); });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("returns UNAUTHENTICATED on 401", async () => {
    mockStatus = 401;
    const { result } = renderHook(() => useConnectorAlerts("acme-corp"));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.status).toBe("UNAUTHENTICATED");
  });
});
