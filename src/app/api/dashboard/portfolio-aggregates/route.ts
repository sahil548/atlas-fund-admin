import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const assetFilter = firmId
      ? { entityAllocations: { some: { entity: { firmId } } } }
      : {};
    const entityFilter = firmId ? { firmId } : {};
    const entityRelFilter = firmId ? { entity: { firmId } } : {};

    const [assets, entities, dealActivity, capitalCalls, distributions] =
      await Promise.all([
        // All active assets with IRR for top/bottom performers
        prisma.asset.findMany({
          where: { ...assetFilter, status: "ACTIVE" },
          select: {
            id: true,
            name: true,
            assetClass: true,
            capitalInstrument: true,
            participationStructure: true,
            fairValue: true,
            costBasis: true,
            moic: true,
            irr: true,
            entityAllocations: {
              include: {
                entity: { select: { name: true } },
              },
              take: 1,
            },
          },
        }),
        // Entities for capital deployment tracker
        prisma.entity.findMany({
          where: { ...entityFilter, status: "ACTIVE" },
          select: {
            id: true,
            name: true,
            entityType: true,
            totalCommitments: true,
            capitalCalls: {
              include: {
                lineItems: {
                  select: { amount: true, status: true },
                },
              },
            },
          },
        }),
        // Recent deal activity
        prisma.dealActivity
          .findMany({
            where: firmId ? { deal: { firmId } } : {},
            orderBy: { createdAt: "desc" },
            take: 6,
            include: {
              deal: { select: { id: true, name: true } },
            },
          })
          .catch(() => []),
        // Recent capital calls
        prisma.capitalCall.findMany({
          where: entityRelFilter,
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            id: true,
            callNumber: true,
            amount: true,
            status: true,
            createdAt: true,
            entity: { select: { id: true, name: true } },
          },
        }),
        // Recent distributions
        prisma.distributionEvent.findMany({
          where: entityRelFilter,
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            id: true,
            grossAmount: true,
            status: true,
            distributionDate: true,
            entity: { select: { id: true, name: true } },
          },
        }),
      ]);

    // ── Asset allocation (reuse same logic as asset-allocation endpoint) ──
    const byAssetClass: Record<string, { equity: number; debt: number }> = {};
    const byParticipation: Record<string, { equity: number; debt: number }> = {};

    for (const a of assets) {
      const ac = a.assetClass;
      const ps = a.participationStructure || "DIRECT_GP";
      const fv = a.fairValue || 0;
      const isDebt = a.capitalInstrument === "DEBT";

      if (!byAssetClass[ac]) byAssetClass[ac] = { equity: 0, debt: 0 };
      if (isDebt) byAssetClass[ac].debt += fv;
      else byAssetClass[ac].equity += fv;

      if (!byParticipation[ps]) byParticipation[ps] = { equity: 0, debt: 0 };
      if (isDebt) byParticipation[ps].debt += fv;
      else byParticipation[ps].equity += fv;
    }

    const assetAllocation = {
      outerRing: Object.entries(byAssetClass).map(([name, v]) => ({
        name,
        value: v.equity + v.debt,
        equityValue: v.equity,
        debtValue: v.debt,
      })),
      innerRing: Object.entries(byParticipation).map(([name, v]) => ({
        name,
        value: v.equity + v.debt,
        equityValue: v.equity,
        debtValue: v.debt,
      })),
      totalFairValue: assets.reduce((s, a) => s + (a.fairValue || 0), 0),
    };

    // ── Top / Bottom performers by IRR ──
    const assetsWithIRR = assets.filter((a) => a.irr != null);
    const sortedByIRR = [...assetsWithIRR].sort((a, b) => (b.irr ?? 0) - (a.irr ?? 0));

    const formatPerformer = (a: (typeof assetsWithIRR)[0]) => ({
      assetId: a.id,
      name: a.name,
      irr: a.irr,
      moic: a.moic,
      fairValue: a.fairValue,
      entityName: a.entityAllocations[0]?.entity?.name ?? null,
    });

    const topPerformers = sortedByIRR.slice(0, 5).map(formatPerformer);
    const bottomPerformers = [...sortedByIRR].reverse().slice(0, 5).map(formatPerformer);

    // ── Capital deployment per entity + aggregate ──
    const capitalDeployment = {
      entities: entities.map((entity) => {
        const totalCommitted = entity.totalCommitments ?? 0;
        let totalCalled = 0;
        let totalDeployed = 0;

        for (const call of entity.capitalCalls) {
          const callAmount = call.lineItems.reduce(
            (s: number, li: { amount: number }) => s + li.amount,
            0
          );
          totalCalled += callAmount;

          const fundedAmount = call.lineItems
            .filter((li: { status: string }) => li.status === "Funded")
            .reduce((s: number, li: { amount: number }) => s + li.amount, 0);
          totalDeployed += fundedAmount;
        }

        return {
          entityId: entity.id,
          entityName: entity.name,
          entityType: entity.entityType,
          totalCommitted,
          totalCalled,
          totalDeployed,
          dryPowder: Math.max(0, totalCommitted - totalDeployed),
          deploymentPct:
            totalCommitted > 0
              ? Math.min(100, (totalDeployed / totalCommitted) * 100)
              : 0,
        };
      }),
      aggregate: {
        totalCommitted: 0,
        totalCalled: 0,
        totalDeployed: 0,
        totalDryPowder: 0,
      },
    };

    // Compute aggregate totals
    for (const e of capitalDeployment.entities) {
      capitalDeployment.aggregate.totalCommitted += e.totalCommitted;
      capitalDeployment.aggregate.totalCalled += e.totalCalled;
      capitalDeployment.aggregate.totalDeployed += e.totalDeployed;
      capitalDeployment.aggregate.totalDryPowder += e.dryPowder;
    }

    // ── Recent activity: merge deal activity + capital calls + distributions ──
    const activityItems: {
      id: string;
      type: "DEAL_ACTIVITY" | "CAPITAL_CALL" | "DISTRIBUTION";
      description: string;
      entityName: string | null;
      linkId: string;
      linkType: "deal" | "entity";
      date: Date;
    }[] = [];

    for (const a of dealActivity) {
      activityItems.push({
        id: a.id,
        type: "DEAL_ACTIVITY",
        description: a.description || `${a.activityType} on ${a.deal?.name}`,
        entityName: null,
        linkId: a.deal?.id ?? a.id,
        linkType: "deal",
        date: new Date(a.createdAt),
      });
    }

    for (const cc of capitalCalls) {
      activityItems.push({
        id: cc.id,
        type: "CAPITAL_CALL",
        description: `Capital call ${cc.callNumber} — ${cc.entity.name} (${cc.status})`,
        entityName: cc.entity.name,
        linkId: cc.entity.id,
        linkType: "entity",
        date: new Date(cc.createdAt),
      });
    }

    for (const dist of distributions) {
      activityItems.push({
        id: dist.id,
        type: "DISTRIBUTION",
        description: `Distribution to LPs — ${dist.entity.name} (${dist.status})`,
        entityName: dist.entity.name,
        linkId: dist.entity.id,
        linkType: "entity",
        date: new Date(dist.distributionDate),
      });
    }

    // Sort by date descending, take 10
    const recentActivity = activityItems
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10)
      .map((a) => ({ ...a, date: a.date.toISOString() }));

    return NextResponse.json({
      assetAllocation,
      topPerformers,
      bottomPerformers,
      capitalDeployment,
      recentActivity,
    });
  } catch (err) {
    logger.error("[dashboard/portfolio-aggregates] Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to load portfolio aggregates" },
      { status: 500 }
    );
  }
}
