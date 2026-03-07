import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // Verify investor exists (and optionally belongs to the firm via their commitments)
    const investor = await prisma.investor.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        commitments: {
          include: {
            entity: { select: { id: true, name: true, firmId: true } },
          },
        },
      },
    });

    if (!investor) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Filter commitments to firm entities only if firmId is present
    const validCommitments = firmId
      ? investor.commitments.filter((c) => c.entity.firmId === firmId)
      : investor.commitments;

    const validEntityIds = validCommitments.map((c) => c.entityId);
    const entityMap = new Map(
      validCommitments.map((c) => [c.entityId, c.entity])
    );

    if (validEntityIds.length === 0) {
      return NextResponse.json({
        investorId: investor.id,
        investorName: investor.name,
        ledger: [],
        entities: [],
      });
    }

    // Fetch capital call line items (funded ones)
    const capitalCallLineItems = await prisma.capitalCallLineItem.findMany({
      where: {
        investorId: id,
        status: "Funded",
        paidDate: { not: null },
        capitalCall: { entityId: { in: validEntityIds } },
      },
      include: {
        capitalCall: {
          select: {
            entityId: true,
            callNumber: true,
            callDate: true,
          },
        },
      },
      orderBy: { paidDate: "asc" },
    });

    // Fetch distribution line items for PAID distributions
    const distributionLineItems = await prisma.distributionLineItem.findMany({
      where: {
        investorId: id,
        distribution: {
          entityId: { in: validEntityIds },
          status: "PAID",
        },
      },
      include: {
        distribution: {
          select: {
            entityId: true,
            distributionDate: true,
            source: true,
            distributionType: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Fetch fee calculations for entities this investor is committed to
    const feeCalculations = await prisma.feeCalculation.findMany({
      where: { entityId: { in: validEntityIds } },
      orderBy: { periodDate: "asc" },
    });

    // Build raw ledger entries per entity
    interface LedgerEntry {
      date: Date;
      type: "CONTRIBUTION" | "DISTRIBUTION" | "FEE" | "INCOME";
      entityId: string;
      entityName: string;
      description: string;
      amount: number;
    }

    const rawEntries: LedgerEntry[] = [];

    // Contributions (negative = money going out from LP perspective, but we track as positive contribution)
    for (const li of capitalCallLineItems) {
      const entityName =
        entityMap.get(li.capitalCall.entityId)?.name ?? li.capitalCall.entityId;
      rawEntries.push({
        date: new Date(li.paidDate!),
        type: "CONTRIBUTION",
        entityId: li.capitalCall.entityId,
        entityName,
        description: `Capital Call #${li.capitalCall.callNumber}`,
        amount: -li.amount, // outflow from LP perspective (negative)
      });
    }

    // Distributions (positive = money coming in to LP)
    for (const li of distributionLineItems) {
      const entityName =
        entityMap.get(li.distribution.entityId)?.name ?? li.distribution.entityId;
      rawEntries.push({
        date: new Date(li.distribution.distributionDate),
        type: "DISTRIBUTION",
        entityId: li.distribution.entityId,
        entityName,
        description:
          li.distribution.source ||
          li.distribution.distributionType ||
          "Distribution",
        amount: li.netAmount,
      });
    }

    // Fees (pro-rata share of management fees)
    for (const fee of feeCalculations) {
      const totalCommitmentForEntity = validCommitments.find(
        (c) => c.entityId === fee.entityId
      );
      if (!totalCommitmentForEntity) continue;

      // Get total commitments for the entity to compute pro-rata share
      const entityTotalCommitments = await prisma.commitment.aggregate({
        where: { entityId: fee.entityId },
        _sum: { amount: true },
      });
      const totalEntityAmount = entityTotalCommitments._sum.amount || 0;
      const proRata =
        totalEntityAmount > 0
          ? totalCommitmentForEntity.amount / totalEntityAmount
          : 0;

      const feeAmount = fee.managementFee * proRata;
      if (feeAmount <= 0) continue;

      const entityName = entityMap.get(fee.entityId)?.name ?? fee.entityId;
      rawEntries.push({
        date: new Date(fee.periodDate),
        type: "FEE",
        entityId: fee.entityId,
        entityName,
        description: `Management Fee`,
        amount: -feeAmount,
      });
    }

    // Sort all entries chronologically
    rawEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Compute running balance
    let runningBalance = 0;
    const ledger = rawEntries.map((entry) => {
      runningBalance += entry.amount;
      return {
        date: entry.date.toISOString(),
        type: entry.type,
        entityId: entry.entityId,
        entityName: entry.entityName,
        description: entry.description,
        amount: entry.amount,
        runningBalance,
      };
    });

    // Build per-entity summary
    const entitySummaries = validCommitments.map((commitment) => {
      const entityEntries = rawEntries.filter(
        (e) => e.entityId === commitment.entityId
      );
      const totalContributed = entityEntries
        .filter((e) => e.type === "CONTRIBUTION")
        .reduce((sum, e) => sum + Math.abs(e.amount), 0);
      const totalDistributed = entityEntries
        .filter((e) => e.type === "DISTRIBUTION")
        .reduce((sum, e) => sum + e.amount, 0);
      const totalFees = entityEntries
        .filter((e) => e.type === "FEE")
        .reduce((sum, e) => sum + Math.abs(e.amount), 0);
      const currentBalance = entityEntries.reduce((sum, e) => sum + e.amount, 0);

      return {
        entityId: commitment.entityId,
        entityName: commitment.entity.name,
        commitment: commitment.amount,
        currentBalance,
        totalContributed,
        totalDistributed,
        totalFees,
      };
    });

    return NextResponse.json({
      investorId: investor.id,
      investorName: investor.name,
      ledger,
      entities: entitySummaries,
    });
  } catch (err) {
    console.error("[investors/capital-account]", err);
    return NextResponse.json(
      { error: "Failed to load capital account" },
      { status: 500 }
    );
  }
}
