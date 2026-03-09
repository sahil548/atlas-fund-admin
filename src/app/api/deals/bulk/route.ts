import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody } from "@/lib/api-helpers";
import { BulkDealActionSchema } from "@/lib/schemas";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { DealStage } from "@prisma/client";

const VALID_ADVANCE_STAGES: Partial<Record<DealStage, DealStage>> = {
  SCREENING: "DUE_DILIGENCE",
  DUE_DILIGENCE: "IC_REVIEW",
};

export async function POST(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { data, error } = await parseBody(req, BulkDealActionSchema);
  if (error) return error;

  const { dealIds, action, killReason, assignLeadId, firmId } = data!;

  // Security: verify all deal IDs belong to the given firmId (cross-tenant protection)
  const deals = await prisma.deal.findMany({
    where: { id: { in: dealIds }, firmId },
    select: { id: true, stage: true, name: true },
  });

  if (deals.length !== dealIds.length) {
    return NextResponse.json(
      { error: "One or more deals not found or do not belong to this firm" },
      { status: 403 },
    );
  }

  if (action === "kill") {
    if (!killReason) {
      return NextResponse.json(
        { error: "killReason is required for kill action" },
        { status: 400 },
      );
    }

    // Bulk update all selected deals to DEAD
    await prisma.deal.updateMany({
      where: { id: { in: dealIds }, firmId },
      data: {
        stage: "DEAD",
        killReason,
      },
    });

    // Log DealActivity for each deal (requires individual creates for unique dealId)
    for (const deal of deals) {
      await prisma.dealActivity.create({
        data: {
          dealId: deal.id,
          activityType: "STAGE_CHANGE",
          description: `Deal killed in bulk — Reason: ${killReason}`,
          metadata: {
            previousStage: deal.stage,
            newStage: "DEAD",
            killReason,
            bulk: true,
          },
        },
      });
    }

    // Audit log — fire and forget
    logAudit(firmId, authUser.id, "KILL_DEAL", "Deal", dealIds[0], {
      bulk: true,
      dealIds,
      killReason,
      count: dealIds.length,
    }).catch(() => {});

    return NextResponse.json({ updated: dealIds.length, action: "kill" });
  }

  if (action === "assign") {
    if (!assignLeadId) {
      return NextResponse.json(
        { error: "assignLeadId is required for assign action" },
        { status: 400 },
      );
    }

    // Validate assignLeadId belongs to the firm
    const assignee = await prisma.user.findFirst({
      where: { id: assignLeadId, firmId },
      select: { id: true, name: true },
    });

    if (!assignee) {
      return NextResponse.json(
        { error: "Assigned user not found or does not belong to this firm" },
        { status: 400 },
      );
    }

    // Bulk update dealLeadId on all selected deals
    await prisma.deal.updateMany({
      where: { id: { in: dealIds }, firmId },
      data: { dealLeadId: assignLeadId },
    });

    // Audit log — fire and forget
    logAudit(firmId, authUser.id, "UPDATE_DEAL", "Deal", dealIds[0], {
      bulk: true,
      dealIds,
      action: "assign",
      assignedTo: assignee.name,
      count: dealIds.length,
    }).catch(() => {});

    return NextResponse.json({ updated: dealIds.length, action: "assign" });
  }

  if (action === "advance") {
    // Validate all deals are in the SAME stage
    const uniqueStages = [...new Set(deals.map((d) => d.stage))];
    if (uniqueStages.length > 1) {
      return NextResponse.json(
        { error: "All selected deals must be in the same stage to advance" },
        { status: 400 },
      );
    }

    const currentStage = uniqueStages[0];
    const nextStage = VALID_ADVANCE_STAGES[currentStage];

    if (!nextStage) {
      return NextResponse.json(
        {
          error:
            "Cannot bulk advance deals past IC Review — IC decisions required individually",
        },
        { status: 400 },
      );
    }

    // Bulk advance all deals to next stage
    await prisma.deal.updateMany({
      where: { id: { in: dealIds }, firmId },
      data: { stage: nextStage },
    });

    // Log DealActivity for each deal
    for (const deal of deals) {
      await prisma.dealActivity.create({
        data: {
          dealId: deal.id,
          activityType: "STAGE_CHANGE",
          description: `Deal bulk advanced from ${currentStage} to ${nextStage}`,
          metadata: {
            previousStage: currentStage,
            newStage: nextStage,
            bulk: true,
          },
        },
      });
    }

    // Audit log — fire and forget
    logAudit(firmId, authUser.id, "UPDATE_DEAL", "Deal", dealIds[0], {
      bulk: true,
      dealIds,
      action: "advance",
      from: currentStage,
      to: nextStage,
      count: dealIds.length,
    }).catch(() => {});

    return NextResponse.json({
      updated: dealIds.length,
      action: "advance",
      from: currentStage,
      to: nextStage,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
