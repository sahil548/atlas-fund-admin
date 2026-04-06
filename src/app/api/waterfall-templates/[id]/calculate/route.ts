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

    // Detect GP investors using multiple methods:
    // 1. Unit class assignments on ANY entity in the firm (GP in one fund = GP everywhere)
    // 2. Investor type field containing "gp", "general partner", or "fund manager"
    // 3. Investor name matching a GP_ENTITY or HOLDING_COMPANY entity name (normalized)
    // 4. Investor name contains GP indicators like "(gp)"
    const gpInvestorIds = new Set<string>();

    // Helper: normalize entity/investor names for comparison
    // Strips LLC, LP, Inc, commas, periods, extra spaces for fuzzy matching
    const normalizeName = (name: string): string =>
      name.toLowerCase()
        .replace(/[,.\-()]/g, " ")
        .replace(/\b(llc|lp|inc|corp|ltd|co|company|the)\b/g, "")
        .replace(/\s+/g, " ")
        .trim();

    // Method 1: Check unit classes across ALL firm entities
    const allGPUnitClasses = await prisma.unitClass.findMany({
      where: {
        entity: { firmId },
        classType: { in: ["GP_UNIT", "CARRIED_INTEREST"] },
      },
      include: {
        ownershipUnits: {
          where: { status: "ACTIVE" },
          select: { investorId: true },
        },
      },
    });
    for (const uc of allGPUnitClasses) {
      for (const ou of uc.ownershipUnits) {
        gpInvestorIds.add(ou.investorId);
      }
    }

    // Method 2 & 3: Name/type fallback for investors not caught by unit classes
    // Find GP entities AND holding companies (GP may be stored as either type)
    const gpCandidateEntities = await prisma.entity.findMany({
      where: {
        firmId,
        entityType: { in: ["GP_ENTITY", "HOLDING_COMPANY"] },
      },
      select: { name: true, entityType: true },
    });
    const gpEntityNames = gpCandidateEntities.map((e) => e.name.toLowerCase()).filter(Boolean);
    const gpEntityNamesNormalized = gpCandidateEntities.map((e) => normalizeName(e.name)).filter(Boolean);

    // Method 5: Match investor names against ALL non-fund entities in the firm
    // If an investor shares a name with an entity that isn't a fund, it's likely the GP/manager
    const allFirmEntities = await prisma.entity.findMany({
      where: { firmId },
      select: { name: true, entityType: true },
    });
    const nonFundEntityNames = allFirmEntities
      .filter((e) => !["MAIN_FUND", "SIDECAR", "SPV", "CO_INVEST_VEHICLE"].includes(e.entityType))
      .map((e) => normalizeName(e.name))
      .filter(Boolean);

    // Build per-investor shares (pro-rata of committed capital)
    const totalCommitted = commitments.reduce((s, c) => s + c.amount, 0);
    const gpDetectionLog: Array<{ investor: string; method: string }> = [];
    const investorShares: InvestorShare[] = totalCommitted > 0
      ? commitments.map((c) => {
          // Already detected via unit classes?
          let isGP = gpInvestorIds.has(c.investorId);
          if (isGP) gpDetectionLog.push({ investor: c.investor.name, method: "unit_class" });

          // Fallback: check investor type and name
          if (!isGP) {
            const investorType = (c.investor.investorType ?? "").toLowerCase();
            const investorName = (c.investor.name ?? "").toLowerCase();
            const investorNameNorm = normalizeName(c.investor.name ?? "");

            // Check investor type field (use includes for robustness against whitespace/casing)
            if (investorType.includes("gp") ||
                investorType.includes("general partner") ||
                investorType.includes("fund manager") ||
                investorType.includes("fund_manager")) {
              isGP = true;
              gpDetectionLog.push({ investor: c.investor.name, method: "investor_type:" + investorType });
            }

            // Check exact substring match against GP entity names
            if (!isGP && gpEntityNames.some((gpName) =>
              investorName.includes(gpName) || gpName.includes(investorName)
            )) {
              isGP = true;
              gpDetectionLog.push({ investor: c.investor.name, method: "name_exact_match" });
            }

            // Check normalized name match (strips LLC, LP, commas, etc.)
            if (!isGP && investorNameNorm.length > 2 && gpEntityNamesNormalized.some((gpNorm) =>
              investorNameNorm.includes(gpNorm) || gpNorm.includes(investorNameNorm)
            )) {
              isGP = true;
              gpDetectionLog.push({ investor: c.investor.name, method: "name_normalized_match" });
            }

            // Method 5: investor name matches a non-fund entity in the firm
            if (!isGP && investorNameNorm.length > 2 && nonFundEntityNames.some((entNorm) =>
              investorNameNorm.includes(entNorm) || entNorm.includes(investorNameNorm)
            )) {
              isGP = true;
              gpDetectionLog.push({ investor: c.investor.name, method: "non_fund_entity_match" });
            }

            // Direct GP indicators in investor name
            if (!isGP && investorName.includes("(gp)")) {
              isGP = true;
              gpDetectionLog.push({ investor: c.investor.name, method: "name_gp_indicator" });
            }
          }

          if (isGP) gpInvestorIds.add(c.investorId);

          return {
            investorId: c.investorId,
            investorName: c.investor.name,
            proRataShare: c.amount / totalCommitted,
            isGP,
          };
        })
      : [];

    // Total committed (LP-only): used for preferred return calculation
    // GP commitments should not count toward the pref hurdle
    // Use committed amount (not calledAmount) — pref accrues on committed capital
    const gpIds = new Set(investorShares.filter((s) => s.isGP).map((s) => s.investorId));
    const totalContributed = commitments
      .filter((c) => !gpIds.has(c.investorId))
      .reduce((s, c) => s + c.amount, 0);

    // Calculate years outstanding using 30/360 day count convention
    // Every month = 30 days, year = 360 days
    // Jan 1 to Sep 30 = 9 × 30 = 270 days → 270/360 = 0.75
    const distYear = distDate.getUTCFullYear();
    const distMonth = distDate.getUTCMonth(); // 0-indexed (Jan=0, Sep=8)
    const distDay = Math.min(distDate.getUTCDate(), 30); // cap at 30 for 30/360
    const yearStart = new Date(Date.UTC(distYear, 0, 1));
    // 30/360: days = months * 30 + day adjustment
    const days30_360 = distMonth * 30 + distDay;
    const yearsOutstanding = days30_360 / 360;

    // Get prior distributions to LP investors only for the current calendar year
    // Use grossAmount (total received) not netAmount (which may be net of carry)
    const priorDistLineItems = await prisma.distributionLineItem.findMany({
      where: {
        distribution: {
          entityId,
          distributionDate: { gte: yearStart, lte: distDate },
        },
      },
      select: { investorId: true, grossAmount: true },
    });
    const totalDistributedPrior = priorDistLineItems
      .filter((li) => !gpIds.has(li.investorId))
      .reduce((s, li) => s + li.grossAmount, 0);

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
      // Debug: calculation inputs
      _debug: {
        yearsOutstanding,
        days30_360: days30_360,
        dayCountMethod: "30/360",
        prefBeforeOffset: totalContributed * (template.tiers.find(t => (t.hurdleRate ?? 0) > 0)?.hurdleRate ?? 8) / 100 * yearsOutstanding,
        lpCommitments: commitments
          .filter(c => !gpIds.has(c.investorId))
          .map(c => ({ name: c.investor.name, type: c.investor.investorType, committed: c.amount, called: c.calledAmount })),
        gpCommitments: commitments
          .filter(c => gpIds.has(c.investorId))
          .map(c => ({ name: c.investor.name, type: c.investor.investorType, committed: c.amount, called: c.calledAmount })),
        gpDetectedIds: Array.from(gpIds),
        gpDetectionLog,
        gpCandidateEntities: gpCandidateEntities.map(e => ({ name: e.name, type: e.entityType, normalized: normalizeName(e.name) })),
        nonFundEntities: allFirmEntities.filter(e => !["MAIN_FUND", "SIDECAR", "SPV", "CO_INVEST_VEHICLE"].includes(e.entityType)).map(e => ({ name: e.name, type: e.entityType, normalized: normalizeName(e.name) })),
        allInvestorNames: commitments.map(c => ({ name: c.investor.name, type: c.investor.investorType, normalized: normalizeName(c.investor.name) })),
        priorDistCount: priorDistLineItems.length,
        priorDistLPTotal: totalDistributedPrior,
      },
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
