/**
 * Permissions system — server-side only (uses Prisma).
 * For client-safe types and constants, import from permissions-types.ts directly.
 */

// Re-export everything from permissions-types for convenience (server components can import this)
export {
  PERMISSION_AREAS,
  DEFAULT_PERMISSIONS,
  LEVEL_ORDER,
  checkPermission,
  validatePermissions,
} from "@/lib/permissions-types";

export type { PermissionArea, PermissionLevel, UserPermissions } from "@/lib/permissions-types";

// ── Server-only: requires Prisma ─────────────────────────────

import { prisma } from "@/lib/prisma";
import { DEFAULT_PERMISSIONS as DEFAULTS } from "@/lib/permissions-types";
import type { UserPermissions } from "@/lib/permissions-types";

/**
 * Get the effective permissions for a user.
 * - GP_ADMIN always gets full access
 * - GP_TEAM: starts with read_only defaults, overridden by stored permissions JSON
 * - SERVICE_PROVIDER: read_only everywhere (entityAccess checked separately)
 * - LP_INVESTOR: none everywhere
 */
export async function getEffectivePermissions(
  userId: string,
): Promise<UserPermissions> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, permissions: true },
  });

  if (!user) {
    return DEFAULTS.LP_INVESTOR;
  }

  const base = DEFAULTS[user.role] ?? DEFAULTS.LP_INVESTOR;

  if (user.role === "GP_ADMIN") return base;

  if (user.role === "GP_TEAM" && user.permissions) {
    const stored = user.permissions as Partial<UserPermissions>;
    return { ...base, ...stored };
  }

  return base;
}
