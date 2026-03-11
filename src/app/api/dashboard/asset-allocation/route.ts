import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    const assets = await prisma.asset.findMany({
      where: {
        status: "ACTIVE",
        ...(firmId
          ? { entityAllocations: { some: { entity: { firmId } } } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        assetClass: true,
        capitalInstrument: true,
        participationStructure: true,
        fairValue: true,
      },
    });

    const byAssetClass: Record<string, { equity: number; debt: number }> = {};
    const byParticipation: Record<string, { equity: number; debt: number }> =
      {};

    for (const a of assets) {
      const ac = a.assetClass;
      const ps = a.participationStructure || "DIRECT_GP";
      const fv = a.fairValue || 0;
      const isDebt = a.capitalInstrument === "DEBT";

      if (!byAssetClass[ac]) byAssetClass[ac] = { equity: 0, debt: 0 };
      if (isDebt) byAssetClass[ac].debt += fv;
      else byAssetClass[ac].equity += fv;

      if (!byParticipation[ps])
        byParticipation[ps] = { equity: 0, debt: 0 };
      if (isDebt) byParticipation[ps].debt += fv;
      else byParticipation[ps].equity += fv;
    }

    const outerRing = Object.entries(byAssetClass).map(([name, v]) => ({
      name,
      value: v.equity + v.debt,
      equityValue: v.equity,
      debtValue: v.debt,
    }));

    const innerRing = Object.entries(byParticipation).map(([name, v]) => ({
      name,
      value: v.equity + v.debt,
      equityValue: v.equity,
      debtValue: v.debt,
    }));

    const totalFairValue = assets.reduce(
      (s, a) => s + (a.fairValue || 0),
      0,
    );

    return NextResponse.json({ outerRing, innerRing, totalFairValue });
  } catch (err) {
    logger.error("[dashboard/asset-allocation] Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to load asset allocation" },
      { status: 500 },
    );
  }
}
