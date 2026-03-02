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

  // Compute pro-rata for each asset based on investor's share of entity
  const assets: { asset: Record<string, unknown>; proRata: number; investorPct: number }[] = [];
  const seen = new Set<string>();

  for (const commitment of investor.commitments) {
    const entity = commitment.entity;
    const entityTotalCommitted = entity.commitments.reduce((s, c) => s + c.amount, 0);
    const investorPct = entityTotalCommitted > 0 ? commitment.amount / entityTotalCommitted : 0;

    for (const alloc of entity.assetAllocations) {
      if (!seen.has(alloc.asset.id) && alloc.asset.status === "ACTIVE") {
        seen.add(alloc.asset.id);
        assets.push({
          asset: alloc.asset,
          proRata: alloc.asset.fairValue * investorPct,
          investorPct,
        });
      }
    }
  }

  return NextResponse.json({ commitments: investor.commitments, assets });
}
