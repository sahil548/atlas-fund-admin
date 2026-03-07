/**
 * Permissions system for role-based access control.
 *
 * UserRole hierarchy:
 *   GP_ADMIN       — full access to everything, cannot be restricted
 *   GP_TEAM        — configurable per-area permissions (default: read_only everywhere)
 *   SERVICE_PROVIDER — read-only on assigned entities only (entityAccess[])
 *   LP_INVESTOR    — no GP access at all; LP portal only
 */

import { prisma } from "@/lib/prisma";

// ── Permission Areas ────────────────────────────────────────

export const PERMISSION_AREAS = [
  "deals",
  "entities",
  "capital_activity",
  "investors",
  "documents",
  "settings",
  "reports",
] as const;

export type PermissionArea = (typeof PERMISSION_AREAS)[number];
export type PermissionLevel = "full" | "read_only" | "none";
export type UserPermissions = Record<PermissionArea, PermissionLevel>;

// ── Default Permissions per Role ────────────────────────────

export const DEFAULT_PERMISSIONS: Record<string, UserPermissions> = {
  GP_ADMIN: Object.fromEntries(
    PERMISSION_AREAS.map((area) => [area, "full"]),
  ) as UserPermissions,

  GP_TEAM: Object.fromEntries(
    PERMISSION_AREAS.map((area) => [area, "read_only"]),
  ) as UserPermissions,

  SERVICE_PROVIDER: Object.fromEntries(
    PERMISSION_AREAS.map((area) => [area, "read_only"]),
  ) as UserPermissions,

  LP_INVESTOR: Object.fromEntries(
    PERMISSION_AREAS.map((area) => [area, "none"]),
  ) as UserPermissions,
};

// ── Level ordering for comparison ──────────────────────────

const LEVEL_ORDER: Record<PermissionLevel, number> = {
  none: 0,
  read_only: 1,
  full: 2,
};

/**
 * Check whether a user has at least the required permission level for an area.
 *
 * @param userPermissions - The user's effective permissions
 * @param area - The area being checked
 * @param requiredLevel - Minimum required level
 */
export function checkPermission(
  userPermissions: UserPermissions,
  area: PermissionArea,
  requiredLevel: PermissionLevel,
): boolean {
  const effectiveLevel = userPermissions[area] ?? "none";
  return LEVEL_ORDER[effectiveLevel] >= LEVEL_ORDER[requiredLevel];
}

/**
 * Get the effective permissions for a user.
 * - GP_ADMIN always gets full access (stored permissions ignored)
 * - GP_TEAM: starts with read_only defaults, overridden by stored permissions JSON
 * - SERVICE_PROVIDER: read_only everywhere (entityAccess checked separately)
 * - LP_INVESTOR: none everywhere
 *
 * @param userId - DB user id
 */
export async function getEffectivePermissions(
  userId: string,
): Promise<UserPermissions> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, permissions: true },
  });

  if (!user) {
    // Unknown user — deny everything
    return DEFAULT_PERMISSIONS.LP_INVESTOR;
  }

  const base = DEFAULT_PERMISSIONS[user.role] ?? DEFAULT_PERMISSIONS.LP_INVESTOR;

  // GP_ADMIN always gets full — ignore stored permissions
  if (user.role === "GP_ADMIN") return base;

  // GP_TEAM: merge stored permissions over defaults
  if (user.role === "GP_TEAM" && user.permissions) {
    const stored = user.permissions as Partial<UserPermissions>;
    return { ...base, ...stored };
  }

  return base;
}

/**
 * Validate that a stored permissions object only contains valid areas and levels.
 * Used in the settings API to sanitize input.
 */
export function validatePermissions(
  raw: Record<string, unknown>,
): UserPermissions | null {
  const valid: Partial<UserPermissions> = {};
  for (const area of PERMISSION_AREAS) {
    const level = raw[area];
    if (level === "full" || level === "read_only" || level === "none") {
      valid[area] = level;
    }
  }
  // Must have all areas
  if (PERMISSION_AREAS.every((a) => valid[a] !== undefined)) {
    return valid as UserPermissions;
  }
  return null;
}
