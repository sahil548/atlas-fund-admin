import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  try {
    const { entityId } = await params;
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

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

    if (firmId && entity.firmId !== firmId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ---- Read configurable proxy values from entity.navProxyConfig ----
    const proxyConfig = entity.navProxyConfig as {
      cashPercent?: number;
      otherAssetsPercent?: number;
      liabilitiesPercent?: number;
    } | null;
    const cashPercent = proxyConfig?.cashPercent ?? 0.05;
    const otherAssetsPercent = proxyConfig?.otherAssetsPercent ?? 0.005;
    const liabilitiesPercent = proxyConfig?.liabilitiesPercent ?? 0.02;

    // ---- Layer 1: Cost Basis ----
    const investmentsAtCost = entity.assetAllocations.reduce(
      (sum: number, alloc: any) =>
        sum + (alloc.costBasis ?? alloc.asset.costBasis * (alloc.allocationPercent / 100)),
      0,
    );
    const cashEquivalents = Math.round(investmentsAtCost * cashPercent);
    const otherAssets = Math.round(investmentsAtCost * otherAssetsPercent);
    const totalAssets = investmentsAtCost + cashEquivalents + otherAssets;
    const liabilities = Math.round(totalAssets * liabilitiesPercent);
    const costBasisNAV = totalAssets - liabilities;

    // ---- Layer 2: Fair Value Overlay ----
    const fairValueOverlay = entity.assetAllocations.map((alloc: any) => {
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
        allocationPercent: alloc.allocationPercent,
        contributionToNAV: allocFair,
        unrealizedGain,
        valuationMethod: latestValuation?.method ?? null,
        valuationDate: latestValuation?.valuationDate ?? null,
      };
    });

    const totalUnrealized = fairValueOverlay.reduce((sum: number, a: any) => sum + a.unrealizedGain, 0);
    const accruedCarry = entity.feeCalculations?.[0]?.carriedInterest ?? Math.round(totalUnrealized * 0.06);
    const economicNAV = costBasisNAV + totalUnrealized - accruedCarry;

    // ---- Auto-save NAV snapshot ----
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const fullResponse = {
      entityId: entity.id,
      entityName: entity.name,
      accountingConnection: entity.accountingConnection,
      navProxyConfig: {
        cashPercent,
        otherAssetsPercent,
        liabilitiesPercent,
      },
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
    };

    // Upsert NAVComputation snapshot (fire and forget errors — don't fail the response)
    prisma.nAVComputation
      .upsert({
        where: { entityId_periodDate: { entityId: entity.id, periodDate: today } },
        create: {
          entityId: entity.id,
          periodDate: today,
          costBasisNAV,
          economicNAV,
          unrealizedGain: totalUnrealized,
          accruedCarry,
          details: fullResponse as any,
        },
        update: {
          costBasisNAV,
          economicNAV,
          unrealizedGain: totalUnrealized,
          accruedCarry,
          details: fullResponse as any,
        },
      })
      .catch((e: any) => console.error("[nav] Snapshot upsert failed:", e));

    return NextResponse.json(fullResponse);
  } catch (err) {
    console.error("[nav/entityId]", err);
    return NextResponse.json({ error: "Failed to compute NAV" }, { status: 500 });
  }
}
