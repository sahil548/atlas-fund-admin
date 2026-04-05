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

  // Calculate totalIssued adjustment on the unit class
  const statusChanging = data!.status && data!.status !== existing.status;
  const unitsChanging = data!.unitsIssued !== undefined && data!.unitsIssued !== existing.unitsIssued;
  const goingInactive = statusChanging && data!.status !== "ACTIVE" && existing.status === "ACTIVE";
  const goingActive = statusChanging && data!.status === "ACTIVE" && existing.status !== "ACTIVE";

  // Determine the net change to totalIssued on the unit class
  let totalIssuedDelta = 0;
  if (goingInactive) {
    // Removing active units: decrement by new count (or old if not changing)
    totalIssuedDelta = -(data!.unitsIssued ?? existing.unitsIssued);
  } else if (goingActive) {
    // Reactivating units: increment by new count (or old if not changing)
    totalIssuedDelta = data!.unitsIssued ?? existing.unitsIssued;
  } else if (unitsChanging && existing.status === "ACTIVE") {
    // Units changed while staying active: adjust by the difference
    totalIssuedDelta = data!.unitsIssued! - existing.unitsIssued;
  }

  if (totalIssuedDelta !== 0) {
    const [unit] = await prisma.$transaction([
      prisma.ownershipUnit.update({ where: { id }, data: data! }),
      prisma.unitClass.update({
        where: { id: existing.unitClassId },
        data: { totalIssued: { increment: totalIssuedDelta } },
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
