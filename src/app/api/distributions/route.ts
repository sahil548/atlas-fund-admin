import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDistributionSchema } from "@/lib/schemas";

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

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateDistributionSchema);
  if (error) return error;
  const dist = await prisma.distributionEvent.create({
    data: {
      ...data!,
      distributionDate: new Date(data!.distributionDate),
    },
  });
  return NextResponse.json(dist, { status: 201 });
}
