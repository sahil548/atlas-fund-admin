import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { CATEGORY_NAME_TO_TYPE } from "@/lib/schemas";
import { getAuthUser } from "@/lib/auth";
import { DEFAULT_DD_CATEGORIES, getDefaultDDCategoriesForFirm } from "@/lib/default-dd-categories";

/**
 * POST /api/deals/[id]/screen
 *
 * Creates DD workstreams from category templates (idempotent — skips existing).
 * Does NOT advance stage — stage advancement happens after IC memo is generated
 * in the dd-analyze route.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      workstreams: { select: { id: true, name: true } },
    },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const authUser = await getAuthUser();
  const firmId = authUser?.firmId || deal.firmId || "";

  // ── Fetch DD category templates for this deal's asset class ──
  const scopes = ["UNIVERSAL", deal.assetClass];
  if (deal.capitalInstrument === "DEBT") scopes.push("DEBT");

  let templates = await prisma.dDCategoryTemplate.findMany({
    where: {
      OR: [{ firmId }, { firmId: null, isDefault: true }],
      scope: { in: scopes },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Auto-provision defaults if no templates exist for this firm
  if (templates.length === 0 && firmId) {
    const defaults = getDefaultDDCategoriesForFirm(firmId);
    await prisma.dDCategoryTemplate.createMany({ data: defaults });
    console.log(`[screen] Auto-provisioned ${defaults.length} default DD templates for firm ${firmId}`);

    templates = await prisma.dDCategoryTemplate.findMany({
      where: { firmId, scope: { in: scopes } },
      orderBy: { sortOrder: "asc" },
    });
  }

  // Map to categories (use built-in defaults as last resort)
  const categories =
    templates.length > 0
      ? templates.map((t) => ({ name: t.name, instructions: t.defaultInstructions }))
      : DEFAULT_DD_CATEGORIES
          .filter((d) => scopes.includes(d.scope))
          .map((d) => ({ name: d.name, instructions: d.defaultInstructions }));

  // ── Create workstreams (skip existing) ──
  const existingNames = new Set(deal.workstreams.map((w) => w.name));
  let created = 0;

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    if (existingNames.has(cat.name)) continue;

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

  // ── Log activity ──
  if (created > 0) {
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
  }

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
