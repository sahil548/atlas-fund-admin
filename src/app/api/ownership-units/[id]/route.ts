import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateOwnershipUnitSchema } from "@/lib/schemas";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, UpdateOwnershipUnitSchema);
  if (error) return error;

  const existing = await prisma.ownershipUnit.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If changing from ACTIVE to non-ACTIVE, decrement totalIssued
  if (data!.status && data!.status !== "ACTIVE" && existing.status === "ACTIVE") {
    const [unit] = await prisma.$transaction([
      prisma.ownershipUnit.update({ where: { id }, data: data! }),
      prisma.unitClass.update({
        where: { id: existing.unitClassId },
        data: { totalIssued: { decrement: existing.unitsIssued } },
      }),
    ]);
    return NextResponse.json(unit);
  }

  // If changing from non-ACTIVE back to ACTIVE, increment totalIssued
  if (data!.status === "ACTIVE" && existing.status !== "ACTIVE") {
    const [unit] = await prisma.$transaction([
      prisma.ownershipUnit.update({ where: { id }, data: data! }),
      prisma.unitClass.update({
        where: { id: existing.unitClassId },
        data: { totalIssued: { increment: existing.unitsIssued } },
      }),
    ]);
    return NextResponse.json(unit);
  }

  const unit = await prisma.ownershipUnit.update({ where: { id }, data: data! });
  return NextResponse.json(unit);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.ownershipUnit.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Decrement totalIssued if the unit was active
  if (existing.status === "ACTIVE") {
    await prisma.$transaction([
      prisma.ownershipUnit.delete({ where: { id } }),
      prisma.unitClass.update({
        where: { id: existing.unitClassId },
        data: { totalIssued: { decrement: existing.unitsIssued } },
      }),
    ]);
  } else {
    await prisma.ownershipUnit.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
