import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateUnitClassSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");
  if (!entityId) return NextResponse.json({ error: "entityId is required" }, { status: 400 });

  const unitClasses = await prisma.unitClass.findMany({
    where: { entityId },
    include: {
      ownershipUnits: {
        include: { investor: { select: { id: true, name: true, investorType: true, kycStatus: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(unitClasses);
}

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateUnitClassSchema);
  if (error) return error;

  // Verify entity exists
  const entity = await prisma.entity.findUnique({ where: { id: data!.entityId }, select: { id: true } });
  if (!entity) return NextResponse.json({ error: "Entity not found" }, { status: 404 });

  try {
    const unitClass = await prisma.unitClass.create({ data: data! });
    return NextResponse.json(unitClass, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "A unit class with this name already exists for this entity" }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
