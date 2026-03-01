import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await params;
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: {
      accountingConnection: true,
      navComputations: { orderBy: { periodDate: "desc" }, take: 1 },
      assetAllocations: {
        include: {
          asset: {
            include: { valuations: { orderBy: { valuationDate: "desc" }, take: 1 } },
          },
        },
      },
    },
  });
  if (!entity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entity);
}
