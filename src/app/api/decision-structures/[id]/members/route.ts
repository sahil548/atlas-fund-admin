import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody } from "@/lib/api-helpers";
import { AddDecisionMemberSchema } from "@/lib/schemas";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: structureId } = await params;
  const { data, error } = await parseBody(req, AddDecisionMemberSchema);
  if (error) return error;

  // Verify structure exists
  const structure = await prisma.decisionStructure.findUnique({
    where: { id: structureId },
  });
  if (!structure) {
    return NextResponse.json({ error: "Structure not found" }, { status: 404 });
  }

  try {
    const member = await prisma.decisionMember.create({
      data: {
        structureId,
        userId: data!.userId,
        role: data!.role || "VOTER",
      },
      include: {
        user: {
          select: { id: true, name: true, initials: true },
        },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "P2002") {
      return NextResponse.json({ error: "User is already a member of this structure" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || "Failed to add member" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: structureId } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId query parameter is required" }, { status: 400 });
  }

  try {
    await prisma.decisionMember.delete({
      where: {
        structureId_userId: {
          structureId,
          userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Member not found in this structure" }, { status: 404 });
    }
    return NextResponse.json({ error: err.message || "Failed to remove member" }, { status: 500 });
  }
}
