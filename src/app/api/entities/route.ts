import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const entities = await prisma.entity.findMany({
    include: {
      accountingConnection: true,
      commitments: { include: { investor: true } },
      assetAllocations: { include: { asset: true } },
      navComputations: { orderBy: { periodDate: "desc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(entities);
}
