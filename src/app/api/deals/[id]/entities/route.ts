import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-helpers";
import { AddDealEntitySchema } from "@/lib/schemas";

/**
 * GET /api/deals/[id]/entities
 * Fetch all DealEntity records for a deal with entity details.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const deal = await prisma.deal.findUnique({ where: { id }, select: { id: true } });
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const dealEntities = await prisma.dealEntity.findMany({
    where: { dealId: id },
    include: {
      entity: {
        select: {
          id: true,
          name: true,
          entityType: true,
          formationStatus: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(dealEntities);
}

/**
 * POST /api/deals/[id]/entities
 * Add an entity to a deal via the DealEntity junction table.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, AddDealEntitySchema);
  if (error) return error;

  // Verify deal exists and get firmId
  const deal = await prisma.deal.findUnique({
    where: { id },
    select: { id: true, firmId: true },
  });
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Verify entity belongs to same firm as the deal
  const entity = await prisma.entity.findUnique({
    where: { id: data!.entityId },
    select: { id: true, firmId: true },
  });
  if (!entity) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }
  if (deal.firmId && entity.firmId !== deal.firmId) {
    return NextResponse.json(
      { error: "Entity does not belong to the same firm as the deal" },
      { status: 400 },
    );
  }

  try {
    const dealEntity = await prisma.dealEntity.create({
      data: {
        dealId: id,
        entityId: data!.entityId,
        allocationPercent: data!.allocationPercent,
        role: data!.role,
      },
      include: {
        entity: {
          select: {
            id: true,
            name: true,
            entityType: true,
            formationStatus: true,
          },
        },
      },
    });

    return NextResponse.json(dealEntity, { status: 201 });
  } catch (e: unknown) {
    const prismaError = e as { code?: string };
    if (prismaError.code === "P2002") {
      return NextResponse.json(
        { error: "Entity is already linked to this deal" },
        { status: 409 },
      );
    }
    throw e;
  }
}

/**
 * DELETE /api/deals/[id]/entities
 * Remove an entity from a deal. Expects ?entityId=... query param.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entityId = req.nextUrl.searchParams.get("entityId");

  if (!entityId) {
    return NextResponse.json(
      { error: "entityId query parameter is required" },
      { status: 400 },
    );
  }

  // Find and delete the junction record
  const existing = await prisma.dealEntity.findUnique({
    where: { dealId_entityId: { dealId: id, entityId } },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Entity is not linked to this deal" },
      { status: 404 },
    );
  }

  await prisma.dealEntity.delete({
    where: { dealId_entityId: { dealId: id, entityId } },
  });

  return NextResponse.json({ success: true });
}
