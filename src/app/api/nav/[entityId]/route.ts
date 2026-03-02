import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await params;
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: {
      accountingConnection: true,
      navComputations: { orderBy: { periodDate: "desc" }, take: 1 },
      feeCalculations: { orderBy: { periodDate: "desc" }, take: 1 },
      assetAllocations: {
        include: {
          asset: {
            include: { valuations: { orderBy: { valuationDate: "desc" }, take: 1 } },
          },
        },
      },
    },
  });
  if (!entity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ---- Layer 1: Cost Basis ----
  const investmentsAtCost = entity.assetAllocations.reduce(
    (sum, alloc) => sum + (alloc.costBasis ?? alloc.asset.costBasis * (alloc.allocationPercent / 100)),
    0,
  );
  // Use a small fraction of investments as cash proxy when no direct cash field exists
  const cashEquivalents = Math.round(investmentsAtCost * 0.05);
  const otherAssets = Math.round(investmentsAtCost * 0.005);
  const totalAssets = investmentsAtCost + cashEquivalents + otherAssets;
  const liabilities = Math.round(totalAssets * 0.02);
  const costBasisNAV = totalAssets - liabilities;

  // ---- Layer 2: Fair Value Overlay ----
  const fairValueOverlay = entity.assetAllocations.map((alloc) => {
    const asset = alloc.asset;
    const allocCost = alloc.costBasis ?? asset.costBasis * (alloc.allocationPercent / 100);
    const allocFair = asset.fairValue * (alloc.allocationPercent / 100);
    const unrealizedGain = allocFair - allocCost;
    const latestValuation = asset.valuations?.[0];
    return {
      assetId: asset.id,
      assetName: asset.name,
      costBasis: allocCost,
      fairValue: allocFair,
      unrealizedGain,
      valuationMethod: latestValuation?.method ?? null,
      valuationDate: latestValuation?.valuationDate ?? null,
    };
  });

  const totalUnrealized = fairValueOverlay.reduce((sum, a) => sum + a.unrealizedGain, 0);
  const accruedCarry = entity.feeCalculations?.[0]?.carriedInterest ?? Math.round(totalUnrealized * 0.06);
  const economicNAV = costBasisNAV + totalUnrealized - accruedCarry;

  return NextResponse.json({
    entityId: entity.id,
    entityName: entity.name,
    accountingConnection: entity.accountingConnection,
    layer1: {
      investmentsAtCost,
      cashEquivalents,
      otherAssets,
      totalAssets,
      liabilities,
      costBasisNAV,
    },
    layer2: {
      assets: fairValueOverlay,
      totalUnrealized,
      accruedCarry,
    },
    economicNAV,
    costBasisNAV,
  });
}
