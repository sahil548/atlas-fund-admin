import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { computeMetrics } from "@/lib/computations/metrics";
import { xirr } from "@/lib/computations/irr";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // Fetch all investors with commitments scoped to this firm
    const investors = await prisma.investor.findMany({
      where: firmId
        ? { commitments: { some: { entity: { firmId } } } }
        : {},
      include: {
        commitments: {
          include: {
            entity: {
              select: {
                id: true,
                name: true,
                entityType: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { totalCommitted: "desc" },
    });

    // For each investor, fetch capital call line items and distribution line items
    // grouped by entity for per-entity metrics
    const result = await Promise.all(
      investors.map(async (investor) => {
        // Total across all entities
        const totalCommitted = investor.commitments.reduce(
          (s, c) => s + c.amount,
          0
        );

        // Fetch funded capital call line items for this investor
        const callLineItems = await prisma.capitalCallLineItem.findMany({
          where: {
            investorId: investor.id,
            ...(firmId
              ? { capitalCall: { entity: { firmId } } }
              : {}),
          },
          include: {
            capitalCall: {
              select: {
                entityId: true,
                callDate: true,
              },
            },
          },
        });

        // Fetch paid distribution line items for this investor
        const distLineItems = await prisma.distributionLineItem.findMany({
          where: {
            investorId: investor.id,
            ...(firmId
              ? { distribution: { entity: { firmId } } }
              : {}),
          },
          include: {
            distribution: {
              select: {
                entityId: true,
                distributionDate: true,
                status: true,
              },
            },
          },
        });

        // Fetch latest capital account balance per entity for NAV
        const capitalAccounts = await prisma.capitalAccount.findMany({
          where: {
            investorId: investor.id,
            ...(firmId ? { entity: { firmId } } : {}),
          },
          orderBy: { periodDate: "desc" },
          select: { entityId: true, endingBalance: true },
        });

        // Keep only the latest record per entity
        const navByEntity = new Map<string, number>();
        for (const ca of capitalAccounts) {
          if (!navByEntity.has(ca.entityId)) {
            navByEntity.set(ca.entityId, ca.endingBalance);
          }
        }

        // Group call amounts by entity
        const calledByEntity = new Map<string, number>();
        const callFlowsByEntity = new Map<
          string,
          { date: Date; amount: number }[]
        >();

        for (const li of callLineItems) {
          const eid = li.capitalCall.entityId;
          calledByEntity.set(eid, (calledByEntity.get(eid) ?? 0) + li.amount);
          if (!callFlowsByEntity.has(eid)) callFlowsByEntity.set(eid, []);
          callFlowsByEntity.get(eid)!.push({
            date: li.capitalCall.callDate,
            amount: -li.amount,
          });
        }

        // Group distribution amounts by entity
        const distributedByEntity = new Map<string, number>();
        const distFlowsByEntity = new Map<
          string,
          { date: Date; amount: number }[]
        >();

        for (const li of distLineItems) {
          if (li.distribution.status !== "PAID") continue;
          const eid = li.distribution.entityId;
          distributedByEntity.set(
            eid,
            (distributedByEntity.get(eid) ?? 0) + li.netAmount
          );
          if (!distFlowsByEntity.has(eid)) distFlowsByEntity.set(eid, []);
          distFlowsByEntity.get(eid)!.push({
            date: li.distribution.distributionDate,
            amount: li.netAmount,
          });
        }

        // Per-entity metrics
        const perEntity = investor.commitments
          .filter((c) => c.entity.status === "ACTIVE")
          .map((commitment) => {
            const eid = commitment.entity.id;
            const committed = commitment.amount;
            const called = calledByEntity.get(eid) ?? 0;
            const distributed = distributedByEntity.get(eid) ?? 0;
            const entityNAV = navByEntity.get(eid) ?? 0;

            const metrics = computeMetrics(called, distributed, entityNAV);

            // Build cash flows for IRR
            const cashFlows: { date: Date; amount: number }[] = [
              ...(callFlowsByEntity.get(eid) ?? []),
              ...(distFlowsByEntity.get(eid) ?? []),
            ];
            if (entityNAV > 0) {
              cashFlows.push({ date: new Date(), amount: entityNAV });
            }
            const entityIRR =
              cashFlows.length >= 2 ? xirr(cashFlows) : null;

            return {
              entityId: eid,
              entityName: commitment.entity.name,
              entityType: commitment.entity.entityType,
              committed,
              called,
              distributed,
              nav: entityNAV,
              tvpi: metrics.tvpi,
              dpi: metrics.dpi,
              rvpi: metrics.rvpi,
              irr: entityIRR,
            };
          });

        // Aggregate metrics across all entities
        const aggCalled = perEntity.reduce((s, e) => s + e.called, 0);
        const aggDistributed = perEntity.reduce((s, e) => s + e.distributed, 0);
        const aggNAV = perEntity.reduce((s, e) => s + e.nav, 0);
        const aggregateMetrics = computeMetrics(aggCalled, aggDistributed, aggNAV);

        // Aggregate IRR
        const aggCashFlows: { date: Date; amount: number }[] = [];
        for (const li of callLineItems) {
          aggCashFlows.push({ date: li.capitalCall.callDate, amount: -li.amount });
        }
        for (const li of distLineItems) {
          if (li.distribution.status === "PAID") {
            aggCashFlows.push({
              date: li.distribution.distributionDate,
              amount: li.netAmount,
            });
          }
        }
        if (aggNAV > 0) {
          aggCashFlows.push({ date: new Date(), amount: aggNAV });
        }
        const aggregateIRR =
          aggCashFlows.length >= 2 ? xirr(aggCashFlows) : null;

        return {
          investorId: investor.id,
          investorName: investor.name,
          investorType: investor.investorType,
          totalCommitted,
          perEntity,
          aggregateMetrics: {
            tvpi: aggregateMetrics.tvpi,
            dpi: aggregateMetrics.dpi,
            rvpi: aggregateMetrics.rvpi,
            irr: aggregateIRR,
            called: aggCalled,
            distributed: aggDistributed,
            nav: aggNAV,
          },
        };
      })
    );

    // Sort by totalCommitted descending
    result.sort((a, b) => b.totalCommitted - a.totalCommitted);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[dashboard/lp-comparison] Error:", err);
    return NextResponse.json(
      { error: "Failed to load LP comparison" },
      { status: 500 }
    );
  }
}
