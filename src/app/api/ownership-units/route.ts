import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { IssueUnitsSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const unitClassId = searchParams.get("unitClassId");
  const entityId = searchParams.get("entityId");

  if (!unitClassId && !entityId) {
    return NextResponse.json({ error: "unitClassId or entityId is required" }, { status: 400 });
  }

  const where: Record<string, unknown> = {};
  if (unitClassId) where.unitClassId = unitClassId;
  if (entityId) where.unitClass = { entityId };

  const units = await prisma.ownershipUnit.findMany({
    where,
    include: {
      investor: { select: { id: true, name: true, investorType: true, kycStatus: true } },
      unitClass: { select: { id: true, name: true, classType: true, unitPrice: true } },
    },
    orderBy: { acquisitionDate: "asc" },
  });

  return NextResponse.json(units);
}

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, IssueUnitsSchema);
  if (error) return error;

  const { unitClassId, investorId, unitsIssued, unitCost, acquisitionDate, notes } = data!;

  // Verify unit class exists and check authorized limit
  const unitClass = await prisma.unitClass.findUnique({ where: { id: unitClassId } });
  if (!unitClass) return NextResponse.json({ error: "Unit class not found" }, { status: 404 });

  if (unitClass.status !== "ACTIVE") {
    return NextResponse.json({ error: "Unit class is not active" }, { status: 400 });
  }

  if (unitClass.totalAuthorized !== null) {
    const remaining = unitClass.totalAuthorized - unitClass.totalIssued;
    if (unitsIssued > remaining) {
      return NextResponse.json(
        { error: `Cannot issue ${unitsIssued} units. Only ${remaining} authorized units remaining.` },
        { status: 400 }
      );
    }
  }

  // Verify investor exists
  const investor = await prisma.investor.findUnique({ where: { id: investorId }, select: { id: true } });
  if (!investor) return NextResponse.json({ error: "Investor not found" }, { status: 404 });

  // Atomic: create ownership unit + increment totalIssued
  const [ownershipUnit] = await prisma.$transaction([
    prisma.ownershipUnit.create({
      data: {
        unitClassId,
        investorId,
        unitsIssued,
        unitCost,
        acquisitionDate: new Date(acquisitionDate),
        notes: notes || null,
      },
    }),
    prisma.unitClass.update({
      where: { id: unitClassId },
      data: { totalIssued: { increment: unitsIssued } },
    }),
  ]);

  return NextResponse.json(ownershipUnit, { status: 201 });
}
