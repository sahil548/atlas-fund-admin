import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // Direct firmId filter for models that have firmId column
    const directFilter = firmId ? { firmId } : {};
    // Relation-based filters for models linked through Entity
    const entityRelFilter = firmId ? { entity: { firmId } } : {};
    const assetRelFilter = firmId
      ? { entityAllocations: { some: { entity: { firmId } } } }
      : {};

    const [
      entities,
      assets,
      deals,
      capitalCalls,
      distributions,
      meetings,
      investors,
      dealsByStage,
      commitments,
      totalDistributed,
      recentActivity,
      assetsWithMetrics,
    ] = await Promise.all([
      prisma.entity.findMany({
        where: directFilter,
        include: { accountingConnection: true },
      }),
      prisma.asset.findMany({
        where: assetRelFilter,
        include: { entityAllocations: { include: { entity: true } } },
      }),
      prisma.deal.findMany({ where: directFilter }),
      prisma.capitalCall.findMany({
        where: entityRelFilter,
        orderBy: { callDate: "desc" },
      }),
      prisma.distributionEvent.findMany({
        where: entityRelFilter,
        orderBy: { distributionDate: "desc" },
        take: 5,
      }),
      prisma.meeting.findMany({
        where: firmId
          ? {
              OR: [
                { deal: { firmId } },
                { entity: { firmId } },
                { dealId: null, entityId: null },
              ],
            }
          : {},
        orderBy: { meetingDate: "desc" },
        take: 4,
      }),
      prisma.investor.findMany({
        where: firmId
          ? { commitments: { some: { entity: { firmId } } } }
          : {},
      }),
      // Deals grouped by stage
      prisma.deal.groupBy({
        by: ["stage"],
        where: directFilter,
        _count: true,
      }),
      // LP commitment aggregation
      prisma.commitment.aggregate({
        where: entityRelFilter,
        _sum: { amount: true, calledAmount: true },
      }),
      // Total distributions to LPs
      prisma.distributionEvent.aggregate({
        where: entityRelFilter,
        _sum: { netToLPs: true },
      }),
      // Recent deal activity
      prisma.dealActivity
        .findMany({
          where: firmId ? { deal: { firmId } } : {},
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { deal: { select: { id: true, name: true } } },
        })
        .catch(() => []),
      // Active assets with performance metrics
      prisma.asset.findMany({
        where: { ...assetRelFilter, status: "ACTIVE", irr: { not: null } },
        select: { irr: true, moic: true, fairValue: true, costBasis: true },
      }),
    ]);

    const activeAssets = assets.filter((a) => a.status === "ACTIVE");
    const totalFV = activeAssets.reduce((s, a) => s + a.fairValue, 0);
    const totalCost = activeAssets.reduce((s, a) => s + a.costBasis, 0);

    // LP Summary
    const committed = commitments._sum.amount || 0;
    const called = commitments._sum.calledAmount || 0;
    const distributed = totalDistributed._sum.netToLPs || 0;
    const dpi = called > 0 ? distributed / called : 0;

    // Performance Metrics — weighted IRR and portfolio TVPI
    const totalMetricsFV = assetsWithMetrics.reduce(
      (s, a) => s + (a.fairValue || 0),
      0,
    );
    const weightedIRR =
      totalMetricsFV > 0
        ? assetsWithMetrics.reduce(
            (s, a) => s + (a.irr || 0) * (a.fairValue || 0),
            0,
          ) / totalMetricsFV
        : 0;
    const totalMetricsCost = assetsWithMetrics.reduce(
      (s, a) => s + (a.costBasis || 0),
      0,
    );
    const tvpi = totalMetricsCost > 0 ? totalMetricsFV / totalMetricsCost : 0;

    return NextResponse.json({
      totalAUM: totalFV,
      totalCost,
      totalFV,
      unrealizedGain: totalFV - totalCost,
      pipelineCount: deals.length,
      activeAssetCount: activeAssets.length,
      entities,
      topAssets: activeAssets
        .sort((a, b) => b.fairValue - a.fairValue)
        .slice(0, 5),
      capitalCalls: capitalCalls.filter((c) => c.status !== "FUNDED"),
      recentMeetings: meetings,
      recentDistributions: distributions,
      investors,
      dealsByStage,
      lpSummary: { committed, called, distributed, dpi },
      recentActivity,
      performanceMetrics: { weightedIRR, tvpi },
    });
  } catch (err) {
    console.error("[dashboard/stats] Error:", err);
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 },
    );
  }
}
