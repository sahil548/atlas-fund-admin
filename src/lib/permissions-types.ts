/**
 * Permission type definitions and constants — safe for client components.
 * No server-side imports (no Prisma, no Node.js APIs).
 */

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

export const LEVEL_ORDER: Record<PermissionLevel, number> = {
  none: 0,
  read_only: 1,
  full: 2,
};

/**
 * Check whether a user has at least the required permission level for an area.
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
 * Validate that a stored permissions object only contains valid areas and levels.
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
  if (PERMISSION_AREAS.every((a) => valid[a] !== undefined)) {
    return valid as UserPermissions;
  }
  return null;
}
