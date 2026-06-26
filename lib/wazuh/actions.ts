import { auditLog, type AuditAction } from "@/lib/audit";
import type { ResolvedSession } from "@/lib/auth";
import type { TenantContext } from "@/lib/wazuh/client";
import { _getState } from "@/lib/wazuh/client";
import { getDb } from "@/lib/db";
import type { VulnState, FimReviewState } from "@/lib/wazuh/types";

export type ActionType =
  | "acknowledgeAlert"
  | "archiveAlert"
  | "escalateAlert"
  | "isolateAgent"
  | "unisolateAgent"
  | "restartAgent"
  | "setVulnStatus"
  | "markFimReviewed"
  | "toggleRule";

export interface ActionRequest {
  type: ActionType;
  targetId: string;
  payload?: { status?: VulnState | FimReviewState };
}

export type ActionResult = { ok: true; data?: unknown } | { ok: false; error: string };

function tenantContextFor(session: ResolvedSession): TenantContext | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id, name, tier FROM tenants WHERE id = ?")
    .get(session.tenantId) as
    | { id: string; name: string; tier: "Bronze" | "Silver" | "Gold" | "Platinum" }
    | undefined;
  if (!row) return null;
  return { id: row.id, name: row.name, tier: row.tier };
}

function requireRole(session: ResolvedSession, roles: ResolvedSession["role"][]): void {
  if (!roles.includes(session.role)) {
    throw new ActionForbiddenError(`role '${session.role}' cannot perform this action`);
  }
}

class ActionForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionForbiddenError";
  }
}

/**
 * Performs the requested action against the stub Wazuh state, then
 * writes a row to the audit log. Throws if the user is not allowed or
 * the target does not exist.
 */
export async function runAction(
  session: ResolvedSession,
  req: ActionRequest
): Promise<ActionResult> {
  const ctx = tenantContextFor(session);
  if (!ctx) {
    return logAndFail(session, req, "tenant_not_found", "tenant_not_found");
  }

  const ts = _getState(ctx);
  let data: unknown = null;

  try {
    switch (req.type) {
      case "acknowledgeAlert": {
        requireRole(session, ["admin", "analyst"]);
        const alert = ts.alerts.get(req.targetId);
        if (!alert) return logAndFail(session, req, "alert_not_found", "alert_not_found");
        if (alert.tenantId !== ctx.id) return logAndFail(session, req, "cross_tenant", "cross_tenant");
        alert.acknowledged = true;
        data = { id: alert.id, acknowledged: true };
        break;
      }
      case "archiveAlert": {
        requireRole(session, ["admin", "analyst"]);
        const alert = ts.alerts.get(req.targetId);
        if (!alert) return logAndFail(session, req, "archiveAlert", "alert_not_found");
        if (alert.tenantId !== ctx.id) return logAndFail(session, req, "archiveAlert", "cross_tenant");
        alert.archived = true;
        data = { id: alert.id, archived: true };
        break;
      }
      case "escalateAlert": {
        requireRole(session, ["admin", "analyst", "viewer"]);
        const alert = ts.alerts.get(req.targetId);
        if (!alert) return logAndFail(session, req, "escalateAlert", "alert_not_found");
        if (alert.tenantId !== ctx.id) return logAndFail(session, req, "escalateAlert", "cross_tenant");
        data = { id: alert.id, escalated: true };
        break;
      }
      case "isolateAgent": {
        requireRole(session, ["admin"]);
        const agent = ts.agents.get(req.targetId);
        if (!agent) return logAndFail(session, req, "isolateAgent", "agent_not_found");
        if (agent.tenantId !== ctx.id) return logAndFail(session, req, "isolateAgent", "cross_tenant");
        agent.status = "isolated";
        data = { id: agent.id, status: "isolated" };
        break;
      }
      case "unisolateAgent": {
        requireRole(session, ["admin"]);
        const agent = ts.agents.get(req.targetId);
        if (!agent) return logAndFail(session, req, "unisolateAgent", "agent_not_found");
        if (agent.tenantId !== ctx.id) return logAndFail(session, req, "unisolateAgent", "cross_tenant");
        agent.status = "active";
        data = { id: agent.id, status: "active" };
        break;
      }
      case "restartAgent": {
        requireRole(session, ["admin"]);
        const agent = ts.agents.get(req.targetId);
        if (!agent) return logAndFail(session, req, "restartAgent", "agent_not_found");
        if (agent.tenantId !== ctx.id) return logAndFail(session, req, "restartAgent", "cross_tenant");
        data = { id: agent.id, restarted: true };
        break;
      }
      case "setVulnStatus": {
        requireRole(session, ["admin", "analyst"]);
        const vuln = ts.vulns.get(req.targetId);
        if (!vuln) return logAndFail(session, req, "setVulnStatus", "vuln_not_found");
        if (vuln.tenantId !== ctx.id) return logAndFail(session, req, "setVulnStatus", "cross_tenant");
        const status = req.payload?.status as VulnState | undefined;
        if (!status || !["open", "in_progress", "patched", "wont_fix"].includes(status)) {
          return logAndFail(session, req, "setVulnStatus", "invalid_status");
        }
        vuln.status = status;
        data = { id: vuln.id, status };
        break;
      }
      case "markFimReviewed": {
        requireRole(session, ["admin", "analyst"]);
        const event = ts.fimEvents.get(req.targetId);
        if (!event) return logAndFail(session, req, "markFimReviewed", "fim_not_found");
        if (event.tenantId !== ctx.id) return logAndFail(session, req, "markFimReviewed", "cross_tenant");
        event.review = "reviewed";
        data = { id: event.id, review: "reviewed" };
        break;
      }
      case "toggleRule": {
        requireRole(session, ["admin"]);
        const rule = ts.rules.get(req.targetId);
        if (!rule) return logAndFail(session, req, "toggleRule", "rule_not_found");
        if (rule.tenantId !== ctx.id) return logAndFail(session, req, "toggleRule", "cross_tenant");
        rule.enabled = !rule.enabled;
        data = { id: rule.id, enabled: rule.enabled };
        break;
      }
      default: {
        return logAndFail(session, req, "unknown_action", "unknown_action");
      }
    }

    auditLog({
      userId:     session.userId,
      tenantId:   session.tenantId,
      action:     req.type as AuditAction,
      targetType: req.type.replace(/[A-Z].*/, "").toLowerCase(),
      targetId:   req.targetId,
      payload:    req.payload,
      status:     "success"
    });

    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return logAndFail(session, req, req.type, message);
  }
}

function logAndFail(
  session: ResolvedSession,
  req: ActionRequest,
  actionName: string,
  reason: string
): ActionResult {
  auditLog({
    userId:     session.userId,
    tenantId:   session.tenantId,
    action:     actionName as AuditAction,
    targetType: req.type.replace(/[A-Z].*/, "").toLowerCase(),
    targetId:   req.targetId,
    payload:    req.payload,
    status:     "failure",
    error:      reason
  });
  return { ok: false, error: reason };
}
