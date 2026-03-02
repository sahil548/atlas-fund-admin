import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const assetClass = req.nextUrl.searchParams.get("assetClass");
  const status = req.nextUrl.searchParams.get("status");
  const firmId = req.nextUrl.searchParams.get("firmId");

  const where: Record<string, unknown> = {};
  if (assetClass) where.assetClass = assetClass;
  if (status) where.status = status;
  if (firmId) {
    where.entityAllocations = { some: { entity: { firmId } } };
  }

  const assets = await prisma.asset.findMany({
    where,
    include: {
      entityAllocations: { include: { entity: { select: { id: true, name: true } } } },
      equityDetails: true,
      creditDetails: true,
      realEstateDetails: true,
      fundLPDetails: true,
    },
    orderBy: { fairValue: "desc" },
  });
  return NextResponse.json(assets);
}
