import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { z } from "zod";
import { computeWaterfall, type WaterfallConfig, type InvestorShare } from "@/lib/computations/waterfall";

const CalculateWaterfallSchema = z.object({
  entityId: z.string().min(1, "Entity is required"),
  distributableAmount: z.number().positive("Distributable amount must be positive"),
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

    const { entityId, distributableAmount, saveResults } = data!;

    // Fetch the template with tiers + verify firm via entity link
    const template = await prisma.waterfallTemplate.findFirst({
      where: {
        id: templateId,
        entities: { some: { firmId } },
      },
      include: { tiers: { orderBy: { tierOrder: "asc" } } },
    });
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
      include: { investor: { select: { id: true, name: true } } },
    });
    const totalContributed = commitments.reduce((s, c) => s + c.calledAmount, 0);

    // Build per-investor shares (pro-rata of committed capital)
    const totalCommitted = commitments.reduce((s, c) => s + c.amount, 0);
    const investorShares: InvestorShare[] = totalCommitted > 0
      ? commitments.map((c) => ({
          investorId: c.investorId,
          investorName: c.investor.name,
          proRataShare: c.amount / totalCommitted,
        }))
      : [];

    // Get total prior distributions for this entity
    const priorDist = await prisma.distributionEvent.aggregate({
      where: { entityId, status: "PAID" },
      _sum: { netToLPs: true },
    });
    const totalDistributedPrior = priorDist._sum.netToLPs ?? 0;

    // Calculate years outstanding from first capital call
    const firstCall = await prisma.capitalCall.findFirst({
      where: { entityId },
      orderBy: { callDate: "asc" },
      select: { callDate: true },
    });
    const yearsOutstanding = firstCall
      ? (Date.now() - firstCall.callDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      : 1;

    // Build waterfall config from template fields
    const waterfallConfig: WaterfallConfig = {
      carryPercent: template.carryPercent ?? 0.20,
      prefReturnCompounding:
        (template.prefReturnCompounding as "SIMPLE" | "COMPOUND") ?? "SIMPLE",
      prefReturnOffsetByDistributions: template.prefReturnOffsetByDistributions ?? false,
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
    console.error("[waterfall-templates/calculate]", err);
    return NextResponse.json({ error: "Waterfall calculation failed" }, { status: 500 });
  }
}
