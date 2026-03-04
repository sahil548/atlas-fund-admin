import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { z } from "zod";
import { computeCapitalAccount, proRataShare } from "@/lib/computations/capital-accounts";

const ComputeSchema = z.object({
  entityId: z.string().min(1, "Entity is required"),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
});

/**
 * POST /api/investors/[id]/capital-account/compute
 *
 * Computes a capital account statement for a given investor + entity + period
 * from actual ledger data (capital calls, distributions, income events, fees).
 * Upserts the result into the CapitalAccount table.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: investorId } = await params;
  const { data, error } = await parseBody(req, ComputeSchema);
  if (error) return error;

  const { entityId, periodStart, periodEnd } = data!;
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  // Get the investor's commitment to this entity
  const commitment = await prisma.commitment.findUnique({
    where: { investorId_entityId: { investorId, entityId } },
  });
  if (!commitment) {
    return NextResponse.json({ error: "No commitment found for this investor/entity" }, { status: 404 });
  }

  // Get total commitments to this entity (for pro-rata calculation)
  const totalEntityCommitments = await prisma.commitment.aggregate({
    where: { entityId },
    _sum: { amount: true },
  });
  const proRata = proRataShare(commitment.amount, totalEntityCommitments._sum.amount ?? 0);

  // Get previous period's ending balance (beginning balance for this period)
  const previousAccount = await prisma.capitalAccount.findFirst({
    where: {
      investorId,
      entityId,
      periodDate: { lt: end },
    },
    orderBy: { periodDate: "desc" },
    select: { endingBalance: true },
  });
  const beginningBalance = previousAccount?.endingBalance ?? 0;

  // Contributions: capital call line items funded in the period
  const callLineItems = await prisma.capitalCallLineItem.findMany({
    where: {
      investorId,
      capitalCall: {
        entityId,
        callDate: { gte: start, lte: end },
      },
      status: "Funded",
    },
  });
  const contributions = callLineItems.reduce((s, cli) => s + cli.amount, 0);

  // Distributions: distribution line items in the period
  const distLineItems = await prisma.distributionLineItem.findMany({
    where: {
      investorId,
      distribution: {
        entityId,
        distributionDate: { gte: start, lte: end },
      },
    },
  });
  const distributions = distLineItems.reduce((s, dli) => s + dli.netAmount, 0);

  // Income allocations: pro-rata share of income events for this entity in the period
  const incomeEvents = await prisma.incomeEvent.findMany({
    where: {
      entityId,
      date: { gte: start, lte: end },
      isPrincipal: false,
    },
  });
  const incomeAllocations = incomeEvents.reduce((s, ie) => s + ie.amount, 0) * proRata;

  // Capital allocations: unrealized gains from valuations in the period (pro-rata)
  // Use the change in entity NAV as a proxy for capital allocations
  const navComputations = await prisma.nAVComputation.findMany({
    where: {
      entityId,
      periodDate: { gte: start, lte: end },
    },
    orderBy: { periodDate: "desc" },
    take: 1,
  });
  const capitalAllocations = navComputations.length > 0
    ? (navComputations[0].unrealizedGain ?? 0) * proRata
    : 0;

  // Fees: pro-rata share of fee calculations for this entity in the period
  const feeCalculations = await prisma.feeCalculation.findMany({
    where: {
      entityId,
      periodDate: { gte: start, lte: end },
    },
  });
  const fees = feeCalculations.reduce(
    (s, fc) => s + (fc.managementFee ?? 0) + (fc.fundExpenses ?? 0) + (fc.carriedInterest ?? 0),
    0
  ) * proRata;

  // Compute the capital account
  const result = computeCapitalAccount(
    beginningBalance,
    contributions,
    incomeAllocations,
    capitalAllocations,
    distributions,
    fees
  );

  // Upsert the capital account record
  const capitalAccount = await prisma.capitalAccount.upsert({
    where: {
      investorId_entityId_periodDate: {
        investorId,
        entityId,
        periodDate: end,
      },
    },
    update: {
      beginningBalance: result.beginningBalance,
      contributions: result.contributions,
      incomeAllocations: result.incomeAllocations,
      capitalAllocations: result.capitalAllocations,
      distributions: result.distributions,
      fees: result.fees,
      endingBalance: result.endingBalance,
    },
    create: {
      investorId,
      entityId,
      periodDate: end,
      beginningBalance: result.beginningBalance,
      contributions: result.contributions,
      incomeAllocations: result.incomeAllocations,
      capitalAllocations: result.capitalAllocations,
      distributions: result.distributions,
      fees: result.fees,
      endingBalance: result.endingBalance,
    },
  });

  return NextResponse.json({
    ...result,
    proRataShare: proRata,
    periodDate: end,
    id: capitalAccount.id,
  });
}
