import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entity = await prisma.entity.findUnique({
    where: { id },
    include: {
      accountingConnection: true,
      commitments: { include: { investor: true } },
      assetAllocations: { include: { asset: true } },
      navComputations: { orderBy: { periodDate: "desc" } },
      capitalCalls: { orderBy: { callDate: "desc" } },
      distributions: { orderBy: { distributionDate: "desc" } },
      waterfallTemplate: { include: { tiers: { orderBy: { tierOrder: "asc" } } } },
      feeCalculations: true,
    },
  });
  if (!entity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entity);
}
