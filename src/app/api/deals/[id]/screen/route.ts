import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { CATEGORY_NAME_TO_TYPE } from "@/lib/schemas";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * POST /api/deals/[id]/screen
 *
 * Creates DD workstreams from category templates.
 * By default also advances the deal from SCREENING → DUE_DILIGENCE.
 * Pass { advanceStage: false } in the body to only create workstreams
 * without advancing (used by "Create Deal" to scaffold workstreams).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Parse optional body flag
  let advanceStage = true;
  try {
    const body = await req.json();
    if (body?.advanceStage === false) advanceStage = false;
  } catch {
    /* no body = default true */
  }

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      workstreams: { select: { id: true, name: true } },
    },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const firmId = deal.firmId || "firm-1";

  // ── Fetch DD category templates for this deal's asset class ──
  const scopes = ["UNIVERSAL", deal.assetClass];
  if (deal.capitalInstrument === "DEBT") scopes.push("DEBT");

  const templates = await prisma.dDCategoryTemplate.findMany({
    where: {
      OR: [{ firmId }, { firmId: null, isDefault: true }],
      scope: { in: scopes },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Fallback if no templates exist
  const categories =
    templates.length > 0
      ? templates.map((t) => ({ name: t.name, instructions: t.defaultInstructions }))
      : [
          { name: "Financial DD", instructions: "" },
          { name: "Legal DD", instructions: "" },
          { name: "Operational DD", instructions: "" },
        ];

  // ── Create workstreams (skip existing) ──
  const existingNames = new Set(deal.workstreams.map((w) => w.name));
  let created = 0;

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    if (existingNames.has(cat.name)) continue;

    // Resolve analysis type from category name
    const analysisType = CATEGORY_NAME_TO_TYPE[cat.name] || "DD_CUSTOM";

    await prisma.dDWorkstream.create({
      data: {
        dealId: id,
        name: cat.name,
        description: `Due diligence workstream for ${cat.name.toLowerCase()}.`,
        aiGenerated: true,
        analysisType,
        customInstructions: cat.instructions || null,
        sortOrder: i,
        totalTasks: 0,
        completedTasks: 0,
        status: "NOT_STARTED",
      },
    });
    created++;
  }

  // ── Advance stage (unless advanceStage=false) ──
  if (advanceStage && deal.stage === "SCREENING") {
    await prisma.deal.update({
      where: { id },
      data: { stage: "DUE_DILIGENCE" },
    });

    await prisma.dealActivity.create({
      data: {
        dealId: id,
        activityType: "STAGE_TRANSITION",
        description: `Deal advanced to Due Diligence — ${created} workstreams created`,
        metadata: {
          fromStage: "SCREENING",
          toStage: "DUE_DILIGENCE",
          workstreamsCreated: created,
        },
      },
    });
  }

  // ── Log activity ──
  await prisma.dealActivity.create({
    data: {
      dealId: id,
      activityType: "DD_SETUP",
      description: `${created} DD workstreams created from category templates.`,
      metadata: {
        workstreamCount: categories.length,
        newWorkstreams: created,
      },
    },
  });

  // ── Return full deal for SWR ──
  const updatedDeal = await prisma.deal.findUnique({
    where: { id },
    include: {
      workstreams: {
        include: { tasks: { orderBy: { createdAt: "asc" } } },
        orderBy: { sortOrder: "asc" },
      },
      screeningResult: true,
      icProcess: {
        include: {
          votes: { include: { user: true } },
          decidedBy: { select: { id: true, name: true, initials: true } },
        },
      },
      icQuestions: {
        include: {
          author: { select: { id: true, name: true, initials: true } },
          replies: {
            include: {
              author: { select: { id: true, name: true, initials: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      closingChecklist: true,
      documents: true,
      meetings: { orderBy: { meetingDate: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } },
      dealLead: { select: { id: true, name: true, initials: true } },
      targetEntity: true,
    },
  });

  return NextResponse.json(updatedDeal);
}
