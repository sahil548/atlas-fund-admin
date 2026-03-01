import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const distributions = await prisma.distributionEvent.findMany({
    include: {
      entity: { select: { id: true, name: true } },
      lineItems: { include: { investor: true } },
    },
    orderBy: { distributionDate: "desc" },
  });
  return NextResponse.json(distributions);
}
