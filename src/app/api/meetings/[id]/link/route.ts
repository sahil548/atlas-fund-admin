/**
 * PATCH /api/meetings/[id]/link
 *
 * Link a meeting to a deal, entity (vehicle), or asset.
 * Sets whichever of dealId/entityId/assetId fields are provided.
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  // Only GP roles can link meetings
  if (authUser.role !== "GP_ADMIN" && authUser.role !== "GP_TEAM") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await req.json();

  const updateData: Record<string, string | null> = {};

  if (body.dealId !== undefined) {
    updateData.dealId = body.dealId || null;
  }
  if (body.entityId !== undefined) {
    updateData.entityId = body.entityId || null;
  }
  if (body.assetId !== undefined) {
    updateData.assetId = body.assetId || null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const meeting = await prisma.meeting.update({
      where: { id },
      data: updateData,
      include: {
        deal: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
        asset: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ success: true, meeting });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    if (err.code === "P2003") {
      return NextResponse.json({ error: "Referenced record not found" }, { status: 400 });
    }
    console.error("[meetings/link] PATCH Error:", err);
    return NextResponse.json({ error: "Failed to link meeting" }, { status: 500 });
  }
}
