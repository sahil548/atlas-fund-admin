import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { z } from "zod";
import { computeWaterfall, type WaterfallConfig, type InvestorShare } from "@/lib/computations/waterfall";
import { logger } from "@/lib/logger";

const CalculateWaterfallSchema = z.object({
  entityId: z.string().min(1, "Entity is required"),
  distributableAmount: z.number().positive("Distributable amount must be positive"),
  distributionDate: z.string().optional(),
  saveResults: z.boolean().default(true),
});

/**
 * POST /api/waterfall-templates/[id]/calculate
 *
 * Runs a waterfall calculation for a template against an entity's actual data.
 * Optionally stores the result in WaterfallCalculation (saveResults=true).
 * Returns per-investor breakdown and clawback liability.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();
    const { firmId } = authUser;

    const { id: templateId } = await params;
    const { data, error } = await parseBody(req, CalculateWaterfallSchema);
    if (error) return error;

    const { entityId, distributableAmount, distributionDate: distDateStr, saveResults } = data!;
    const distDate = distDateStr ? new Date(distDateStr + "T00:00:00Z") : new Date();

    // Fetch the template with tiers — try firm-linked first, then any template by ID
    let template = await prisma.waterfallTemplate.findFirst({
      where: {
        id: templateId,
        entities: { some: { firmId } },
      },
      include: { tiers: { orderBy: { tierOrder: "asc" } } },
    });
    // Fallback: template may exist but not be linked to any entity yet
    if (!template) {
      template = await prisma.waterfallTemplate.findFirst({
        where: { id: templateId },
        include: { tiers: { orderBy: { tierOrder: "asc" } } },
      });
    }
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Get entity name + verify entity belongs to firm
    const entity = await prisma.entity.findFirst({
      where: { id: entityId, firmId },
      select: { name: true },
    });
    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }
    const entityName = entity.name;

    // Fetch commitments for total contributed + per-investor breakdown
    const commitments = await prisma.commitment.findMany({
      where: { entityId },
      include: { investor: { select: { id: true, name: true, investorType: true } } },
    });
    // totalContributed calculated below after GP detection (LP-only for pref calculation)

    // Fetch unit class assignments to determine GP vs LP status
    // An investor with units in a GP_UNIT class is considered GP
    const unitClasses = await prisma.unitClass.findMany({
      where: { entityId },
      include: {
        ownershipUnits: {
          where: { status: "ACTIVE" },
          select: { investorId: true },
        },
      },
    });

    // Build set of investor IDs that hold GP_UNIT class units
    const gpInvestorIds = new Set<string>();
    for (const uc of unitClasses) {
      if (uc.classType === "GP_UNIT" || uc.classType === "CARRIED_INTEREST") {
        for (const ou of uc.ownershipUnits) {
          gpInvestorIds.add(ou.investorId);
        }
      }
    }

    // Fallback: if no unit classes exist, detect GP by investor type or entity name
    let useNameFallback = gpInvestorIds.size === 0;
    let gpEntityName = "";
    if (useNameFallback) {
      const gpEntity = await prisma.entity.findFirst({
        where: { firmId, entityType: "GP_ENTITY" },
        select: { name: true },
      });
      gpEntityName = gpEntity?.name?.toLowerCase() ?? "";
    }

    // Build per-investor shares (pro-rata of committed capital)
    const totalCommitted = commitments.reduce((s, c) => s + c.amount, 0);
    const investorShares: InvestorShare[] = totalCommitted > 0
      ? commitments.map((c) => {
          let isGP: boolean;
          if (!useNameFallback) {
            // Primary: use unit class assignment
            isGP = gpInvestorIds.has(c.investorId);
          } else {
            // Fallback: use investor type or GP entity name matching
            const investorType = (c.investor.investorType ?? "").toLowerCase();
            const investorName = (c.investor.name ?? "").toLowerCase();
            isGP = investorType.includes("gp") ||
              investorType === "general partner" ||
              (gpEntityName !== "" && investorName.includes(gpEntityName)) ||
              (gpEntityName !== "" && gpEntityName.includes(investorName));
          }
          return {
            investorId: c.investorId,
            investorName: c.investor.name,
            proRataShare: c.amount / totalCommitted,
            isGP,
          };
        })
      : [];

    // Total contributed: LP-only for preferred return calculation
    // GP contributions should not count toward the pref hurdle
    const gpIds = new Set(investorShares.filter((s) => s.isGP).map((s) => s.investorId));
    const totalContributed = commitments
      .filter((c) => !gpIds.has(c.investorId))
      .reduce((s, c) => s + c.calledAmount, 0);

    // Calculate years outstanding as fraction of current year through distribution date
    // Preferred return is annual and non-cumulative (resets each calendar year)
    const distYear = distDate.getUTCFullYear();
    const yearStart = new Date(Date.UTC(distYear, 0, 1));
    const yearEnd = new Date(Date.UTC(distYear + 1, 0, 1));
    const totalDaysInYear = (yearEnd.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000);
    const daysThroughDist = (distDate.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000);
    const yearsOutstanding = daysThroughDist / totalDaysInYear;

    // Get prior distributions to LP investors only for the current calendar year
    // Use line items to accurately sum what LP investors received (exclude GP)
    const priorDistLineItems = await prisma.distributionLineItem.findMany({
      where: {
        distribution: {
          entityId,
          distributionDate: { gte: yearStart, lt: distDate },
        },
      },
      select: { investorId: true, netAmount: true },
    });
    const totalDistributedPrior = priorDistLineItems
      .filter((li) => !gpIds.has(li.investorId))
      .reduce((s, li) => s + li.netAmount, 0);

    // Build waterfall config from template fields
    // Always offset pref by prior distributions since we scope to the current year
    const waterfallConfig: WaterfallConfig = {
      carryPercent: template.carryPercent ?? 0.20,
      prefReturnCompounding:
        (template.prefReturnCompounding as "SIMPLE" | "COMPOUND") ?? "SIMPLE",
      prefReturnOffsetByDistributions: true,
      incomeCountsTowardPref: template.incomeCountsTowardPref ?? false,
      gpCoInvestPercent: template.gpCoInvestPercent ?? 0,
    };

    // Map tier inputs
    const tiers = template.tiers.map((t) => ({
      tierOrder: t.tierOrder,
      name: t.name,
      splitLP: t.splitLP ?? 0,
      splitGP: t.splitGP ?? 0,
      hurdleRate: t.hurdleRate,
      appliesTo: t.appliesTo,
    }));

    // Run the waterfall calculation with config + per-investor breakdown
    const result = computeWaterfall(
      tiers,
      distributableAmount,
      totalContributed,
      totalDistributedPrior,
      yearsOutstanding,
      waterfallConfig,
      investorShares.length > 0 ? investorShares : undefined,
    );

    // Optionally save the result
    let calculationId: string | undefined;
    if (saveResults) {
      const calculation = await prisma.waterfallCalculation.create({
        data: {
          templateId,
          periodDate: new Date(),
          results: JSON.parse(JSON.stringify({
            ...result,
            entityId,
            distributableAmount,
            totalContributed,
            totalDistributedPrior,
            yearsOutstanding,
            config: waterfallConfig,
            calculatedAt: new Date().toISOString(),
          })),
        },
      });
      calculationId = calculation.id;
    }

    return NextResponse.json({
      id: calculationId,
      templateName: template.name,
      entityName,
      distributableAmount,
      totalContributed,
      totalDistributedPrior,
      // Tier breakdown
      tiers: result.tiers,
      // Summary
      summary: {
        totalLP: result.totalLP,
        totalGP: result.totalGP,
        lpPercent: distributableAmount > 0
          ? (result.totalLP / distributableAmount) * 100
          : 0,
        gpPercent: distributableAmount > 0
          ? (result.totalGP / distributableAmount) * 100
          : 0,
        clawbackLiability: result.clawbackLiability,
      },
      // Backward compat fields
      totalLP: result.totalLP,
      totalGP: result.totalGP,
      clawbackLiability: result.clawbackLiability,
      gpCoInvestAllocation: result.gpCoInvestAllocation,
      // Per-investor breakdown
      perInvestorBreakdown: result.perInvestorBreakdown ?? [],
      // Template fee config summary
      feeConfig: {
        managementFeeRate: template.managementFeeRate,
        feeBasis: template.feeBasis,
        carryPercent: template.carryPercent ?? 0.20,
        prefReturnCompounding: template.prefReturnCompounding ?? "SIMPLE",
        prefReturnOffsetByDistributions: template.prefReturnOffsetByDistributions,
        gpCoInvestPercent: template.gpCoInvestPercent,
      },
    });
  } catch (err) {
    logger.error("[waterfall-templates/calculate]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Waterfall calculation failed" }, { status: 500 });
  }
}
