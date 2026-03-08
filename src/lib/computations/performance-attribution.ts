/**
 * Performance attribution engine.
 * Computes per-asset contribution to fund returns, with projected vs actual comparison.
 * Projections sourced from AI-extracted deal metadata or GP manual overrides.
 * Actuals computed from real capital calls, distributions, income events, and valuations.
 */

import { prisma } from "@/lib/prisma";
import { xirr } from "@/lib/computations/irr";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface AssetActualMetrics {
  irr: number | null;           // XIRR from cash flows (calls as negatives, distributions + NAV as positives)
  moic: number | null;          // fairValue / costBasis
  totalReturn: number | null;   // (fairValue + totalDistributions - costBasis) / costBasis
  totalIncome: number;          // Sum of income events
  unrealizedGain: number;       // fairValue - costBasis
  realizedGain: number;         // totalDistributions (simplified: all distributions treated as realized gain)
  totalDistributions: number;   // Total distributions received
  totalCalled: number;          // Total capital called into this asset (via entity allocations)
}

export interface AssetProjectedMetrics {
  irr: number | null;           // projectedIRR from asset or deal metadata
  multiple: number | null;      // projectedMultiple from asset or deal metadata
  source: "asset" | "deal_metadata" | "none";
  classSpecific: Record<string, unknown>; // capRate, cashOnCash, yieldToMaturity, etc.
}

export interface AssetVariance {
  irrDelta: number | null;      // actual.irr - projected.irr (positive = outperforming)
  moicDelta: number | null;     // actual.moic - projected.multiple
}

export interface AssetAttribution {
  assetId: string;
  assetInfo: {
    name: string;
    assetClass: string;
    entityNames: string[];
    costBasis: number;
    fairValue: number;
    status: string;
  };
  actual: AssetActualMetrics;
  projected: AssetProjectedMetrics;
  variance: AssetVariance;
  // Contribution to fund/entity
  contributionWeight: number | null;   // costBasis / totalEntityCostBasis (populated by entity attribution)
  weightedIRRContribution: number | null; // weight * actual.irr
}

export interface EntityAttributionResult {
  entityId: string;
  entityName: string;
  entityMetrics: {
    totalIRR: number | null;
    totalTVPI: number | null;
    totalCostBasis: number;
    totalFairValue: number;
    totalDistributions: number;
  };
  assets: AssetAttribution[];
  rankedByContribution: Array<{
    assetId: string;
    assetName: string;
    contributionPct: number | null;
    irr: number | null;
    moic: number | null;
    variance: AssetVariance;
  }>;
}

// ─────────────────────────────────────────────────────────
// computeAssetAttribution
// ─────────────────────────────────────────────────────────

export async function computeAssetAttribution(assetId: string): Promise<AssetAttribution> {
  // Fetch asset with all related data needed for attribution
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      entityAllocations: {
        include: {
          entity: {
            select: {
              id: true,
              name: true,
              capitalCalls: {
                include: { lineItems: true },
              },
              distributions: {
                include: { lineItems: true },
              },
            },
          },
        },
      },
      incomeEvents: true,
      valuations: {
        orderBy: { valuationDate: "desc" },
        take: 1,
      },
      sourceDeal: {
        select: {
          id: true,
          dealMetadata: true,
        },
      },
    },
  });

  if (!asset) {
    throw new Error(`Asset not found: ${assetId}`);
  }

  // ── Projected metrics ──────────────────────────────────
  // Priority: asset-level projections > deal metadata fallback
  let projectedIRR: number | null = null;
  let projectedMultiple: number | null = null;
  let projectionSource: "asset" | "deal_metadata" | "none" = "none";
  let classSpecific: Record<string, unknown> = {};

  if (asset.projectedIRR != null || asset.projectedMultiple != null) {
    projectedIRR = asset.projectedIRR ?? null;
    projectedMultiple = asset.projectedMultiple ?? null;
    projectionSource = "asset";
    if (asset.projectedMetrics && typeof asset.projectedMetrics === "object") {
      classSpecific = asset.projectedMetrics as Record<string, unknown>;
    }
  } else if (asset.sourceDeal?.dealMetadata) {
    const meta = asset.sourceDeal.dealMetadata as Record<string, unknown>;
    // Common AI-extracted fields from deal screening
    projectedIRR =
      (meta.targetIRR as number | null) ??
      (meta.projectedIRR as number | null) ??
      null;
    projectedMultiple =
      (meta.targetMultiple as number | null) ??
      (meta.projectedMultiple as number | null) ??
      (meta.targetMOIC as number | null) ??
      null;
    projectionSource = "deal_metadata";
    // Extract class-specific fields
    const specificKeys = ["capRate", "cashOnCash", "yieldToMaturity", "noi", "occupancy", "debtYield"];
    for (const key of specificKeys) {
      if (meta[key] != null) classSpecific[key] = meta[key];
    }
  }

  // ── Actual metrics ─────────────────────────────────────
  // Build XIRR cash flows from entity capital calls + distributions allocated to this asset.
  // We use the entity's capital calls / distributions, weighted by asset allocation percent.
  const cashFlows: { date: Date; amount: number }[] = [];
  let totalCalled = 0;
  let totalDistributions = 0;

  for (const allocation of asset.entityAllocations) {
    const weight = (allocation.allocationPercent ?? 100) / 100;
    const entity = allocation.entity;

    // Capital calls: outflows (negative). Use funded line items with paidDate.
    for (const call of entity.capitalCalls) {
      for (const li of call.lineItems) {
        if (li.status === "Funded" && li.paidDate) {
          const allocatedAmount = li.amount * weight;
          totalCalled += allocatedAmount;
          cashFlows.push({
            date: new Date(li.paidDate),
            amount: -allocatedAmount,
          });
        }
      }
    }

    // Distributions: inflows (positive). Use PAID distributions.
    for (const dist of entity.distributions) {
      if (dist.status === "PAID") {
        for (const li of dist.lineItems) {
          const allocatedAmount = li.netAmount * weight;
          totalDistributions += allocatedAmount;
          cashFlows.push({
            date: new Date(dist.distributionDate),
            amount: allocatedAmount,
          });
        }
      }
    }
  }

  // Income events attached directly to the asset
  const totalIncome = asset.incomeEvents.reduce((sum, e) => sum + e.amount, 0);

  // Add current fair value as terminal inflow (residual value)
  const fairValue = asset.fairValue;
  const costBasis = asset.costBasis;

  if (fairValue > 0 && cashFlows.length > 0) {
    cashFlows.push({ date: new Date(), amount: fairValue });
  }

  // If no funded capital calls but we have cost basis, approximate with entry date
  if (totalCalled === 0 && costBasis > 0) {
    const entryDate = asset.entryDate ?? asset.entityAllocations[0]?.createdAt ?? new Date();
    cashFlows.push({ date: new Date(entryDate), amount: -costBasis });
    if (fairValue > 0) {
      cashFlows.push({ date: new Date(), amount: fairValue + totalDistributions });
    }
    totalCalled = costBasis;
  }

  const actualIRR = xirr(cashFlows);
  const actualMOIC = costBasis > 0 ? fairValue / costBasis : null;
  const actualTotalReturn =
    costBasis > 0
      ? (fairValue + totalDistributions - costBasis) / costBasis
      : null;
  const unrealizedGain = fairValue - costBasis;
  const realizedGain = totalDistributions;

  // ── Variance ───────────────────────────────────────────
  const irrDelta =
    actualIRR != null && projectedIRR != null ? actualIRR - projectedIRR : null;
  const moicDelta =
    actualMOIC != null && projectedMultiple != null ? actualMOIC - projectedMultiple : null;

  return {
    assetId: asset.id,
    assetInfo: {
      name: asset.name,
      assetClass: asset.assetClass,
      entityNames: asset.entityAllocations.map((ea: any) => ea.entity.name),
      costBasis,
      fairValue,
      status: asset.status,
    },
    actual: {
      irr: actualIRR,
      moic: actualMOIC,
      totalReturn: actualTotalReturn,
      totalIncome,
      unrealizedGain,
      realizedGain,
      totalDistributions,
      totalCalled,
    },
    projected: {
      irr: projectedIRR,
      multiple: projectedMultiple,
      source: projectionSource,
      classSpecific,
    },
    variance: {
      irrDelta,
      moicDelta,
    },
    // Populated by entity attribution
    contributionWeight: null,
    weightedIRRContribution: null,
  };
}

// ─────────────────────────────────────────────────────────
// computeEntityAttribution
// ─────────────────────────────────────────────────────────

export async function computeEntityAttribution(entityId: string): Promise<EntityAttributionResult> {
  // Get entity with all asset allocations
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: {
      assetAllocations: {
        include: {
          asset: { select: { id: true } },
        },
      },
      distributions: {
        where: { status: "PAID" },
        include: { lineItems: true },
      },
      capitalCalls: {
        include: { lineItems: true },
      },
    },
  });

  if (!entity) {
    throw new Error(`Entity not found: ${entityId}`);
  }

  // Compute attribution for each asset
  const assetAttributions: AssetAttribution[] = [];
  let totalEntityCostBasis = 0;
  let totalEntityFairValue = 0;
  let totalEntityDistributions = 0;

  for (const alloc of entity.assetAllocations) {
    try {
      const attribution = await computeAssetAttribution(alloc.asset.id);
      assetAttributions.push(attribution);

      // Weight by allocation percent
      const weight = (alloc.allocationPercent ?? 100) / 100;
      totalEntityCostBasis += attribution.assetInfo.costBasis * weight;
      totalEntityFairValue += attribution.assetInfo.fairValue * weight;
      totalEntityDistributions += attribution.actual.totalDistributions;
    } catch (err) {
      console.error(`[performance-attribution] Failed to compute for asset ${alloc.asset.id}:`, err);
    }
  }

  // Assign contribution weights and compute weighted IRR contributions
  for (const attr of assetAttributions) {
    if (totalEntityCostBasis > 0) {
      const weight = attr.assetInfo.costBasis / totalEntityCostBasis;
      attr.contributionWeight = weight;
      attr.weightedIRRContribution = attr.actual.irr != null ? weight * attr.actual.irr : null;
    }
  }

  // Entity-level IRR: weighted sum of asset IRR contributions
  const totalIRR = assetAttributions.reduce((sum, attr) => {
    return attr.weightedIRRContribution != null ? sum + attr.weightedIRRContribution : sum;
  }, 0) || null;

  // TVPI = (totalFairValue + totalDistributions) / totalCostBasis
  const totalTVPI =
    totalEntityCostBasis > 0
      ? (totalEntityFairValue + totalEntityDistributions) / totalEntityCostBasis
      : null;

  // Ranked by contribution (highest weighted IRR contribution first)
  const rankedByContribution = [...assetAttributions]
    .sort((a, b) => {
      const aContrib = a.weightedIRRContribution ?? -Infinity;
      const bContrib = b.weightedIRRContribution ?? -Infinity;
      return bContrib - aContrib;
    })
    .map((attr) => ({
      assetId: attr.assetId,
      assetName: attr.assetInfo.name,
      contributionPct:
        attr.contributionWeight != null
          ? Math.round(attr.contributionWeight * 10000) / 100  // as percentage
          : null,
      irr: attr.actual.irr,
      moic: attr.actual.moic,
      variance: attr.variance,
    }));

  return {
    entityId: entity.id,
    entityName: entity.name,
    entityMetrics: {
      totalIRR,
      totalTVPI,
      totalCostBasis: totalEntityCostBasis,
      totalFairValue: totalEntityFairValue,
      totalDistributions: totalEntityDistributions,
    },
    assets: assetAttributions,
    rankedByContribution,
  };
}
