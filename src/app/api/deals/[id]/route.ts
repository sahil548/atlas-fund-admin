import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { UpdateDealSchema, CloseDealSchema, KillDealSchema } from "@/lib/schemas";
import { killDeal, reviveDeal, closeDeal, advanceToClosing } from "@/lib/deal-stage-engine";
import { getAuthUser, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { DealMetadataSchema } from "@/lib/json-schemas";
import { logger } from "@/lib/logger";

// Flexible top-level PATCH schema — each action branch does further validation
const PatchDealBodySchema = z.object({
  action: z.string().optional(),
}).passthrough();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authUser = await getAuthUser();

  // GP_TEAM permission check (only when authenticated)
  if (authUser && authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "deals", "read_only")) return forbidden();
  }

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      workstreams: {
        include: {
          tasks: { orderBy: { createdAt: "asc" } },
          assignee: { select: { id: true, name: true, initials: true } },
          _count: { select: { comments: true, attachments: true } },
        },
        orderBy: { name: "asc" },
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
      sourceAssets: { select: { id: true, name: true, costBasis: true, fairValue: true, moic: true, irr: true } },
      dealLead: { select: { id: true, name: true, initials: true } },
      sourcedByContact: { select: { id: true, firstName: true, lastName: true } },
      coInvestors: {
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          company: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      targetEntity: {
        select: {
          id: true, name: true, entityType: true, vehicleStructure: true, status: true,
          decisionStructure: {
            include: {
              members: {
                include: { user: { select: { id: true, name: true, initials: true } } },
              },
            },
          },
        },
      },
      dealEntities: {
        include: {
          entity: {
            select: {
              id: true, name: true,
              decisionStructure: {
                include: {
                  members: {
                    include: { user: { select: { id: true, name: true, initials: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Compute daysInStage (same logic as list API)
  const now = new Date();
  const stageEntry = (deal.activities as any[]).find(
    (a) =>
      a.activityType.includes("STAGE") &&
      ((a.metadata as any)?.toStage === deal.stage ||
        (a.metadata as any)?.newStage === deal.stage),
  );
  const enteredAt = stageEntry
    ? new Date(stageEntry.createdAt)
    : new Date(deal.createdAt);
  const daysInStage = Math.max(
    0,
    Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24)),
  );

  // Sanitize high-risk JSON blob field: dealMetadata
  const safeMeta = DealMetadataSchema.safeParse(deal.dealMetadata);
  const sanitizedDeal = {
    ...deal,
    dealMetadata: safeMeta.success ? safeMeta.data : null,
    daysInStage,
  };

  return NextResponse.json(sanitizedDeal);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authUserForPut = await getAuthUser();
  if (!authUserForPut) return forbidden();

  if (authUserForPut.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUserForPut.id);
    if (!checkPermission(perms, "deals", "full")) return forbidden();
  }

  const { data, error } = await parseBody(req, UpdateDealSchema);
  if (error) return error;

  const updateData: Record<string, unknown> = {};
  if (data!.name !== undefined) updateData.name = data!.name;
  if (data!.assetClass !== undefined) updateData.assetClass = data!.assetClass;
  if (data!.capitalInstrument !== undefined) updateData.capitalInstrument = data!.capitalInstrument;
  if (data!.participationStructure !== undefined) updateData.participationStructure = data!.participationStructure;
  if (data!.sector !== undefined) updateData.sector = data!.sector;
  if (data!.targetSize !== undefined) updateData.targetSize = data!.targetSize;
  if (data!.targetCheckSize !== undefined) updateData.targetCheckSize = data!.targetCheckSize;
  if (data!.targetReturn !== undefined) updateData.targetReturn = data!.targetReturn;
  if (data!.dealLeadId !== undefined) updateData.dealLeadId = data!.dealLeadId;
  if (data!.gpName !== undefined) updateData.gpName = data!.gpName;
  if (data!.source !== undefined) updateData.source = data!.source;
  if (data!.counterparty !== undefined) updateData.counterparty = data!.counterparty;
  if (data!.entityId !== undefined) updateData.entityId = data!.entityId;
  if (data!.description !== undefined) updateData.description = data!.description;
  if (data!.thesisNotes !== undefined) updateData.thesisNotes = data!.thesisNotes;
  if (data!.investmentRationale !== undefined) updateData.investmentRationale = data!.investmentRationale;
  if (data!.additionalContext !== undefined) updateData.additionalContext = data!.additionalContext;
  if (data!.dealMetadata !== undefined) updateData.dealMetadata = data!.dealMetadata;
  if (data!.sourcedByContactId !== undefined) updateData.sourcedByContactId = data!.sourcedByContactId;

  const deal = await prisma.deal.update({ where: { id }, data: updateData });
  return NextResponse.json(deal);
}

/**
 * PATCH /api/deals/[id] — Kill or Close deal
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data: patchBody, error: patchError } = await parseBody(req, PatchDealBodySchema);
  if (patchError) return patchError;
  const body = patchBody!;

  const authUser = await getAuthUser();

  if (authUser && authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "deals", "full")) return forbidden();
  }

  if (body.action === "KILL") {
    const parsed = KillDealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    try {
      const deal = await killDeal(id, parsed.data.killReason, parsed.data.killReasonText);
      if (authUser) {
        logAudit(authUser.firmId, authUser.id, "KILL_DEAL", "Deal", id, {
          killReason: parsed.data.killReason,
          killReasonText: parsed.data.killReasonText,
        });
      }
      return NextResponse.json(deal);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (body.action === "REVIVE") {
    try {
      const deal = await reviveDeal(id);
      if (authUser) {
        logAudit(authUser.firmId, authUser.id, "REVIVE_DEAL", "Deal", id, {});
      }
      return NextResponse.json(deal);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (body.action === "ADVANCE_TO_CLOSING") {
    try {
      const deal = await advanceToClosing(id);
      return NextResponse.json(deal);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (body.action === "CLOSE") {
    const parsed = CloseDealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    try {
      const result = await closeDeal(id, {
        costBasis: parsed.data.costBasis,
        fairValue: parsed.data.fairValue,
        entryDate: parsed.data.entryDate,
        force: parsed.data.force,
        allocations: parsed.data.allocations,
      });
      if ("warning" in result) {
        return NextResponse.json({ warning: result.warning, checklistTotal: result.checklistTotal, checklistComplete: result.checklistComplete });
      }
      if (authUser) {
        logAudit(authUser.firmId, authUser.id, "CLOSE_DEAL", "Deal", id, {
          costBasis: parsed.data.costBasis,
        });
      }
      return NextResponse.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authUser = await getAuthUser();

    if (authUser && authUser.role === "GP_TEAM") {
      const perms = await getEffectivePermissions(authUser.id);
      if (!checkPermission(perms, "deals", "full")) return forbidden();
    }

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        sourceAssets: { select: { id: true } },
      },
    });

    if (!deal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only allow deletion of SCREENING or DEAD deals
    if (deal.stage !== "SCREENING" && deal.stage !== "DEAD") {
      return NextResponse.json(
        { error: `Cannot delete: deal is in ${deal.stage} stage. Only SCREENING or DEAD deals can be deleted.` },
        { status: 400 },
      );
    }

    if (deal.sourceAssets.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete: deal has ${deal.sourceAssets.length} closed asset(s) created from it.` },
        { status: 400 },
      );
    }

    // Cascade delete all related records
    await prisma.$transaction([
      // DD workstream nested data
      prisma.dDWorkstreamAttachment.deleteMany({ where: { workstream: { dealId: id } } }),
      prisma.dDWorkstreamComment.deleteMany({ where: { workstream: { dealId: id } } }),
      prisma.dDTask.deleteMany({ where: { workstream: { dealId: id } } }),
      prisma.dDWorkstream.deleteMany({ where: { dealId: id } }),
      // IC process
      prisma.iCVoteRecord.deleteMany({ where: { icProcess: { dealId: id } } }),
      prisma.iCProcess.deleteMany({ where: { dealId: id } }),
      prisma.iCQuestionReply.deleteMany({ where: { question: { dealId: id } } }),
      prisma.iCQuestion.deleteMany({ where: { dealId: id } }),
      // Closing & screening
      prisma.closingChecklist.deleteMany({ where: { dealId: id } }),
      prisma.aIScreeningResult.deleteMany({ where: { dealId: id } }),
      // Related records
      prisma.dealActivity.deleteMany({ where: { dealId: id } }),
      prisma.dealEntity.deleteMany({ where: { dealId: id } }),
      prisma.dealCoInvestor.deleteMany({ where: { dealId: id } }),
      prisma.note.deleteMany({ where: { dealId: id } }),
      prisma.task.updateMany({ where: { dealId: id }, data: { dealId: null } }),
      prisma.document.updateMany({ where: { dealId: id }, data: { dealId: null } }),
      prisma.meeting.updateMany({ where: { dealId: id }, data: { dealId: null } }),
      prisma.savedConversation.deleteMany({ where: { dealId: id } }),
      prisma.deal.delete({ where: { id } }),
    ]);

    if (authUser) {
      logAudit(authUser.firmId, authUser.id, "DELETE_DEAL", "Deal", id, { name: deal.name });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[deals/[id]] DELETE error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });
  }
}
