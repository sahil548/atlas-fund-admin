import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateEntityAccessSchema } from "@/lib/schemas";
import { getAuthUser, forbidden } from "@/lib/auth";

/**
 * GET /api/users/[id]/entity-access
 * Get the entityAccess[] list for a SERVICE_PROVIDER user.
 * Only accessible by GP_ADMIN.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "GP_ADMIN") return forbidden();

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      entityAccess: true,
      firmId: true,
    },
  });

  if (!user || user.firmId !== authUser.firmId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Enrich with entity names
  const entities = user.entityAccess.length > 0
    ? await prisma.entity.findMany({
        where: { id: { in: user.entityAccess } },
        select: { id: true, name: true, entityType: true },
      })
    : [];

  return NextResponse.json({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    entityAccess: user.entityAccess,
    entities,
  });
}

/**
 * PUT /api/users/[id]/entity-access
 * Update entityAccess[] for a SERVICE_PROVIDER user.
 * Only accessible by GP_ADMIN.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "GP_ADMIN") return forbidden();

  const { data, error } = await parseBody(req, UpdateEntityAccessSchema);
  if (error) return error;

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, firmId: true, role: true },
  });

  if (!targetUser || targetUser.firmId !== authUser.firmId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Validate all entity IDs belong to this firm
  if (data!.entityIds.length > 0) {
    const validEntities = await prisma.entity.findMany({
      where: { id: { in: data!.entityIds }, firmId: authUser.firmId },
      select: { id: true },
    });
    if (validEntities.length !== data!.entityIds.length) {
      return NextResponse.json(
        { error: "One or more entity IDs are invalid or belong to a different firm" },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { entityAccess: data!.entityIds },
    select: { id: true, name: true, entityAccess: true },
  });

  return NextResponse.json(updated);
}
