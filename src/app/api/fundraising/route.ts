import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateFundraisingRoundSchema } from "@/lib/schemas";

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
  const { data, error } = await parseBody(req, CreateFundraisingRoundSchema);
  if (error) return error;
  const { entityId, name, targetAmount, status, closingDate } = data!;
  const round = await prisma.fundraisingRound.create({
    data: {
      entityId,
      name,
      ...(targetAmount !== undefined && { targetAmount }),
      ...(status !== undefined && { status }),
      ...(closingDate !== undefined && { closeDate: new Date(closingDate) }),
    },
  });
  return NextResponse.json(round, { status: 201 });
}
