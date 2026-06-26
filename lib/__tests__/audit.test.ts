import { describe, it, expect } from "vitest";
import { withIsolatedDatabase, db, USERS, TENANTS } from "@/test-utils/db";
import { auditLog, listAudit } from "@/lib/audit";

withIsolatedDatabase();

describe("audit", () => {
  it("writes a row with stringified payload and returns id", () => {
    const id = auditLog({
      userId:   USERS[0]!.id,
      tenantId: TENANTS[0]!.id,
      action:   "acknowledgeAlert",
      targetType: "alert",
      targetId: "t_acme-al0001",
      payload:  { note: "verified" },
      status:   "success"
    });
    expect(id).toBeGreaterThan(0);
    const row = db().prepare("SELECT * FROM audit_log WHERE id = ?").get(id) as {
      action: string; payload: string; status: string;
    };
    expect(row.action).toBe("acknowledgeAlert");
    expect(row.status).toBe("success");
    expect(JSON.parse(row.payload)).toEqual({ note: "verified" });
  });

  it("listAudit returns only rows for the requested tenant", () => {
    auditLog({ userId: USERS[0]!.id, tenantId: TENANTS[0]!.id, action: "acknowledgeAlert", status: "success" });
    auditLog({ userId: USERS[2]!.id, tenantId: TENANTS[1]!.id, action: "acknowledgeAlert", status: "success" });
    auditLog({ userId: USERS[0]!.id, tenantId: TENANTS[0]!.id, action: "archiveAlert",    status: "failure", error: "x" });

    const tenantARows = listAudit(TENANTS[0]!.id);
    const tenantBRows = listAudit(TENANTS[1]!.id);
    expect(tenantARows.every(r => r.tenantId === TENANTS[0]!.id)).toBe(true);
    expect(tenantBRows.every(r => r.tenantId === TENANTS[1]!.id)).toBe(true);
    expect(tenantARows.length).toBe(2);
    expect(tenantBRows.length).toBe(1);
  });
});
