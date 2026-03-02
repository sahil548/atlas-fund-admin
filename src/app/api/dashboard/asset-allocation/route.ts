import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const assets = await prisma.asset.findMany({
    where: { status: "ACTIVE" },
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

  const totalFairValue = assets.reduce((s, a) => s + (a.fairValue || 0), 0);

  return NextResponse.json({ outerRing, innerRing, totalFairValue });
}
