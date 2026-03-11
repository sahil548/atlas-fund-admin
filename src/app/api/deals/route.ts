import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { CreateDealSchema } from "@/lib/schemas";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";
import { parsePaginationParams, buildPrismaArgs, buildPaginatedResult } from "@/lib/pagination";
import { logAudit } from "@/lib/audit";

/** Typed metadata shape for DealActivity stage transitions. */
interface StageActivityMetadata {
  toStage?: string;
  newStage?: string;
  fromStage?: string;
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser();
  const firmId = authUser?.firmId || req.nextUrl.searchParams.get("firmId");

  // GP_TEAM permission check (only when authenticated)
  if (authUser && authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "deals", "read_only")) return forbidden();
  }

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
        activities: {
          where: { activityType: { contains: "STAGE" } },
          select: { activityType: true, createdAt: true, metadata: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.deal.count({ where }),
  ]);

  // Compute daysInStage for each deal
  const now = new Date();
  const dealsWithDaysInStage = rawDeals.map((deal) => {
    const stageEntry = deal.activities.find(
      (a) => a.activityType.includes("STAGE") && ((a.metadata as StageActivityMetadata)?.toStage === deal.stage || (a.metadata as StageActivityMetadata)?.newStage === deal.stage),
    );
    const enteredAt = stageEntry ? new Date(stageEntry.createdAt) : new Date(deal.createdAt);
    const daysInStage = Math.max(0, Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24)));
    // Strip raw activities before returning to client
    const { activities, ...rest } = deal;
    void activities; // suppress unused var warning
    return { ...rest, daysInStage };
  });

  const paginated = buildPaginatedResult(dealsWithDaysInStage, params.limit, total);

  // Compute analytics from the full set (not paginated)
  const allDeals = await prisma.deal.findMany({
    where: firmId ? { firmId } : {},
    select: {
      stage: true,
      targetSize: true,
      killReason: true,
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
    // Handle range formats like "$30-40M" by taking midpoint
    const rangeMatch = s.match(/\$?([\d.]+)\s*[-–]\s*\$?([\d.]+)\s*([BMKbmk])?/);
    if (rangeMatch) {
      const lo = parseFloat(rangeMatch[1]);
      const hi = parseFloat(rangeMatch[2]);
      const mid = (lo + hi) / 2;
      const suffix = (rangeMatch[3] || "").toUpperCase();
      if (suffix === "B") return mid * 1_000_000_000;
      if (suffix === "M") return mid * 1_000_000;
      if (suffix === "K") return mid * 1_000;
      return mid;
    }
    // Single value like "$10M" or "$15M LP"
    const singleMatch = s.match(/([\d.]+)\s*([BMKbmk])?/);
    if (!singleMatch) return 0;
    const num = parseFloat(singleMatch[1]);
    if (isNaN(num)) return 0;
    const suffix = (singleMatch[2] || "").toUpperCase();
    if (suffix === "B") return num * 1_000_000_000;
    if (suffix === "M") return num * 1_000_000;
    if (suffix === "K") return num * 1_000;
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

  // Kill reason breakdown for dead deals
  const deadDeals = allDeals.filter((d) => d.stage === "DEAD");
  const killReasonMap: Record<string, number> = {};
  for (const deal of deadDeals) {
    const reason = deal.killReason || "Unknown";
    killReasonMap[reason] = (killReasonMap[reason] || 0) + 1;
  }
  const killReasonBreakdown = Object.entries(killReasonMap)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

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
      killReasonBreakdown,
    },
  });
}

export async function POST(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  if (authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "deals", "full")) return forbidden();
  }

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
