import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { computeMetrics } from "@/lib/computations/metrics";
import { xirr } from "@/lib/computations/irr";
import { logger } from "@/lib/logger";

/** Local type for asset allocation entries returned by entity include. */
interface AssetAllocationEntry {
  costBasis: number | null;
  allocationPercent: number;
  asset: {
    costBasis: number;
    fairValue: number;
    valuations?: unknown[];
  };
}

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
        include: {
          accountingConnection: true,
          assetAllocations: {
            include: {
              asset: {
                include: { valuations: { orderBy: { valuationDate: "desc" }, take: 1 } },
              },
            },
          },
          capitalCalls: { include: { lineItems: true } },
          distributions: { include: { lineItems: true } },
          feeCalculations: { orderBy: { periodDate: "desc" }, take: 1 },
        },
      }),
      prisma.asset.findMany({
        where: assetRelFilter,
        include: { entityAllocations: { include: { entity: true } } },
      }),
      prisma.deal.findMany({
        where: {
          ...directFilter,
          stage: { notIn: ["CLOSED", "DEAD"] },
        },
      }),
      prisma.capitalCall.findMany({
        where: entityRelFilter,
        include: { entity: { select: { name: true } } },
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

    // ---- Compute real per-entity metrics ----
    const entityMetrics: Array<{
      entityId: string;
      entityName: string;
      tvpi: number | null;
      dpi: number | null;
      rvpi: number | null;
      irr: number | null;
      nav: number;
    }> = [];

    let aggregatePaidIn = 0;
    let aggregateDistributed = 0;
    let aggregateNAV = 0;

    for (const entity of entities) {
      if (entity.status !== "ACTIVE") continue;

      // Compute totalCalled from funded line items
      let entityCalled = 0;
      const cashFlows: { date: Date; amount: number }[] = [];

      for (const call of entity.capitalCalls) {
        for (const li of call.lineItems) {
          if (li.status === "Funded" && li.paidDate) {
            entityCalled += li.amount;
            cashFlows.push({ date: new Date(li.paidDate), amount: -li.amount });
          }
        }
      }

      // Compute totalDistributed from PAID distribution line items
      let entityDistributed = 0;
      for (const dist of entity.distributions) {
        if (dist.status === "PAID") {
          for (const li of dist.lineItems) {
            entityDistributed += li.netAmount;
            cashFlows.push({
              date: new Date(dist.distributionDate),
              amount: li.netAmount,
            });
          }
        }
      }

      // Compute NAV inline
      const proxyConfig = entity.navProxyConfig as {
        cashPercent?: number;
        otherAssetsPercent?: number;
        liabilitiesPercent?: number;
      } | null;
      const cashPct = proxyConfig?.cashPercent ?? 0.05;
      const otherPct = proxyConfig?.otherAssetsPercent ?? 0.005;
      const liabPct = proxyConfig?.liabilitiesPercent ?? 0.02;

      const investmentsAtCost = entity.assetAllocations.reduce(
        (sum: number, alloc: AssetAllocationEntry) =>
          sum + (alloc.costBasis ?? alloc.asset.costBasis * (alloc.allocationPercent / 100)),
        0
      );
      const cashEquiv = Math.round(investmentsAtCost * cashPct);
      const otherAssets = Math.round(investmentsAtCost * otherPct);
      const totalA = investmentsAtCost + cashEquiv + otherAssets;
      const liabs = Math.round(totalA * liabPct);
      const costBasisNAV = totalA - liabs;

      const totalUnrealized = entity.assetAllocations.reduce((sum: number, alloc: AssetAllocationEntry) => {
        const allocCost = alloc.costBasis ?? alloc.asset.costBasis * (alloc.allocationPercent / 100);
        const allocFair = alloc.asset.fairValue * (alloc.allocationPercent / 100);
        return sum + (allocFair - allocCost);
      }, 0);
      const accruedCarry =
        entity.feeCalculations?.[0]?.carriedInterest ?? Math.round(totalUnrealized * 0.06);
      const entityNAV = costBasisNAV + totalUnrealized - accruedCarry;

      // Compute metrics
      const m = computeMetrics(entityCalled, entityDistributed, entityNAV);

      // Compute IRR
      const entityCashFlows = [...cashFlows];
      if (entityNAV > 0) {
        entityCashFlows.push({ date: new Date(), amount: entityNAV });
      }
      const entityIRR = xirr(entityCashFlows);

      entityMetrics.push({
        entityId: entity.id,
        entityName: entity.name,
        tvpi: m.tvpi,
        dpi: m.dpi,
        rvpi: m.rvpi,
        irr: entityIRR,
        nav: entityNAV,
      });

      aggregatePaidIn += entityCalled;
      aggregateDistributed += entityDistributed;
      aggregateNAV += entityNAV;
    }

    // Cross-entity rollup metrics
    const aggregateTVPI =
      aggregatePaidIn > 0
        ? (aggregateDistributed + aggregateNAV) / aggregatePaidIn
        : 0;
    const aggregateDPI = aggregatePaidIn > 0 ? aggregateDistributed / aggregatePaidIn : 0;
    const aggregateRVPI = aggregatePaidIn > 0 ? aggregateNAV / aggregatePaidIn : 0;

    // Weighted IRR (weight by entity NAV)
    const totalNAVForWeighting = entityMetrics
      .filter((em) => em.irr !== null && em.nav > 0)
      .reduce((s, em) => s + em.nav, 0);
    const weightedIRR =
      totalNAVForWeighting > 0
        ? entityMetrics
            .filter((em) => em.irr !== null && em.nav > 0)
            .reduce((s, em) => s + (em.irr ?? 0) * em.nav, 0) / totalNAVForWeighting
        : 0;

    // Fallback to asset-based metrics if no real transaction data
    const totalMetricsFV = assetsWithMetrics.reduce((s, a) => s + (a.fairValue || 0), 0);
    const fallbackWeightedIRR =
      totalMetricsFV > 0
        ? assetsWithMetrics.reduce(
            (s, a) => s + (a.irr || 0) * (a.fairValue || 0),
            0
          ) / totalMetricsFV
        : 0;
    const totalMetricsCost = assetsWithMetrics.reduce((s, a) => s + (a.costBasis || 0), 0);
    const fallbackTVPI = totalMetricsCost > 0 ? totalMetricsFV / totalMetricsCost : 0;

    // Use real computed metrics if we have paidIn data, otherwise fall back to asset-level
    const finalWeightedIRR = aggregatePaidIn > 0 ? weightedIRR : fallbackWeightedIRR;
    const finalTVPI = aggregatePaidIn > 0 ? aggregateTVPI : fallbackTVPI;

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
      // Real computed performance metrics
      performanceMetrics: {
        weightedIRR: finalWeightedIRR,
        tvpi: finalTVPI,
        dpi: aggregateDPI,
        rvpi: aggregateRVPI,
      },
      totalNAV: aggregateNAV,
      entityMetrics,
    });
  } catch (err) {
    logger.error("[dashboard/stats] Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 },
    );
  }
}
