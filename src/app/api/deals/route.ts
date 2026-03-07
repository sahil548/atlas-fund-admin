import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDealSchema } from "@/lib/schemas";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { parsePaginationParams, buildPrismaArgs, buildPaginatedResult } from "@/lib/pagination";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  const firmId = authUser?.firmId || req.nextUrl.searchParams.get("firmId");

  const params = parsePaginationParams(req.nextUrl.searchParams, [
    "firmId", "cursor", "limit", "search", "stage", "assetClass", "dealLeadId",
  ]);

  const baseWhere: Record<string, unknown> = {};
  if (firmId) baseWhere.firmId = firmId;

  const { where, take, skip, cursor, orderBy } = buildPrismaArgs(
    params,
    ["name"],
    baseWhere,
    "createdAt",
  );

  const [rawDeals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      take,
      skip,
      cursor,
      orderBy,
      include: {
        workstreams: { include: { tasks: true } },
        screeningResult: true,
        icProcess: { include: { votes: true } },
        dealLead: { select: { id: true, name: true, initials: true } },
        closingChecklist: { select: { id: true, status: true } },
      },
    }),
    prisma.deal.count({ where }),
  ]);

  const paginated = buildPaginatedResult(rawDeals, params.limit, total);

  // Compute analytics from the full set (not paginated)
  const allDeals = await prisma.deal.findMany({
    where: firmId ? { firmId } : {},
    select: {
      stage: true,
      targetSize: true,
      screeningResult: { select: { id: true } },
    },
  });

  const docsProcessed = allDeals.filter((d) => d.screeningResult !== null).length;
  const dealsScreened = allDeals.length;
  const passedToDD = allDeals.filter((d) =>
    ["DUE_DILIGENCE", "IC_REVIEW", "CLOSING", "CLOSED"].includes(d.stage),
  ).length;

  const stageDistribution: Record<string, number> = {};
  for (const stage of ["SCREENING", "DUE_DILIGENCE", "IC_REVIEW", "CLOSING", "CLOSED", "DEAD"]) {
    stageDistribution[stage] = allDeals.filter((d) => d.stage === stage).length;
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
    valueByStage[stage] = allDeals
      .filter((d) => d.stage === stage)
      .reduce((sum, d) => sum + parseTargetSize(d.targetSize), 0);
  }

  const pipelineValue = allDeals
    .filter((d) => !["CLOSED", "DEAD"].includes(d.stage))
    .reduce((sum, d) => sum + parseTargetSize(d.targetSize), 0);

  const totalDeals = allDeals.length;
  const pastScreening = allDeals.filter((d) =>
    ["DUE_DILIGENCE", "IC_REVIEW", "CLOSING", "CLOSED"].includes(d.stage),
  ).length;
  const pastDD = allDeals.filter((d) =>
    ["IC_REVIEW", "CLOSING", "CLOSED"].includes(d.stage),
  ).length;
  const pastIC = allDeals.filter((d) =>
    ["CLOSING", "CLOSED"].includes(d.stage),
  ).length;

  const screeningToDD = totalDeals > 0 ? Math.min(100, Math.round((pastScreening / totalDeals) * 100)) : 0;
  const ddToIC = pastScreening > 0 ? Math.min(100, Math.round((pastDD / pastScreening) * 100)) : 0;
  const icToClose = pastDD > 0 ? Math.min(100, Math.round((pastIC / pastDD) * 100)) : 0;

  return NextResponse.json({
    // Paginated deal list
    deals: paginated.data,
    nextCursor: paginated.nextCursor,
    hasMore: paginated.hasMore,
    total: paginated.total,
    // Analytics (computed across all deals, not filtered page)
    screeningStats: { docsProcessed, dealsScreened, passedToDD },
    pipelineAnalytics: {
      stageDistribution,
      valueByStage,
      pipelineValue,
      conversionRates: { screeningToDD, ddToIC, icToClose },
      totalActiveDeals: allDeals.filter((d) => !["CLOSED", "DEAD"].includes(d.stage)).length,
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

  const cleaned = { ...data! };
  if (!cleaned.dealLeadId) cleaned.dealLeadId = undefined;
  if (!cleaned.entityId) cleaned.entityId = undefined;

  const deal = await prisma.deal.create({ data: { ...cleaned, firmId: authUser.firmId } });

  // Audit log — fire and forget
  logAudit(authUser.firmId, authUser.id, "CREATE_DEAL", "Deal", deal.id, {
    name: deal.name,
    assetClass: deal.assetClass,
  });

  return NextResponse.json(deal, { status: 201 });
}
