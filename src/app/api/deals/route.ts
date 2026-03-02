import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDealSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  const firmId = req.nextUrl.searchParams.get("firmId");
  const where: Record<string, unknown> = {};
  if (firmId) where.firmId = firmId;

  const deals = await prisma.deal.findMany({
    where,
    include: {
      workstreams: { include: { tasks: true } },
      screeningResult: true,
      icProcess: { include: { votes: true } },
      dealLead: { select: { id: true, name: true, initials: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute AI screening stats from real data
  const docsProcessed = deals.filter((d) => d.screeningResult !== null).length;
  const dealsScreened = docsProcessed;
  const passedToDD = deals.filter((d) =>
    ["DUE_DILIGENCE", "IC_REVIEW", "CLOSING"].includes(d.stage),
  ).length;
  const passRate =
    dealsScreened > 0
      ? `${Math.round((passedToDD / dealsScreened) * 100)}% to DD`
      : "0% to DD";

  return NextResponse.json({
    deals,
    screeningStats: {
      docsProcessed,
      dealsScreened,
      passedToDD,
      passRate,
    },
  });
}

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, CreateDealSchema);
  if (error) return error;
  const deal = await prisma.deal.create({ data: { ...data!, firmId: "firm-1" } });
  return NextResponse.json(deal, { status: 201 });
}
