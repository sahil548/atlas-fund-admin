import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { computeMetrics } from "@/lib/computations/metrics";
import { xirr } from "@/lib/computations/irr";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const entity = await prisma.entity.findUnique({
      where: { id },
      include: {
        commitments: { include: { investor: { select: { id: true, name: true } } } },
        capitalCalls: {
          include: {
            lineItems: true,
          },
        },
        distributions: {
          include: {
            lineItems: true,
          },
        },
        assetAllocations: {
          include: {
            asset: {
              include: {
                valuations: { orderBy: { valuationDate: "desc" }, take: 1 },
              },
            },
          },
        },
        feeCalculations: { orderBy: { periodDate: "desc" }, take: 1 },
        navComputations: { orderBy: { periodDate: "desc" }, take: 1 },
      },
    });

    if (!entity) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Firm guard
    if (firmId && entity.firmId !== firmId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // --- Compute totalCalled: sum funded CapitalCallLineItem amounts ---
    let totalCalled = 0;
    const capitalCallCashFlows: { date: Date; amount: number }[] = [];

    for (const call of entity.capitalCalls) {
      for (const li of call.lineItems) {
        if (li.status === "Funded" && li.paidDate) {
          totalCalled += li.amount;
          capitalCallCashFlows.push({ date: new Date(li.paidDate), amount: -li.amount });
        }
      }
    }

    // --- Compute totalDistributed: sum PAID DistributionLineItem netAmounts ---
    let totalDistributed = 0;
    const distributionCashFlows: { date: Date; amount: number }[] = [];

    for (const dist of entity.distributions) {
      if (dist.status === "PAID") {
        for (const li of dist.lineItems) {
          totalDistributed += li.netAmount;
          distributionCashFlows.push({
            date: new Date(dist.distributionDate),
            amount: li.netAmount,
          });
        }
      }
    }

    // --- Compute NAV inline (same logic as /api/nav/[entityId]) ---
    const investmentsAtCost = entity.assetAllocations.reduce(
      (sum: number, alloc: any) =>
        sum + (alloc.costBasis ?? alloc.asset.costBasis * (alloc.allocationPercent / 100)),
      0
    );

    const proxyConfig = entity.navProxyConfig as {
      cashPercent?: number;
      otherAssetsPercent?: number;
      liabilitiesPercent?: number;
    } | null;
    const cashPercent = proxyConfig?.cashPercent ?? 0.05;
    const otherAssetsPercent = proxyConfig?.otherAssetsPercent ?? 0.005;
    const liabilitiesPercent = proxyConfig?.liabilitiesPercent ?? 0.02;

    const cashEquivalents = Math.round(investmentsAtCost * cashPercent);
    const otherAssets = Math.round(investmentsAtCost * otherAssetsPercent);
    const totalAssets = investmentsAtCost + cashEquivalents + otherAssets;
    const liabilities = Math.round(totalAssets * liabilitiesPercent);
    const costBasisNAV = totalAssets - liabilities;

    const totalUnrealized = entity.assetAllocations.reduce((sum: number, alloc: any) => {
      const allocCost = alloc.costBasis ?? alloc.asset.costBasis * (alloc.allocationPercent / 100);
      const allocFair = alloc.asset.fairValue * (alloc.allocationPercent / 100);
      return sum + (allocFair - allocCost);
    }, 0);

    const accruedCarry =
      entity.feeCalculations?.[0]?.carriedInterest ?? Math.round(totalUnrealized * 0.06);
    const economicNAV = costBasisNAV + totalUnrealized - accruedCarry;

    // --- Compute cost basis and fair value totals ---
    let totalCostBasis = 0;
    let totalFairValue = 0;

    for (const alloc of entity.assetAllocations) {
      const allocCost =
        (alloc as any).costBasis ??
        alloc.asset.costBasis * (alloc.allocationPercent / 100);
      const allocFair = alloc.asset.fairValue * (alloc.allocationPercent / 100);
      totalCostBasis += allocCost;
      totalFairValue += allocFair;
    }

    // --- Compute metrics ---
    const metrics = computeMetrics(
      totalCalled,
      totalDistributed,
      economicNAV,
      totalCostBasis,
      totalFairValue
    );

    // --- Compute entity-level MOIC (weighted average) ---
    const entityMOIC =
      totalCostBasis > 0 ? totalFairValue / totalCostBasis : null;

    // --- Compute IRR using xirr ---
    const cashFlows = [
      ...capitalCallCashFlows,
      ...distributionCashFlows,
    ];
    if (economicNAV > 0) {
      cashFlows.push({ date: new Date(), amount: economicNAV });
    }
    const irr = xirr(cashFlows);

    return NextResponse.json({
      entityId: entity.id,
      metrics: {
        tvpi: metrics.tvpi,
        dpi: metrics.dpi,
        rvpi: metrics.rvpi,
        moic: entityMOIC,
        irr,
      },
      inputs: {
        totalCalled,
        totalDistributed,
        currentNAV: economicNAV,
        costBasis: totalCostBasis,
        fairValue: totalFairValue,
      },
    });
  } catch (err) {
    console.error("[entities/metrics]", err);
    return NextResponse.json({ error: "Failed to compute metrics" }, { status: 500 });
  }
}
