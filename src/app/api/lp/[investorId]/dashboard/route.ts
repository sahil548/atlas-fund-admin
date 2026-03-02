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
              navComputations: { orderBy: { periodDate: "desc" }, take: 1 },
            },
          },
        },
      },
      capitalAccounts: { orderBy: { periodDate: "desc" }, take: 1 },
    },
  });
  if (!investor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totalCommitted = investor.commitments.reduce((s, c) => s + c.amount, 0);
  const totalCalled = investor.commitments.reduce((s, c) => s + c.calledAmount, 0);

  // Aggregate distribution line items for this investor
  const distributionAgg = await prisma.distributionLineItem.aggregate({
    where: { investorId },
    _sum: {
      netAmount: true,
      income: true,
      returnOfCapital: true,
    },
  });

  const totalDistributed = distributionAgg._sum.netAmount ?? 0;
  const totalIncome = distributionAgg._sum.income ?? 0;
  const totalPrincipal = distributionAgg._sum.returnOfCapital ?? 0;

  // Compute current NAV: sum of endingBalance from the latest capital account per entity
  // First, get all capital accounts for this investor, then pick latest per entity
  const allCapitalAccounts = await prisma.capitalAccount.findMany({
    where: { investorId },
    orderBy: { periodDate: "desc" },
    select: { entityId: true, endingBalance: true, periodDate: true },
  });

  // Keep only the latest record per entity
  const latestByEntity = new Map<string, number>();
  for (const ca of allCapitalAccounts) {
    if (!latestByEntity.has(ca.entityId)) {
      latestByEntity.set(ca.entityId, ca.endingBalance);
    }
  }
  const currentNAV = Array.from(latestByEntity.values()).reduce((s, v) => s + v, 0);

  // Performance metrics
  const tvpi = totalCalled > 0 ? (totalDistributed + currentNAV) / totalCalled : null;
  const dpi = totalCalled > 0 ? totalDistributed / totalCalled : null;
  const rvpi = totalCalled > 0 ? currentNAV / totalCalled : null;
  const irr = null; // Requires complex cash-flow calculation — left as null for now

  return NextResponse.json({
    investor,
    totalCommitted,
    totalCalled,
    totalDistributed,
    totalIncome,
    totalPrincipal,
    currentNAV,
    tvpi,
    dpi,
    rvpi,
    irr,
    commitments: investor.commitments,
  });
}
