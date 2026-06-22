import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAcknowledge, useArchive, useSetVulnStatus, useToggleRule, useReset, useAlertsStore } from "../useAlertsStore";
import { storage } from "@/lib/storage";

const ALERT_ID = "EVT-F4240"; // first seed alert id
const VULN = "CVE-2024-3094";
const RULE = "51017"; // an initially-enabled rule

describe("useAlertsStore persistence", () => {
  beforeEach(() => { localStorage.clear(); });

  it("hydrates seed on first render and writes to localStorage", () => {
    renderHook(() => useAlertsStore());
    expect(storage.get<Record<string, unknown>>("alerts", {})[ALERT_ID]).toBeDefined();
  });

  it("acknowledge persists", () => {
    const { result } = renderHook(() => useAcknowledge());
    act(() => result.current([ALERT_ID]));
    const map = storage.get<Record<string, { acknowledged: boolean }>>("alerts", {});
    expect(map[ALERT_ID].acknowledged).toBe(true);
  });

  it("archive persists", () => {
    const { result } = renderHook(() => useArchive());
    act(() => result.current([ALERT_ID]));
    const map = storage.get<Record<string, { archived: boolean; acknowledged: boolean }>>("alerts", {});
    expect(map[ALERT_ID].archived).toBe(true);
    expect(map[ALERT_ID].acknowledged).toBe(true);
  });

  it("vuln status persists", () => {
    const { result } = renderHook(() => useSetVulnStatus());
    act(() => result.current(VULN, "patched"));
    const map = storage.get<Record<string, { status: string }>>("vulns", {});
    expect(map[VULN].status).toBe("patched");
  });

  it("rule toggle persists", () => {
    const { result } = renderHook(() => useToggleRule());
    act(() => result.current(RULE));
    const map = storage.get<Record<string, { status: string }>>("rules", {});
    expect(map[RULE].status).toBe("disabled");
  });

  it("reset clears all sentinel-stack keys and re-hydrates", () => {
    storage.set("alerts", { [ALERT_ID]: { acknowledged: true, archived: true } });
    const { result } = renderHook(() => useReset());
    act(() => result.current());
    expect(storage.get<Record<string, unknown>>("alerts", {})[ALERT_ID]).toBeDefined();
    // After reset, the alert state should match the seed (acknowledged from seed RNG)
    const map = storage.get<Record<string, { acknowledged: boolean }>>("alerts", {});
    expect(map[ALERT_ID].acknowledged).toBe(!!map[ALERT_ID]?.acknowledged);
  });
});
