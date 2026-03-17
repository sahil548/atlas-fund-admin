import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { computeMetrics } from "@/lib/computations/metrics";
import { xirr } from "@/lib/computations/irr";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;
    const directFilter = firmId ? { firmId } : {};

    const entities = await prisma.entity.findMany({
      where: { ...directFilter, status: "ACTIVE" },
      include: {
        assetAllocations: {
          include: {
            asset: {
              select: {
                id: true,
                name: true,
                fairValue: true,
                costBasis: true,
                moic: true,
                irr: true,
                status: true,
              },
            },
          },
        },
        commitments: {
          select: { amount: true, calledAmount: true },
        },
        capitalCalls: {
          include: {
            lineItems: {
              select: { amount: true, status: true, paidDate: true },
            },
          },
        },
        distributions: {
          where: { status: "PAID" },
          include: {
            lineItems: {
              select: { netAmount: true },
            },
          },
        },
        feeCalculations: { orderBy: { periodDate: "desc" }, take: 1 },
      },
    });

    const result = entities.map((entity) => {
      // Per-asset breakdown
      const perAssetBreakdown = entity.assetAllocations
        .filter((alloc) => alloc.asset.status === "ACTIVE")
        .map((alloc) => {
          const allocPct = alloc.allocationPercent / 100;
          const costBasis = alloc.costBasis ?? alloc.asset.costBasis * allocPct;
          const fairValue = alloc.asset.fairValue * allocPct;
          const unrealizedGain = fairValue - costBasis;
          const moic = costBasis > 0 ? fairValue / costBasis : null;
          return {
            assetId: alloc.asset.id,
            assetName: alloc.asset.name,
            allocationPercent: alloc.allocationPercent,
            costBasis,
            fairValue,
            unrealizedGain,
            moic,
            irr: alloc.asset.irr,
          };
        });

      // NAV components
      const totalCostBasis = perAssetBreakdown.reduce((s, a) => s + a.costBasis, 0);
      const totalFairValue = perAssetBreakdown.reduce((s, a) => s + a.fairValue, 0);
      const unrealizedGain = totalFairValue - totalCostBasis;

      // NAV proxy config
      const proxyConfig = entity.navProxyConfig as {
        cashPercent?: number;
        otherAssetsPercent?: number;
        liabilitiesPercent?: number;
      } | null;
      const cashPct = proxyConfig?.cashPercent ?? 0.05;
      const otherPct = proxyConfig?.otherAssetsPercent ?? 0.005;
      const liabPct = proxyConfig?.liabilitiesPercent ?? 0.02;

      const cashEquiv = Math.round(totalCostBasis * cashPct);
      const otherAssets = Math.round(totalCostBasis * otherPct);
      const totalA = totalCostBasis + cashEquiv + otherAssets;
      const liabs = Math.round(totalA * liabPct);
      const costBasisNAV = totalA - liabs;
      const accruedCarry =
        (entity.feeCalculations?.[0]?.carriedInterest as number | null) ??
        Math.round(unrealizedGain * 0.06);
      const nav = costBasisNAV + unrealizedGain - accruedCarry;

      // Capital deployment from funded line items
      const cashFlows: { date: Date; amount: number }[] = [];
      let capitalDeployed = 0;
      let totalCalled = 0;

      for (const call of entity.capitalCalls) {
        for (const li of call.lineItems) {
          totalCalled += li.amount;
          if (li.status === "Funded" && li.paidDate) {
            capitalDeployed += li.amount;
            cashFlows.push({ date: new Date(li.paidDate), amount: -li.amount });
          }
        }
      }

      // Distributions
      let totalDistributed = 0;
      for (const dist of entity.distributions) {
        for (const li of dist.lineItems) {
          totalDistributed += li.netAmount;
          cashFlows.push({
            date: new Date(dist.distributionDate),
            amount: li.netAmount,
          });
        }
      }

      const totalCommitted = entity.totalCommitments ?? 0;
      const dryPowder = Math.max(0, totalCalled - capitalDeployed);
      const deploymentPct =
        totalCommitted > 0
          ? Math.min(100, (capitalDeployed / totalCommitted) * 100)
          : 0;

      // Fund-level metrics
      const metrics = computeMetrics(capitalDeployed, totalDistributed, nav);

      // IRR from cash flows
      const irrCashFlows = [...cashFlows];
      if (nav > 0) {
        irrCashFlows.push({ date: new Date(), amount: nav });
      }
      const entityIRR = irrCashFlows.length >= 2 ? xirr(irrCashFlows) : null;

      // Top 3 assets by fair value
      const topAssets = [...perAssetBreakdown]
        .sort((a, b) => b.fairValue - a.fairValue)
        .slice(0, 3)
        .map((a) => ({
          assetId: a.assetId,
          name: a.assetName,
          fairValue: a.fairValue,
          moic: a.moic,
        }));

      return {
        entityId: entity.id,
        name: entity.name,
        entityType: entity.entityType,
        status: entity.status,
        nav: {
          costBasis: totalCostBasis,
          fairValue: totalFairValue,
          unrealizedGain,
          total: nav,
        },
        irr: entityIRR,
        tvpi: metrics.tvpi,
        dpi: metrics.dpi,
        rvpi: metrics.rvpi,
        capitalDeployed,
        totalCommitted,
        deploymentPct,
        dryPowder,
        assetCount: perAssetBreakdown.length,
        topAssets,
        perAssetBreakdown,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    logger.error("[dashboard/entity-cards] Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to load entity cards" },
      { status: 500 }
    );
  }
}
