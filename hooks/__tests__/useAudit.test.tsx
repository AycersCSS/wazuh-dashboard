import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ToastProvider } from "@/hooks/useToasts";
import { TimeRangeProvider } from "@/hooks/useTimeRange";
import { TenantProvider } from "@/hooks/useTenantSelection";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/"
}));

vi.mock("@/lib/auth/useSession", () => ({
  useSession: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { username: "ADMIN" },
    signIn: vi.fn(),
    signOut: vi.fn()
  })
}));

import {
  useAudit,
  useAuditEvents,
  recordAudit,
  __resetAuditForTests,
  clearAuditLog
} from "../useAudit";

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <TimeRangeProvider>
        <TenantProvider>{children}</TenantProvider>
      </TimeRangeProvider>
    </ToastProvider>
  );
}

beforeEach(() => {
  __resetAuditForTests();
});

describe("useAudit", () => {
  it("appends events with a generated id, actor, and tenant", () => {
    const { result } = renderHook(() => useAudit(), { wrapper });
    act(() => {
      result.current.record({
        scope: "alert",
        type: "alert.ack",
        summary: "Acknowledged alert 1702.5",
        target: { kind: "alert", id: "1702.5" }
      });
    });
    const { result: ev } = renderHook(() => useAuditEvents(), { wrapper });
    expect(ev.current.events.length).toBe(1);
    expect(ev.current.events[0]).toMatchObject({
      actor: "ADMIN",
      tenant: null,
      scope: "alert",
      type: "alert.ack",
      summary: "Acknowledged alert 1702.5",
      target: { kind: "alert", id: "1702.5" }
    });
    expect(typeof ev.current.events[0].id).toBe("string");
    expect(ev.current.events[0].id.length).toBeGreaterThan(0);
  });

  it("records tenant from the active selection when 'all' resolves to null", () => {
    const { result } = renderHook(() => useAudit(), { wrapper });
    act(() => {
      result.current.record({
        scope: "tenant",
        type: "tenant.switch",
        summary: "Switched tenant: All tenants → Acme Corp"
      });
    });
    const { result: ev } = renderHook(() => useAuditEvents(), { wrapper });
    expect(ev.current.events[0].tenant).toBeNull();
  });

  it("newest events appear first", () => {
    recordAudit("alert", "alert.ack", "first", { actor: "ADMIN" });
    recordAudit("alert", "alert.archive", "second", { actor: "ADMIN" });
    const { result } = renderHook(() => useAuditEvents(), { wrapper });
    expect(ev(result).map(e => e.summary)).toEqual(["second", "first"]);
  });

  it("caps the log at MAX_EVENTS (1000)", () => {
    for (let i = 0; i < 1005; i++) {
      recordAudit("ui", "ui.menu_open", `event ${i}`, { actor: "ADMIN" });
    }
    const { result } = renderHook(() => useAuditEvents(), { wrapper });
    expect(result.current.events.length).toBe(1000);
    // The oldest events should have been dropped
    expect(result.current.events[0].summary).toBe("event 1004");
    expect(result.current.events[999].summary).toBe("event 5");
  });

  it("clearAuditLog empties the store and persists", () => {
    recordAudit("data", "data.export_alerts", "exported 5 alerts", { actor: "ADMIN" });
    const before = renderHook(() => useAuditEvents(), { wrapper });
    expect(before.result.current.events.length).toBe(1);
    act(() => { clearAuditLog(); });
    const after = renderHook(() => useAuditEvents(), { wrapper });
    expect(after.result.current.events.length).toBe(0);
  });

  it("imperative recordAudit accepts an explicit actor and tenant override", () => {
    recordAudit("auth", "auth.login", "Signed in", {
      actor: "analyst1",
      tenant: "acme-corp",
      outcome: "success",
      target: { kind: "user", id: "analyst1" }
    });
    const { result } = renderHook(() => useAuditEvents(), { wrapper });
    expect(result.current.events[0]).toMatchObject({
      actor: "analyst1",
      tenant: "acme-corp",
      outcome: "success"
    });
  });
});

// helper for the "newest first" assertion
function ev<T>(r: { current: { events: readonly T[] } }) { return r.current.events as unknown as { summary: string }[]; }
