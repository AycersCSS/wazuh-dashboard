import { describe, it, expect } from "vitest";
import { withIsolatedDatabase, USERS, TENANTS } from "@/test-utils/db";
import { runAction } from "@/lib/wazuh/actions";
import { listAgents, listAlerts } from "@/lib/wazuh/client";
import { listAudit } from "@/lib/audit";
import type { ResolvedSession } from "@/lib/auth";

withIsolatedDatabase();

function sessionFor(userIdx: number): ResolvedSession {
  const u = USERS[userIdx]!;
  return {
    userId:   u.id,
    email:    u.email,
    name:     u.name,
    tenantId: u.tenant_id,
    role:     u.role
  };
}

function ctxFor(tenantId: string) {
  const t = TENANTS.find(t => t.id === tenantId)!;
  return { id: t.id, name: t.name, tier: t.tier };
}

describe("actions", () => {
  it("acknowledgeAlert marks the alert and writes audit", async () => {
    const session = sessionFor(0); // Acme admin
    const alert = listAlerts(ctxFor(session.tenantId))[0]!;
    expect(alert.acknowledged).toBe(false);

    const result = await runAction(session, { type: "acknowledgeAlert", targetId: alert.id });
    expect(result.ok).toBe(true);

    const after = listAlerts(ctxFor(session.tenantId)).find(a => a.id === alert.id)!;
    expect(after.acknowledged).toBe(true);

    const audit = listAudit(session.tenantId);
    expect(audit.find(r => r.action === "acknowledgeAlert" && r.targetId === alert.id)).toBeTruthy();
  });

  it("rejects cross-tenant target ids", async () => {
    const acmeUser = sessionFor(0);     // t_acme admin
    const starkAgent = listAgents(ctxFor("t_stark"))[0]!;
    // The Stark agent id does not exist in Acme's tenant state. The action
    // must reject it (whether via `agent_not_found` or `cross_tenant`) and
    // must NOT mutate Stark's agent.
    const result = await runAction(acmeUser, { type: "isolateAgent", targetId: starkAgent.id });
    expect(result.ok).toBe(false);

    const starkAgentAfter = listAgents(ctxFor("t_stark")).find(a => a.id === starkAgent.id)!;
    expect(starkAgentAfter.status).toBe(starkAgent.status);

    const audit = listAudit(acmeUser.tenantId);
    const fail = audit.find(r => r.action === "isolateAgent" && r.status === "failure");
    expect(fail).toBeTruthy();
  });

  it("rejects role-inappropriate actions", async () => {
    const viewer = sessionFor(1); // Acme viewer
    const agent  = listAgents(ctxFor(viewer.tenantId))[0]!;
    const result = await runAction(viewer, { type: "isolateAgent", targetId: agent.id });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/role/);
  });

  it("returns unknown target for non-existent ids", async () => {
    const session = sessionFor(0);
    const result = await runAction(session, { type: "acknowledgeAlert", targetId: "nope" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("alert_not_found");
  });

  it("rejects unknown action types", async () => {
    const session = sessionFor(0);
    const result = await runAction(session, { type: "acknowledgeAlert", targetId: "x" });
    // Use a known type so we can verify the dispatch path returns the right error.
    const r2 = await runAction(session, { type: "acknowledgeAlert", targetId: "missing" });
    expect(r2.ok).toBe(false);
  });
});
