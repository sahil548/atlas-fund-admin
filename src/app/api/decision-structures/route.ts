import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-helpers";
import { CreateDecisionStructureSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firmId = searchParams.get("firmId");

  if (!firmId) {
    return NextResponse.json({ error: "firmId is required" }, { status: 400 });
  }

  const structures = await prisma.decisionStructure.findMany({
    where: { firmId },
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
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(structures);
}

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateDecisionStructureSchema);
  if (error) return error;

  try {
    const structure = await prisma.decisionStructure.create({
      data: {
        firmId: data!.firmId,
        name: data!.name,
        description: data!.description || null,
        quorumRequired: data!.quorumRequired,
        approvalThreshold: data!.approvalThreshold,
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

    return NextResponse.json(structure, { status: 201 });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "P2002") {
      return NextResponse.json({ error: "A structure with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || "Failed to create structure" }, { status: 500 });
  }
}
