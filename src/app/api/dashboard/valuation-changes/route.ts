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

    // Get active assets with their last 2 valuations
    const assets = await prisma.asset.findMany({
      where: { ...assetFilter, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        fairValue: true,
        valuations: {
          orderBy: { valuationDate: "desc" },
          take: 2,
          select: {
            fairValue: true,
            valuationDate: true,
          },
        },
        entityAllocations: {
          include: { entity: { select: { name: true } } },
          take: 1,
        },
      },
    });

    // Compute deltas for assets with at least 2 valuations
    const changes = assets
      .filter((a) => a.valuations.length >= 2)
      .map((a) => {
        const current = a.valuations[0].fairValue;
        const previous = a.valuations[1].fairValue;
        const delta = current - previous;
        const pctChange = previous !== 0 ? delta / previous : 0;

        return {
          assetId: a.id,
          name: a.name,
          currentValue: current,
          previousValue: previous,
          delta,
          pctChange,
          valuationDate: a.valuations[0].valuationDate,
          entityName: a.entityAllocations[0]?.entity?.name ?? null,
        };
      })
      .filter((c) => c.delta !== 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 10);

    return NextResponse.json({ changes });
  } catch (err) {
    logger.error("[dashboard/valuation-changes] Error:", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to load valuation changes" },
      { status: 500 }
    );
  }
}
