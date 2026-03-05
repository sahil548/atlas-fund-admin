import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDealSchema } from "@/lib/schemas";
import { getAuthUser, unauthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  const firmId = authUser?.firmId || req.nextUrl.searchParams.get("firmId");
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

  // Compute screening stats from real data
  const docsProcessed = deals.filter((d) => d.screeningResult !== null).length;
  const dealsScreened = deals.length;
  const passedToDD = deals.filter((d) =>
    ["DUE_DILIGENCE", "IC_REVIEW", "CLOSING", "CLOSED"].includes(d.stage),
  ).length;

  // Pipeline analytics
  const stageDistribution: Record<string, number> = {};
  for (const stage of ["SCREENING", "DUE_DILIGENCE", "IC_REVIEW", "CLOSING", "CLOSED", "DEAD"]) {
    stageDistribution[stage] = deals.filter((d) => d.stage === stage).length;
  }

  function parseTargetSize(s: string | null): number {
    if (!s) return 0;
    const cleaned = s.replace(/[^0-9.BMKbmk]/g, "");
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    if (/[Bb]/.test(s)) return num * 1_000_000_000;
    if (/[Mm]/.test(s)) return num * 1_000_000;
    if (/[Kk]/.test(s)) return num * 1_000;
    return num;
  }

  const valueByStage: Record<string, number> = {};
  for (const stage of ["SCREENING", "DUE_DILIGENCE", "IC_REVIEW", "CLOSING"]) {
    valueByStage[stage] = deals
      .filter((d) => d.stage === stage)
      .reduce((sum, d) => sum + parseTargetSize(d.targetSize), 0);
  }

  // Total pipeline value (active deals only)
  const pipelineValue = deals
    .filter((d) => !["CLOSED", "DEAD"].includes(d.stage))
    .reduce((sum, d) => sum + parseTargetSize(d.targetSize), 0);

  const totalDeals = deals.length;
  const pastScreening = deals.filter((d) => ["DUE_DILIGENCE", "IC_REVIEW", "CLOSING", "CLOSED"].includes(d.stage)).length;
  const pastDD = deals.filter((d) => ["IC_REVIEW", "CLOSING", "CLOSED"].includes(d.stage)).length;
  const pastIC = deals.filter((d) => ["CLOSING", "CLOSED"].includes(d.stage)).length;

  const screeningToDD = totalDeals > 0 ? Math.round((pastScreening / totalDeals) * 100) : 0;
  const ddToIC = pastScreening > 0 ? Math.round((pastDD / pastScreening) * 100) : 0;
  const icToClose = pastDD > 0 ? Math.round((pastIC / pastDD) * 100) : 0;

  return NextResponse.json({
    deals,
    screeningStats: {
      docsProcessed,
      dealsScreened,
      passedToDD,
    },
    pipelineAnalytics: {
      stageDistribution,
      valueByStage,
      pipelineValue,
      conversionRates: { screeningToDD, ddToIC, icToClose },
      totalActiveDeals: deals.filter((d) => !["CLOSED", "DEAD"].includes(d.stage)).length,
      totalClosedDeals: stageDistribution.CLOSED || 0,
      totalDeadDeals: stageDistribution.DEAD || 0,
    },
  });
}

export async function POST(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { data, error } = await parseBody(req, CreateDealSchema);
  if (error) return error;

  // Sanitize optional FK fields: convert empty strings to null/undefined
  const cleaned = { ...data! };
  if (!cleaned.dealLeadId) cleaned.dealLeadId = undefined;
  if (!cleaned.entityId) cleaned.entityId = undefined;

  const deal = await prisma.deal.create({ data: { ...cleaned, firmId: authUser.firmId } });
  return NextResponse.json(deal, { status: 201 });
}
