import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const [entities, assets, deals, capitalCalls, distributions, meetings, investors] = await Promise.all([
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
  ]);

  const activeAssets = assets.filter((a) => a.status === "ACTIVE");
  const totalFV = activeAssets.reduce((s, a) => s + a.fairValue, 0);
  const totalCost = activeAssets.reduce((s, a) => s + a.costBasis, 0);
  const totalEcoNav = entities
    .filter((e) => e.status === "ACTIVE")
    .reduce((s, e) => s + (e.totalCommitments || 0), 0);

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
  });
}
