import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { z } from "zod";
import { computeWaterfall } from "@/lib/computations/waterfall";

const CalculateWaterfallSchema = z.object({
  entityId: z.string().min(1, "Entity is required"),
  distributableAmount: z.number().positive("Distributable amount must be positive"),
});

/**
 * POST /api/waterfall-templates/[id]/calculate
 *
 * Runs a waterfall calculation for a template against an entity's actual data.
 * Stores the result in WaterfallCalculation.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params;
  const { data, error } = await parseBody(req, CalculateWaterfallSchema);
  if (error) return error;

  const { entityId, distributableAmount } = data!;

  // Fetch the template with tiers
  const template = await prisma.waterfallTemplate.findUnique({
    where: { id: templateId },
    include: { tiers: { orderBy: { tierOrder: "asc" } } },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Get entity name + data for context
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { name: true },
  });
  const entityName = entity?.name ?? "Unknown Entity";

  const commitments = await prisma.commitment.findMany({
    where: { entityId },
  });
  const totalContributed = commitments.reduce((s, c) => s + c.calledAmount, 0);

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

  // Run the waterfall calculation
  const tiers = template.tiers.map((t) => ({
    tierOrder: t.tierOrder,
    name: t.name,
    splitLP: t.splitLP ?? 0,
    splitGP: t.splitGP ?? 0,
    hurdleRate: t.hurdleRate,
    appliesTo: t.appliesTo,
  }));

  const result = computeWaterfall(
    tiers,
    distributableAmount,
    totalContributed,
    totalDistributedPrior,
    yearsOutstanding
  );

  // Store the result
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
        calculatedAt: new Date().toISOString(),
      })),
    },
  });

  return NextResponse.json({
    id: calculation.id,
    templateName: template.name,
    entityName,
    distributableAmount,
    totalContributed,
    totalDistributedPrior,
    tiers: result.tiers,
    totalLP: result.totalLP,
    totalGP: result.totalGP,
  });
}
