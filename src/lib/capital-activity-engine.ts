/**
 * Capital Activity Engine — Transaction chain functions.
 *
 * Called after capital activity events to keep derived data consistent:
 * - Commitment.calledAmount (sum of funded capital call line items)
 * - CapitalAccount (roll-forward computation per investor per entity)
 */

import { prisma } from "@/lib/prisma";
import {
  computeCapitalAccount,
  proRataShare,
} from "@/lib/computations/capital-accounts";

/**
 * After a capital call line item is funded:
 * 1. Sum all funded line items -> update Commitment.calledAmount
 */
export async function updateCommitmentCalledAmount(
  investorId: string,
  entityId: string,
): Promise<void> {
  // Sum all funded capital call line items for this investor + entity
  const lineItems = await prisma.capitalCallLineItem.findMany({
    where: {
      investorId,
      status: "Funded",
      capitalCall: { entityId },
    },
    select: { amount: true },
  });

  const calledAmount = lineItems.reduce((sum, li) => sum + li.amount, 0);

  await prisma.commitment.updateMany({
    where: { investorId, entityId },
    data: { calledAmount },
  });
}

/**
 * Recompute the capital account for a single investor+entity.
 * Uses the full roll-forward formula.
 */
export async function recomputeCapitalAccountForInvestor(
  investorId: string,
  entityId: string,
): Promise<void> {
  // 1. Get investor's commitment for pro-rata calculation
  const commitment = await prisma.commitment.findUnique({
    where: { investorId_entityId: { investorId, entityId } },
  });

  // 2. Get total entity commitments for pro-rata denominator
  const allCommitments = await prisma.commitment.findMany({
    where: { entityId },
    select: { amount: true },
  });
  const totalCommitments = allCommitments.reduce(
    (sum, c) => sum + c.amount,
    0,
  );

  const investorCommitment = commitment?.amount ?? 0;
  const proRata = proRataShare(investorCommitment, totalCommitments);

  // 3. Contributions = sum of funded capital call line items for this investor+entity
  const fundedLineItems = await prisma.capitalCallLineItem.findMany({
    where: {
      investorId,
      status: "Funded",
      capitalCall: { entityId },
    },
    select: { amount: true },
  });
  const contributions = fundedLineItems.reduce((sum, li) => sum + li.amount, 0);

  // 4. Distributions = sum of PAID distribution line items for this investor+entity
  const paidDistributions = await prisma.distributionLineItem.findMany({
    where: {
      investorId,
      distribution: { entityId, status: "PAID" },
    },
    select: { netAmount: true },
  });
  const distributions = paidDistributions.reduce(
    (sum, li) => sum + li.netAmount,
    0,
  );

  // 5. Income allocations = pro-rata of income events for this entity
  const incomeEvents = await prisma.incomeEvent.findMany({
    where: { entityId },
    select: { amount: true },
  });
  const totalIncome = incomeEvents.reduce((sum, ev) => sum + ev.amount, 0);
  const incomeAllocations = totalIncome * proRata;

  // 6. Capital allocations = pro-rata of unrealized gains
  //    Use latest NAV computation's economicNAV vs costBasisNAV as proxy
  const navComp = await prisma.nAVComputation.findFirst({
    where: { entityId },
    orderBy: { periodDate: "desc" },
    select: { economicNAV: true, costBasisNAV: true, unrealizedGain: true },
  });
  const unrealizedGains = navComp
    ? (navComp.unrealizedGain ?? Math.max(0, navComp.economicNAV - navComp.costBasisNAV))
    : 0;
  const capitalAllocations = unrealizedGains * proRata;

  // 7. Fees = pro-rata of fee calculations for this entity
  const feeCalcs = await prisma.feeCalculation.findMany({
    where: { entityId },
    select: { managementFee: true, fundExpenses: true, carriedInterest: true },
  });
  const totalFees = feeCalcs.reduce(
    (sum, fc) => sum + fc.managementFee + fc.fundExpenses + fc.carriedInterest,
    0,
  );
  const fees = totalFees * proRata;

  // 8. Beginning balance = last period's endingBalance (or 0)
  const latestAccount = await prisma.capitalAccount.findFirst({
    where: { investorId, entityId },
    orderBy: { periodDate: "desc" },
    select: { endingBalance: true },
  });
  const beginningBalance = latestAccount?.endingBalance ?? 0;

  // 9. Compute the capital account
  const result = computeCapitalAccount(
    beginningBalance,
    contributions,
    incomeAllocations,
    capitalAllocations,
    distributions,
    fees,
  );

  // 10. Upsert with today's date as period
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.capitalAccount.upsert({
    where: { investorId_entityId_periodDate: { investorId, entityId, periodDate: today } },
    create: {
      investorId,
      entityId,
      periodDate: today,
      ...result,
    },
    update: {
      ...result,
    },
  });
}

/**
 * Recompute capital accounts for ALL investors in an entity.
 * Called when a distribution is marked PAID.
 */
export async function recomputeAllInvestorCapitalAccounts(
  entityId: string,
): Promise<void> {
  const commitments = await prisma.commitment.findMany({
    where: { entityId },
    select: { investorId: true },
  });

  for (const { investorId } of commitments) {
    await recomputeCapitalAccountForInvestor(investorId, entityId);
  }
}

/**
 * After any line item status change, auto-recompute the parent capital call's
 * status and fundedPercent.
 */
export async function updateCapitalCallStatus(
  capitalCallId: string,
): Promise<void> {
  const lineItems = await prisma.capitalCallLineItem.findMany({
    where: { capitalCallId },
    select: { status: true },
  });

  const total = lineItems.length;
  const funded = lineItems.filter((li) => li.status === "Funded").length;

  let status: string;
  let fundedPercent: number;

  const capitalCall = await prisma.capitalCall.findUnique({
    where: { id: capitalCallId },
    select: { dueDate: true },
  });

  if (total === 0) {
    // No line items — keep existing status or check overdue
    const isOverdue =
      capitalCall && capitalCall.dueDate < new Date();
    status = isOverdue ? "OVERDUE" : "DRAFT";
    fundedPercent = 0;
  } else if (funded === total) {
    status = "FUNDED";
    fundedPercent = 100;
  } else if (funded > 0) {
    status = "PARTIALLY_FUNDED";
    fundedPercent = Math.round((funded / total) * 100);
  } else {
    // None funded — check if overdue
    const isOverdue =
      capitalCall && capitalCall.dueDate < new Date();
    status = isOverdue ? "OVERDUE" : "ISSUED";
    fundedPercent = 0;
  }

  await prisma.capitalCall.update({
    where: { id: capitalCallId },
    data: { status: status as "DRAFT" | "ISSUED" | "FUNDED" | "PARTIALLY_FUNDED" | "OVERDUE", fundedPercent },
  });
}
