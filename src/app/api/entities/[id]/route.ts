import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateEntitySchema } from "@/lib/schemas";

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
      capitalCalls: { include: { entity: { select: { id: true, name: true } }, lineItems: { include: { investor: true } } }, orderBy: { callDate: "desc" } },
      distributions: { include: { entity: { select: { id: true, name: true } }, lineItems: { include: { investor: true } } }, orderBy: { distributionDate: "desc" } },
      waterfallTemplate: { include: { tiers: { orderBy: { tierOrder: "asc" } } } },
      feeCalculations: true,
      sideLetters: { include: { investor: true, entity: true } },
      capitalAccounts: { orderBy: { periodDate: "desc" } },
      meetings: { orderBy: { meetingDate: "desc" } },
      documents: { orderBy: { uploadDate: "desc" } },
    },
  });
  if (!entity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entity);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await parseBody(req, UpdateEntitySchema);
  if (error) return error;
  const { investmentPeriodEnd, ...rest } = data!;
  const entity = await prisma.entity.update({
    where: { id },
    data: {
      ...rest,
      ...(investmentPeriodEnd ? { investmentPeriodEnd: new Date(investmentPeriodEnd) } : {}),
    },
  });
  return NextResponse.json(entity);
}
