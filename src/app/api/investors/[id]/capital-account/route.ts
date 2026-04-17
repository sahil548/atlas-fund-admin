import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { xirr } from "@/lib/computations/irr";
import { computeMetrics } from "@/lib/computations/metrics";
import { logger } from "@/lib/logger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser();
    const firmId = authUser?.firmId;

    // Parse optional date range query params
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;

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

    // Build date filter objects
    const hasDateRange = !!(startDate && endDate);
    const callDateFilter = hasDateRange
      ? { paidDate: { gte: new Date(startDate!), lte: new Date(endDate!) } }
      : { paidDate: { not: null } };

    // Fetch capital call line items (funded ones with optional date filter)
    const capitalCallLineItems = await prisma.capitalCallLineItem.findMany({
      where: {
        investorId: id,
        status: "Funded",
        ...callDateFilter,
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

    // Build distribution date filter
    const distWhereBase: Record<string, unknown> = {
      entityId: { in: validEntityIds },
      status: "PAID",
    };
    if (hasDateRange) {
      distWhereBase.distributionDate = {
        gte: new Date(startDate!),
        lte: new Date(endDate!),
      };
    }

    // Fetch distribution line items for PAID distributions
    const distributionLineItems = await prisma.distributionLineItem.findMany({
      where: {
        investorId: id,
        distribution: distWhereBase,
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

    // Build fee date filter
    const feeWhereBase: Record<string, unknown> = {
      entityId: { in: validEntityIds },
    };
    if (hasDateRange) {
      feeWhereBase.periodDate = {
        gte: new Date(startDate!),
        lte: new Date(endDate!),
      };
    }

    // Fetch fee calculations for entities this investor is committed to
    const feeCalculations = await prisma.feeCalculation.findMany({
      where: feeWhereBase,
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

    // Build distribution breakdown lookup: entityId -> { returnOfCapital, income, longTermGain }
    // This aggregates subcategory amounts from DistributionLineItem for PAID distributions.
    // netAmount = grossAmount - carriedInterest (carry goes to GP, not LP).
    // Invariant enforced: returnOfCapital + income + longTermGain === netAmount (within float tolerance).
    const distributionBreakdownMap = new Map<
      string,
      { returnOfCapital: number; income: number; longTermGain: number }
    >();
    for (const entityId of validEntityIds) {
      distributionBreakdownMap.set(entityId, {
        returnOfCapital: 0,
        income: 0,
        longTermGain: 0,
      });
    }
    for (const li of distributionLineItems) {
      const entityId = li.distribution.entityId;
      const bd = distributionBreakdownMap.get(entityId);
      if (!bd) continue;
      bd.returnOfCapital += li.returnOfCapital ?? 0;
      bd.income += li.income ?? 0;
      bd.longTermGain += li.longTermGain ?? 0;
    }

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

      const rawBreakdown = distributionBreakdownMap.get(commitment.entityId) ?? {
        returnOfCapital: 0,
        income: 0,
        longTermGain: 0,
      };

      // Clamp breakdown so it always sums to totalDistributed (floating-point safety).
      // If a data anomaly causes breakdown to diverge, income absorbs the difference
      // so the display stays internally consistent. Log any anomaly for follow-up.
      const breakdownSum =
        rawBreakdown.returnOfCapital + rawBreakdown.income + rawBreakdown.longTermGain;
      const diff = breakdownSum - totalDistributed;
      const distributionBreakdown =
        Math.abs(diff) < 0.01
          ? rawBreakdown
          : {
              returnOfCapital: rawBreakdown.returnOfCapital,
              income: rawBreakdown.income - diff, // clamp income to absorb float drift
              longTermGain: rawBreakdown.longTermGain,
            };

      if (Math.abs(diff) >= 0.01) {
        logger.warn("[investors/capital-account] breakdown drift clamped", {
          entityId: commitment.entityId,
          breakdownSum,
          totalDistributed,
          diff,
        });
      }

      return {
        entityId: commitment.entityId,
        entityName: commitment.entity.name,
        commitment: commitment.amount,
        currentBalance,
        totalContributed,
        totalDistributed,
        totalFees,
        distributionBreakdown,
      };
    });

    // Compute period-scoped metrics when date range is active
    let periodMetrics: {
      irr: number | null;
      tvpi: number | null;
      dpi: number | null;
      rvpi: number | null;
    } | undefined;

    if (hasDateRange) {
      const periodTotalContributed = rawEntries
        .filter((e) => e.type === "CONTRIBUTION")
        .reduce((sum, e) => sum + Math.abs(e.amount), 0);
      const periodTotalDistributed = rawEntries
        .filter((e) => e.type === "DISTRIBUTION")
        .reduce((sum, e) => sum + e.amount, 0);
      const periodBalance = rawEntries.reduce((sum, e) => sum + e.amount, 0);

      const periodMetricsCalc = computeMetrics(
        periodTotalContributed,
        periodTotalDistributed,
        Math.max(0, periodBalance)
      );

      // Compute period IRR from scoped cash flows
      const periodCashFlows: { date: Date; amount: number }[] = [];
      for (const entry of rawEntries) {
        if (entry.type === "CONTRIBUTION") {
          periodCashFlows.push({ date: entry.date, amount: entry.amount }); // already negative
        } else if (entry.type === "DISTRIBUTION") {
          periodCashFlows.push({ date: entry.date, amount: entry.amount }); // positive
        }
      }
      // Terminal value: ending balance at endDate
      if (periodBalance > 0) {
        periodCashFlows.push({ date: new Date(endDate!), amount: periodBalance });
      }

      const periodIrr = periodCashFlows.length >= 2 ? xirr(periodCashFlows) : null;

      periodMetrics = {
        irr: periodIrr,
        tvpi: periodMetricsCalc.tvpi,
        dpi: periodMetricsCalc.dpi,
        rvpi: periodMetricsCalc.rvpi,
      };
    }

    const response: Record<string, unknown> = {
      investorId: investor.id,
      investorName: investor.name,
      ledger,
      entities: entitySummaries,
    };

    if (periodMetrics !== undefined) {
      response.periodMetrics = periodMetrics;
    }

    return NextResponse.json(response);
  } catch (err) {
    logger.error("[investors/capital-account]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to load capital account" },
      { status: 500 }
    );
  }
}
