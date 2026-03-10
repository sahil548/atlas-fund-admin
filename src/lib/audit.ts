/**
 * Audit logging helpers.
 *
 * Call logAudit() after successful mutations to record who did what.
 * Fire-and-forget: never awaited in hot paths; failures are logged but don't block responses.
 */

import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "CREATE_DEAL"
  | "UPDATE_DEAL"
  | "KILL_DEAL"
  | "CLOSE_DEAL"
  | "REVIVE_DEAL"
  | "CREATE_ENTITY"
  | "UPDATE_ENTITY"
  | "CREATE_ASSET"
  | "UPDATE_ASSET"
  | "CREATE_CAPITAL_CALL"
  | "UPDATE_CAPITAL_CALL"
  | "CREATE_DISTRIBUTION"
  | "UPDATE_DISTRIBUTION"
  | "UPDATE_PERMISSIONS"
  | "UPDATE_ENTITY_ACCESS"
  | "CREATE_DOCUMENT"
  | "DELETE_DOCUMENT"
  | "STATUS_TRANSITION"
  | "K1_ACKNOWLEDGE"
  | "K1_REMINDER_SENT";

/**
 * Log an auditable action.
 *
 * @param firmId     - The firm context
 * @param userId     - DB user id of the actor
 * @param action     - What happened (see AuditAction union)
 * @param targetType - Model type e.g. "Deal", "Entity"
 * @param targetId   - ID of the affected record
 * @param metadata   - Optional extra data (changes, description, etc.)
 */
export async function logAudit(
  firmId: string,
  userId: string,
  action: AuditAction,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        firmId,
        userId,
        action,
        targetType,
        targetId,
        metadata: (metadata ?? null) as Parameters<typeof prisma.auditLog.create>[0]["data"]["metadata"],
      },
    });
  } catch (err) {
    // Audit log failure should never block the primary operation
    console.error("[audit] Failed to write audit log:", err);
  }
}
