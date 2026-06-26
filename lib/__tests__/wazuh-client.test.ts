import { describe, it, expect } from "vitest";
import { withIsolatedDatabase, TENANTS } from "@/test-utils/db";
import { listAgents, listAlerts, listVulnerabilities, getTenantSnapshot } from "@/lib/wazuh/client";

withIsolatedDatabase();

function ctx(idx: number) {
  const t = TENANTS[idx]!;
  return { id: t.id, name: t.name, tier: t.tier };
}

describe("wazuh client (tenant scoping)", () => {
  it("returns different agents per tenant", () => {
    const a = listAgents(ctx(0));
    const b = listAgents(ctx(1));
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
    const aIds = new Set(a.map(x => x.id));
    const bIds = new Set(b.map(x => x.id));
    for (const id of aIds) expect(bIds.has(id)).toBe(false);
  });

  it("is deterministic for the same tenant", () => {
    const first  = listAlerts(ctx(0));
    const second = listAlerts(ctx(0));
    expect(first.map(x => x.id)).toEqual(second.map(x => x.id));
  });

  it("scopes alerts, vulnerabilities, and snapshot per tenant", () => {
    const aAlerts = listAlerts(ctx(0));
    const bAlerts = listAlerts(ctx(1));
    expect(aAlerts.every(x => x.tenantId === TENANTS[0]!.id)).toBe(true);
    expect(bAlerts.every(x => x.tenantId === TENANTS[1]!.id)).toBe(true);

    const aVulns = listVulnerabilities(ctx(0));
    const bVulns = listVulnerabilities(ctx(1));
    expect(aVulns.every(x => x.tenantId === TENANTS[0]!.id)).toBe(true);
    expect(bVulns.every(x => x.tenantId === TENANTS[1]!.id)).toBe(true);

    const aSnap = getTenantSnapshot(ctx(0));
    const bSnap = getTenantSnapshot(ctx(1));
    expect(aSnap.tenantId).toBe(TENANTS[0]!.id);
    expect(bSnap.tenantId).toBe(TENANTS[1]!.id);
    expect(aSnap.name).toBe(TENANTS[0]!.name);
    expect(bSnap.name).toBe(TENANTS[1]!.name);
  });
});
