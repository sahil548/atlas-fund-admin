import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
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
      include: { accountingConnection: true },
    }),
    prisma.asset.findMany({
      include: { entityAllocations: { include: { entity: true } } },
    }),
    prisma.deal.findMany(),
    prisma.capitalCall.findMany({ orderBy: { callDate: "desc" } }),
    prisma.distributionEvent.findMany({ orderBy: { distributionDate: "desc" }, take: 5 }),
    prisma.meeting.findMany({ orderBy: { meetingDate: "desc" }, take: 4 }),
    prisma.investor.findMany(),
    // Deals grouped by stage
    prisma.deal.groupBy({
      by: ["stage"],
      _count: true,
    }),
    // LP commitment aggregation
    prisma.commitment.aggregate({
      _sum: { amount: true, calledAmount: true },
    }),
    // Total distributions to LPs
    prisma.distributionEvent.aggregate({
      _sum: { netToLPs: true },
    }),
    // Recent deal activity
    prisma.dealActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { deal: { select: { id: true, name: true } } },
    }),
    // Active assets with performance metrics
    prisma.asset.findMany({
      where: { status: "ACTIVE", irr: { not: null } },
      select: { irr: true, moic: true, fairValue: true, costBasis: true },
    }),
  ]);

  const activeAssets = assets.filter((a) => a.status === "ACTIVE");
  const totalFV = activeAssets.reduce((s, a) => s + a.fairValue, 0);
  const totalCost = activeAssets.reduce((s, a) => s + a.costBasis, 0);
  const totalEcoNav = entities
    .filter((e) => e.status === "ACTIVE")
    .reduce((s, e) => s + (e.totalCommitments || 0), 0);

  // LP Summary
  const committed = commitments._sum.amount || 0;
  const called = commitments._sum.calledAmount || 0;
  const distributed = totalDistributed._sum.netToLPs || 0;
  const dpi = called > 0 ? distributed / called : 0;

  // Performance Metrics — weighted IRR and portfolio TVPI
  const totalMetricsFV = assetsWithMetrics.reduce((s, a) => s + (a.fairValue || 0), 0);
  const weightedIRR =
    totalMetricsFV > 0
      ? assetsWithMetrics.reduce((s, a) => s + (a.irr || 0) * (a.fairValue || 0), 0) / totalMetricsFV
      : 0;
  const totalMetricsCost = assetsWithMetrics.reduce((s, a) => s + (a.costBasis || 0), 0);
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
}
