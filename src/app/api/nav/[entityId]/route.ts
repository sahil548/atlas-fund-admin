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
        accountingConnection: {
          include: {
            accountMappings: true,
            trialBalanceSnapshots: { orderBy: { periodDate: "desc" }, take: 1 },
          },
        },
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

    // ---- Determine cost basis source: GL or proxy ----
    const connection = entity.accountingConnection;
    const hasGLData =
      connection != null &&
      connection.syncStatus !== "DISCONNECTED" &&
      connection.chartOfAccountsMapped === true &&
      connection.trialBalanceSnapshots != null &&
      connection.trialBalanceSnapshots.length > 0;

    let investmentsAtCost: number;
    let cashEquivalents: number;
    let otherAssets: number;
    let totalAssets: number;
    let liabilities: number;
    let costBasisNAV: number;

    if (hasGLData) {
      // ---- Layer 1: GL-based Cost Basis ----
      const snapshot = connection!.trialBalanceSnapshots![0];
      const accountData = snapshot.accountData as Array<{
        accountId: string;
        accountName: string;
        accountType: string;
        debit: number;
        credit: number;
        balance: number;
      }>;

      // Build providerAccountId -> atlasAccountType map
      const mappingMap: Record<string, string> = {};
      for (const mapping of (connection!.accountMappings || [])) {
        if (mapping.providerAccountId) {
          mappingMap[mapping.providerAccountId] = mapping.atlasAccountType;
        }
      }

      // Sum trial balance entries by Atlas bucket
      const bucketTotals: Record<string, number> = {};
      for (const entry of (accountData || [])) {
        const bucket = mappingMap[entry.accountId];
        if (bucket) {
          bucketTotals[bucket] = (bucketTotals[bucket] || 0) + entry.balance;
        }
      }

      const glCash = bucketTotals["CASH"] || 0;
      const glInvestments = bucketTotals["INVESTMENTS_AT_COST"] || 0;
      const glOtherAssets = bucketTotals["OTHER_ASSETS"] || 0;
      const glLiabilities = Math.abs(bucketTotals["LIABILITIES"] || 0);

      investmentsAtCost = glInvestments;
      cashEquivalents = glCash;
      otherAssets = glOtherAssets;
      totalAssets = glCash + glInvestments + glOtherAssets;
      liabilities = glLiabilities;
      costBasisNAV = totalAssets - liabilities;
    } else {
      // ---- Layer 1: Proxy-based Cost Basis (existing behavior) ----
      investmentsAtCost = entity.assetAllocations.reduce(
        (sum: number, alloc: any) =>
          sum + (alloc.costBasis ?? alloc.asset.costBasis * (alloc.allocationPercent / 100)),
        0,
      );
      cashEquivalents = Math.round(investmentsAtCost * cashPercent);
      otherAssets = Math.round(investmentsAtCost * otherAssetsPercent);
      totalAssets = investmentsAtCost + cashEquivalents + otherAssets;
      liabilities = Math.round(totalAssets * liabilitiesPercent);
      costBasisNAV = totalAssets - liabilities;
    }

    // ---- Layer 2: Fair Value Overlay (always uses Atlas valuations) ----
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
      navSource: hasGLData ? "GL" : "PROXY",
      glDataAsOf: hasGLData ? connection!.trialBalanceSnapshots![0].periodDate : null,
      lastSyncAt: connection?.lastSyncAt ?? null,
      syncStatus: connection?.syncStatus ?? null,
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
