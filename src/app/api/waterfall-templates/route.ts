import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const templates = await prisma.waterfallTemplate.findMany({
    include: {
      tiers: { orderBy: { tierOrder: "asc" } },
      entities: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(templates);
}
