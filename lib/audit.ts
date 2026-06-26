import { getDb } from "@/lib/db";

export type AuditAction =
  | "acknowledgeAlert"
  | "archiveAlert"
  | "escalateAlert"
  | "isolateAgent"
  | "unisolateAgent"
  | "restartAgent"
  | "setVulnStatus"
  | "markFimReviewed"
  | "toggleRule"
  | "login"
  | "logout";

export type AuditStatus = "success" | "failure";

export interface AuditEntry {
  userId:     string;
  tenantId:   string;
  action:     AuditAction;
  targetType?: string;
  targetId?:   string;
  payload?:    unknown;
  status:      AuditStatus;
  error?:      string;
}

/**
 * Inserts a row into the audit log. Synchronous because better-sqlite3
 * is synchronous, and we want the audit to land before the response
 * is returned to the client.
 */
export function auditLog(entry: AuditEntry): number {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO audit_log
      (user_id, tenant_id, action, target_type, target_id, payload, status, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.userId,
    entry.tenantId,
    entry.action,
    entry.targetType ?? null,
    entry.targetId ?? null,
    entry.payload == null ? null : JSON.stringify(entry.payload),
    entry.status,
    entry.error ?? null
  );
  return Number(result.lastInsertRowid);
}

export interface AuditRow {
  id: number;
  userId: string;
  tenantId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  payload: string | null;
  status: string;
  error: string | null;
  createdAt: number;
}

export function listAudit(tenantId: string, limit = 100): AuditRow[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, user_id as userId, tenant_id as tenantId, action,
           target_type as targetType, target_id as targetId, payload,
           status, error, created_at as createdAt
    FROM audit_log
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(tenantId, limit) as AuditRow[];
  return rows;
}
