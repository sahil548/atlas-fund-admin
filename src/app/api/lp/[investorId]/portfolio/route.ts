import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ investorId: string }> }
) {
  const { investorId } = await params;
  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    include: {
      commitments: {
        include: {
          entity: {
            include: {
              commitments: { select: { amount: true } },
              assetAllocations: {
                include: {
                  asset: {
                    include: { equityDetails: true, creditDetails: true, realEstateDetails: true, fundLPDetails: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Compute pro-rata for each asset based on investor's share of entity.
  // Also derive investedCapital via a server-side Prisma aggregate on FUNDED capital calls
  // per investor + entity (NO HTTP calls from inside a server route).
  const assetRows: {
    asset: Record<string, unknown>;
    proRata: number;
    investorPct: number;
    entityId: string;
    investedCapital: number;
  }[] = [];
  const seen = new Set<string>();

  // Collect unique entityIds so we can batch the aggregate queries (avoid N+1)
  const entityInvestorPairs: { entityId: string; investorPct: number }[] = [];

  for (const commitment of investor.commitments) {
    const entity = commitment.entity;
    const entityTotalCommitted = entity.commitments.reduce((s, c) => s + c.amount, 0);
    const investorPct = entityTotalCommitted > 0 ? commitment.amount / entityTotalCommitted : 0;
    entityInvestorPairs.push({ entityId: entity.id, investorPct });

    for (const alloc of entity.assetAllocations) {
      if (!seen.has(alloc.asset.id) && alloc.asset.status === "ACTIVE") {
        seen.add(alloc.asset.id);
        assetRows.push({
          asset: alloc.asset,
          proRata: alloc.asset.fairValue * investorPct,
          investorPct,
          entityId: entity.id,
          investedCapital: 0, // populated below
        });
      }
    }
  }

  // Aggregate FUNDED capital call amounts per entity for this investor.
  // CapitalCallLineItem has no entityId — traverse via capitalCall.entityId.
  const uniqueEntityIds = Array.from(new Set(entityInvestorPairs.map((p) => p.entityId)));
  const perEntityTotals = new Map<string, number>();

  await Promise.all(
    uniqueEntityIds.map(async (entityId) => {
      const { _sum } = await prisma.capitalCallLineItem.aggregate({
        _sum: { amount: true },
        where: {
          investorId,
          capitalCall: {
            entityId,
            status: "FUNDED",
          },
        },
      });
      perEntityTotals.set(entityId, _sum.amount ?? 0);
    }),
  );

  // Attach investedCapital to each asset row
  const assets = assetRows.map(({ entityId, investorPct, investedCapital: _ic, ...rest }) => {
    const totalCalled = perEntityTotals.get(entityId) ?? 0;
    return {
      ...rest,
      investorPct,
      investedCapital: totalCalled * investorPct,
    };
  });

  return NextResponse.json({ commitments: investor.commitments, assets });
}
