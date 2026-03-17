import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateUnitClassSchema } from "@/lib/schemas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const unitClass = await prisma.unitClass.findUnique({
    where: { id },
    include: {
      ownershipUnits: {
        include: { investor: { select: { id: true, name: true, investorType: true, kycStatus: true } } },
      },
    },
  });
  if (!unitClass) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(unitClass);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await parseBody(req, UpdateUnitClassSchema);
  if (error) return error;

  try {
    const unitClass = await prisma.unitClass.update({ where: { id }, data: data! });
    return NextResponse.json(unitClass);
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (e.code === "P2002") return NextResponse.json({ error: "Name already exists" }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check for active ownership units
  const activeUnits = await prisma.ownershipUnit.count({
    where: { unitClassId: id, status: "ACTIVE" },
  });
  if (activeUnits > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${activeUnits} active ownership unit(s) exist. Redeem or cancel them first.` },
      { status: 400 }
    );
  }

  try {
    await prisma.unitClass.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
