import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdatePermissionsSchema } from "@/lib/schemas";
import { getAuthUser, forbidden } from "@/lib/auth";
import { DEFAULT_PERMISSIONS, PERMISSION_AREAS } from "@/lib/permissions-types";

/**
 * GET /api/settings/permissions
 * List all GP_TEAM users with their current permissions.
 * Only accessible by GP_ADMIN.
 */
export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "GP_ADMIN") return forbidden();

  const gpTeamUsers = await prisma.user.findMany({
    where: {
      firmId: authUser.firmId,
      role: "GP_TEAM",
    },
    select: {
      id: true,
      name: true,
      email: true,
      initials: true,
      permissions: true,
    },
    orderBy: { name: "asc" },
  });

  // Merge stored permissions with defaults
  const usersWithPermissions = gpTeamUsers.map((user) => {
    const base = DEFAULT_PERMISSIONS.GP_TEAM;
    const stored = (user.permissions as Record<string, string> | null) ?? {};
    const effective = { ...base, ...stored };
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      initials: user.initials,
      permissions: effective,
    };
  });

  return NextResponse.json({ users: usersWithPermissions, areas: PERMISSION_AREAS });
}

/**
 * PUT /api/settings/permissions
 * Update permissions for a specific GP_TEAM user.
 * Only accessible by GP_ADMIN.
 */
export async function PUT(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "GP_ADMIN") return forbidden();

  const { data, error } = await parseBody(req, UpdatePermissionsSchema);
  if (error) return error;

  const { userId, permissions } = data!;

  // Verify the target user exists, belongs to this firm, and is GP_TEAM
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firmId: true, role: true },
  });

  if (!targetUser || targetUser.firmId !== authUser.firmId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetUser.role !== "GP_TEAM") {
    return NextResponse.json(
      { error: "Permissions can only be configured for GP_TEAM users" },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { permissions },
    select: { id: true, name: true, permissions: true },
  });

  return NextResponse.json(updated);
}
