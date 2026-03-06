import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-helpers";
import { UpdateDecisionStructureSchema } from "@/lib/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const structure = await prisma.decisionStructure.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, initials: true },
          },
        },
      },
      entities: {
        select: { id: true, name: true },
      },
    },
  });

  if (!structure) {
    return NextResponse.json({ error: "Structure not found" }, { status: 404 });
  }

  return NextResponse.json(structure);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, UpdateDecisionStructureSchema);
  if (error) return error;

  try {
    const structure = await prisma.decisionStructure.update({
      where: { id },
      data: {
        ...(data!.name !== undefined && { name: data!.name }),
        ...(data!.description !== undefined && { description: data!.description }),
        ...(data!.quorumRequired !== undefined && { quorumRequired: data!.quorumRequired }),
        ...(data!.approvalThreshold !== undefined && { approvalThreshold: data!.approvalThreshold }),
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, initials: true },
            },
          },
        },
        entities: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(structure);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Structure not found" }, { status: 404 });
    }
    return NextResponse.json({ error: err.message || "Failed to update structure" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Check if any entities are linked to this structure
  const linkedEntities = await prisma.entity.findMany({
    where: { decisionStructureId: id },
    select: { id: true, name: true },
  });

  if (linkedEntities.length > 0) {
    const names = linkedEntities.map((e) => e.name).join(", ");
    return NextResponse.json(
      { error: `Cannot delete — linked to entities: ${names}. Unlink them first.` },
      { status: 409 },
    );
  }

  try {
    await prisma.decisionStructure.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Structure not found" }, { status: 404 });
    }
    return NextResponse.json({ error: err.message || "Failed to delete structure" }, { status: 500 });
  }
}
