import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { z } from "zod";
import { calculateFees, type FeeConfig, type FeeInputs } from "@/lib/computations/fee-engine";
import { integrateSideLetterWithFeeCalc, type AdjustedFeeResult } from "@/lib/computations/side-letter-engine";
import { logger } from "@/lib/logger";

const CalculateFeesSchema = z.object({
  entityId: z.string().min(1, "Entity is required"),
  periodDate: z.string().min(1, "Period date is required"),
  fundExpenses: z.number().default(0),
  periodFraction: z.number().positive().default(0.25),
});

/**
 * POST /api/fees/calculate
 *
 * Calculate management fees and carried interest for a given entity and period.
 * Reads fee config from the entity's waterfall template.
 * Upserts a FeeCalculation record for the entity + periodDate.
 */
export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();
    const { firmId } = authUser;

    const { data, error } = await parseBody(req, CalculateFeesSchema);
    if (error) return error;

    const { entityId, periodDate, fundExpenses, periodFraction } = data!;

    // Fetch entity with waterfall template (fee config) + verify firm
    const entity = await prisma.entity.findFirst({
      where: { id: entityId, firmId },
      include: {
        waterfallTemplate: {
          select: {
            id: true,
            name: true,
            managementFeeRate: true,
            feeBasis: true,
          },
        },
      },
    });

    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    // Get fee config from waterfall template
    const template = entity.waterfallTemplate;
    const managementFeeRate = template?.managementFeeRate ?? 0.02; // default 2%
    const feeBasis = (template?.feeBasis as FeeConfig["feeBasis"]) ?? "COMMITTED_CAPITAL";

    // Fetch commitment aggregates for this entity
    const commitments = await prisma.commitment.findMany({
      where: { entityId },
    });
    const totalCommitments = commitments.reduce((s, c) => s + c.amount, 0);
    const totalCalled = commitments.reduce((s, c) => s + c.calledAmount, 0);

    // Get entity NAV from latest NAV computation
    const latestNAV = await prisma.nAVComputation.findFirst({
      where: { entityId },
      orderBy: { periodDate: "desc" },
    });
    const entityNAV = latestNAV?.economicNAV ?? 0;

    // Get latest waterfall calculation GP carry amount for this entity's template
    let waterfallGPAllocation = 0;
    if (template) {
      const latestCalc = await prisma.waterfallCalculation.findFirst({
        where: { templateId: template.id },
        orderBy: { periodDate: "desc" },
      });
      if (latestCalc && latestCalc.results) {
        const results = latestCalc.results as Record<string, unknown>;
        waterfallGPAllocation = (results.totalGP as number) ?? 0;
      }
    }

    const feeConfig: FeeConfig = {
      managementFeeRate,
      feeBasis,
      periodFraction,
    };

    const feeInputs: FeeInputs = {
      totalCommitments,
      totalCalled,
      entityNAV,
      fundExpenses,
      waterfallGPAllocation,
    };

    const feeResult = calculateFees(feeConfig, feeInputs);

    // Apply per-investor side letter adjustments (informational only — does not modify base fee)
    type PerInvestorAdjustment = AdjustedFeeResult & { investorId: string };
    const perInvestorAdjustments: PerInvestorAdjustment[] = [];
    try {
      for (const commitment of commitments) {
        const adjusted = await integrateSideLetterWithFeeCalc(
          commitment.investorId,
          entityId,
          feeResult,
        );
        perInvestorAdjustments.push({ investorId: commitment.investorId, ...adjusted });
      }
    } catch (sideLetterErr) {
      // Side letter query failure must NOT break base fee calculation
      logger.error("[fees/calculate] Side letter integration failed (non-fatal):", { error: sideLetterErr instanceof Error ? sideLetterErr.message : String(sideLetterErr) });
    }

    // Upsert FeeCalculation record for entity + periodDate
    const periodDateObj = new Date(periodDate);
    const existing = await prisma.feeCalculation.findFirst({
      where: {
        entityId,
        periodDate: periodDateObj,
      },
    });

    const calculationData = {
      managementFee: feeResult.managementFee,
      fundExpenses: feeResult.fundExpenses,
      carriedInterest: feeResult.carriedInterest,
      details: JSON.parse(JSON.stringify({
        ...feeResult,
        config: { managementFeeRate, feeBasis, periodFraction },
        inputs: { totalCommitments, totalCalled, entityNAV, waterfallGPAllocation },
        calculatedAt: new Date().toISOString(),
        perInvestorAdjustments,
      })),
    };

    let feeCalc;
    if (existing) {
      feeCalc = await prisma.feeCalculation.update({
        where: { id: existing.id },
        data: calculationData,
      });
    } else {
      feeCalc = await prisma.feeCalculation.create({
        data: {
          entityId,
          periodDate: periodDateObj,
          ...calculationData,
        },
      });
    }

    return NextResponse.json({
      id: feeCalc.id,
      entityId,
      entityName: entity.name,
      periodDate,
      templateName: template?.name ?? null,
      ...feeResult,
      perInvestorAdjustments,
    });
  } catch (err) {
    logger.error("[fees/calculate]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Fee calculation failed" }, { status: 500 });
  }
}
