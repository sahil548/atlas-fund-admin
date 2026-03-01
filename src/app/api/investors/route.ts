import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const investors = await prisma.investor.findMany({
    include: {
      commitments: { include: { entity: { select: { id: true, name: true } } } },
    },
    orderBy: { totalCommitted: "desc" },
  });
  return NextResponse.json(investors);
}
