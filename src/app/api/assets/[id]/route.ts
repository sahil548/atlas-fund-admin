import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateAssetSchema } from "@/lib/schemas";
import { Prisma } from "@prisma/client";
import { ProjectedMetricsSchema } from "@/lib/json-schemas";
import { getAuthUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      sourceDeal: {
        select: {
          id: true,
          name: true,
          assetClass: true,
          stage: true,
          targetSize: true,
          targetReturn: true,
          counterparty: true,
          dealMetadata: true,
          dealLeadId: true,
          dealLead: { select: { id: true, name: true, initials: true } },
          screeningResult: {
            select: {
              score: true,
              summary: true,
              strengths: true,
              risks: true,
              recommendation: true,
              memo: true,
              memoGeneratedAt: true,
              ddFindings: true,
            },
          },
          workstreams: {
            include: {
              tasks: true,
            },
          },
          icProcess: { include: { votes: true } },
        },
      },
      entityAllocations: { include: { entity: true } },
      equityDetails: true,
      creditDetails: true,
      realEstateDetails: true,
      fundLPDetails: true,
      leases: true,
      creditAgreements: { include: { covenants: true, payments: { orderBy: { date: "desc" } } } },
      valuations: { orderBy: { valuationDate: "desc" } },
      tasks: { orderBy: { dueDate: "asc" } },
      documents: { orderBy: { uploadDate: "desc" } },
      meetings: { orderBy: { meetingDate: "desc" } },
      incomeEvents: { orderBy: { date: "desc" } },
      expenses: { orderBy: { date: "desc" } },
      activityEvents: { orderBy: { eventDate: "desc" } },
    },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Sanitize high-risk JSON blob field: projectedMetrics
  const safeProjMetrics = ProjectedMetricsSchema.safeParse(asset.projectedMetrics);
  const sanitizedAsset = {
    ...asset,
    projectedMetrics: safeProjMetrics.success ? safeProjMetrics.data : null,
  };

  return NextResponse.json(sanitizedAsset);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await parseBody(req, UpdateAssetSchema);
  if (error) return error;
  const { projectedMetrics, nextReview, ...rest } = data!;
  const asset = await prisma.asset.update({
    where: { id },
    data: {
      ...rest,
      ...(projectedMetrics !== undefined
        ? { projectedMetrics: projectedMetrics as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput }
        : {}),
      ...(nextReview !== undefined
        ? { nextReview: nextReview ? new Date(nextReview) : null }
        : {}),
    },
  });
  return NextResponse.json(asset);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getAuthUser();

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            valuations: true,
            leases: true,
            incomeEvents: true,
            expenses: true,
            tasks: true,
            documents: true,
            creditAgreements: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const blockers = [];
    if (asset._count.valuations > 0) blockers.push(`${asset._count.valuations} valuation(s)`);
    if (asset._count.leases > 0) blockers.push(`${asset._count.leases} lease(s)`);
    if (asset._count.incomeEvents > 0) blockers.push(`${asset._count.incomeEvents} income event(s)`);
    if (asset._count.expenses > 0) blockers.push(`${asset._count.expenses} expense(s)`);
    if (asset._count.tasks > 0) blockers.push(`${asset._count.tasks} task(s)`);
    if (asset._count.documents > 0) blockers.push(`${asset._count.documents} document(s)`);
    if (asset._count.creditAgreements > 0) blockers.push(`${asset._count.creditAgreements} credit agreement(s)`);

    if (blockers.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete: asset has ${blockers.join(", ")}. Remove them first.` },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.assetEntityAllocation.deleteMany({ where: { assetId: id } }),
      prisma.assetEquityDetails.deleteMany({ where: { assetId: id } }),
      prisma.assetCreditDetails.deleteMany({ where: { assetId: id } }),
      prisma.assetRealEstateDetails.deleteMany({ where: { assetId: id } }),
      prisma.assetFundLPDetails.deleteMany({ where: { assetId: id } }),
      prisma.note.deleteMany({ where: { assetId: id } }),
      prisma.activityEvent.deleteMany({ where: { assetId: id } }),
      prisma.savedConversation.deleteMany({ where: { assetId: id } }),
      prisma.asset.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[assets/[id]] DELETE error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
