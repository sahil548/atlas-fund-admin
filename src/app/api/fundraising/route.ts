import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const entityId = req.nextUrl.searchParams.get("entityId");
  const where: Record<string, unknown> = {};
  if (entityId) where.entityId = entityId;

  const rounds = await prisma.fundraisingRound.findMany({
    where,
    include: {
      prospects: { orderBy: { status: "asc" } },
      entity: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rounds);
}

export async function POST(req: Request) {
  const body = await req.json();
  const round = await prisma.fundraisingRound.create({ data: body });
  return NextResponse.json(round, { status: 201 });
}
