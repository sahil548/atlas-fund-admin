import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { computeMetrics } from "@/lib/computations/metrics";
import { xirr } from "@/lib/computations/irr";
import { logger } from "@/lib/logger";

/** Local type for asset allocation entries with full asset include. */
interface AssetAllocationWithIncomes {
  costBasis: number | null;
  allocationPercent: number;
  asset: {
    costBasis: number;
    fairValue: number;
    entryDate: Date | null;
    incomeEvents: Array<{ date: Date; amount: number }>;
    valuations: unknown[];
  };
}

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
                incomeEvents: true, // NEW: needed for gross IRR
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

    for (const alloc of entity.assetAllocations as AssetAllocationWithIncomes[]) {
      const allocCost =
        alloc.costBasis ??
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

    // --- Compute IRR using xirr (net IRR from fund-level cash flows) ---
    const cashFlows = [
      ...capitalCallCashFlows,
      ...distributionCashFlows,
    ];
    if (economicNAV > 0) {
      cashFlows.push({ date: new Date(), amount: economicNAV });
    }
    const irr = xirr(cashFlows);

    // --- Compute Gross IRR from asset-level cash flows ---
    const assetCashFlows: { date: Date; amount: number }[] = [];

    for (const alloc of entity.assetAllocations as AssetAllocationWithIncomes[]) {
      const asset = alloc.asset;
      const allocPct = alloc.allocationPercent / 100;

      // Outflow: cost basis at entry
      if (asset.entryDate) {
        assetCashFlows.push({
          date: new Date(asset.entryDate),
          amount: -(asset.costBasis * allocPct),
        });
      }

      // Inflows: income events allocated to this entity
      for (const inc of asset.incomeEvents || []) {
        assetCashFlows.push({
          date: new Date(inc.date),
          amount: inc.amount * allocPct,
        });
      }

      // Terminal value: current fair value
      assetCashFlows.push({
        date: new Date(),
        amount: asset.fairValue * allocPct,
      });
    }

    const grossIrr = xirr(assetCashFlows);

    // --- Period-based income breakdown ---
    const incomeEvents = await prisma.incomeEvent.findMany({
      where: { entityId: id },
      include: { asset: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    });

    const periodBreakdownMap: Record<string, {
      period: string;
      total: number;
      byAsset: Record<string, { assetName: string; amount: number }>;
    }> = {};

    for (const event of incomeEvents) {
      const period = event.date.toISOString().slice(0, 7); // "2026-03"
      if (!periodBreakdownMap[period]) {
        periodBreakdownMap[period] = { period, total: 0, byAsset: {} };
      }
      periodBreakdownMap[period].total += event.amount;
      const assetKey = event.assetId || "unallocated";
      const assetName = (event as { asset?: { name?: string } }).asset?.name || "Unallocated";
      if (!periodBreakdownMap[period].byAsset[assetKey]) {
        periodBreakdownMap[period].byAsset[assetKey] = { assetName, amount: 0 };
      }
      periodBreakdownMap[period].byAsset[assetKey].amount += event.amount;
    }

    const periodBreakdown = Object.values(periodBreakdownMap).sort(
      (a, b) => b.period.localeCompare(a.period)
    );

    return NextResponse.json({
      entityId: entity.id,
      // Backward-compatible fields
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
      // NEW: Dual metric view
      realized: {
        tvpi: metrics.tvpi,
        dpi: metrics.dpi,
        rvpi: metrics.rvpi,
        netIrr: irr,
      },
      unrealized: {
        grossIrr,
        portfolioMoic: entityMOIC,
      },
      // NEW: Financial summary card data (9 key metrics)
      summary: {
        totalCalled,
        totalDistributed,
        unrealizedValue: economicNAV,
        grossIrr,
        netIrr: irr,
        tvpi: metrics.tvpi,
        dpi: metrics.dpi,
        rvpi: metrics.rvpi,
      },
      // NEW: Period-based income breakdown
      periodBreakdown,
    });
  } catch (err) {
    logger.error("[entities/metrics]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to compute metrics" }, { status: 500 });
  }
}
