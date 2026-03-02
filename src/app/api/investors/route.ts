import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateInvestorSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const firmId = req.nextUrl.searchParams.get("firmId");
  const where: Record<string, unknown> = {};
  if (firmId) {
    where.commitments = { some: { entity: { firmId } } };
  }

  const investors = await prisma.investor.findMany({
    where,
    include: {
      commitments: { include: { entity: { select: { id: true, name: true } } } },
    },
    orderBy: { totalCommitted: "desc" },
  });
  return NextResponse.json(investors);
}

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateInvestorSchema);
  if (error) return error;
  const investor = await prisma.investor.create({ data: data! });
  return NextResponse.json(investor, { status: 201 });
}
