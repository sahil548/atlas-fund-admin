import { prisma } from "@/lib/prisma";
import { postICReviewToSlack } from "@/lib/slack";
import { notifyGPTeam } from "@/lib/notifications";

/**
 * Central stage engine for deal workflow transitions.
 *
 * Rules:
 *  SCREENING -> DUE_DILIGENCE is handled directly by the screen route
 *  IC_REVIEW  + decision APPROVED      -> CLOSING
 *  IC_REVIEW  + decision REJECTED      -> DEAD
 *  IC_REVIEW  + decision SEND_BACK     -> DUE_DILIGENCE
 */

export async function checkAndAdvanceDeal(dealId: string) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      icProcess: true,
    },
  });

  if (!deal) throw new Error(`Deal ${dealId} not found`);

  // IC_REVIEW -> auto-advance based on decision
  if (deal.stage === "IC_REVIEW" && deal.icProcess?.finalDecision) {
    const decision = deal.icProcess.finalDecision;

    if (decision === "APPROVED") {
      const updatedDeal = await prisma.deal.update({
        where: { id: dealId },
        data: { stage: "CLOSING" },
      });

      await prisma.dealActivity.create({
        data: {
          dealId,
          activityType: "STAGE_TRANSITION",
          description: `Deal approved by IC — advanced from IC_REVIEW to CLOSING`,
          metadata: { fromStage: "IC_REVIEW", toStage: "CLOSING", decision },
        },
      });

      // Non-blocking notification
      notifyGPTeam({
        type: "STAGE_CHANGE",
        subject: `${deal.name} approved by IC — moved to Closing`,
      }).catch(() => {});

      return updatedDeal;
    }

    if (decision === "REJECTED") {
      const updatedDeal = await prisma.deal.update({
        where: { id: dealId },
        data: { stage: "DEAD" },
      });

      await prisma.dealActivity.create({
        data: {
          dealId,
          activityType: "STAGE_TRANSITION",
          description: `Deal rejected by IC — moved to DEAD`,
          metadata: { fromStage: "IC_REVIEW", toStage: "DEAD", decision },
        },
      });

      return updatedDeal;
    }

    if (decision === "SEND_BACK") {
      const updatedDeal = await prisma.deal.update({
        where: { id: dealId },
        data: { stage: "DUE_DILIGENCE" },
      });

      await prisma.dealActivity.create({
        data: {
          dealId,
          activityType: "STAGE_TRANSITION",
          description: `Deal sent back to DUE_DILIGENCE by IC for further review`,
          metadata: { fromStage: "IC_REVIEW", toStage: "DUE_DILIGENCE", decision },
        },
      });

      return updatedDeal;
    }
  }

  return deal; // No transition needed
}

/**
 * Manual transition: DUE_DILIGENCE -> IC_REVIEW
 * Returns { warning, deal } — warning is set if workstreams are incomplete.
 * If force=true, proceeds despite incomplete workstreams.
 */
export async function sendToICReview(
  dealId: string,
  force = false,
): Promise<{
  warning: string | null;
  deal: Awaited<ReturnType<typeof prisma.deal.findUnique>>;
}> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      workstreams: true,
    },
  });

  if (!deal) throw new Error(`Deal ${dealId} not found`);
  if (deal.stage !== "DUE_DILIGENCE") {
    throw new Error(`Deal must be in DUE_DILIGENCE to send to IC Review (currently ${deal.stage})`);
  }

  // Check workstream completion
  const totalWorkstreams = deal.workstreams.length;
  const completedWorkstreams = deal.workstreams.filter(
    (ws) => ws.status === "COMPLETE",
  ).length;
  const allComplete = totalWorkstreams > 0 && completedWorkstreams === totalWorkstreams;

  let warning: string | null = null;

  if (!allComplete && !force) {
    const incomplete = totalWorkstreams - completedWorkstreams;
    warning = `${incomplete} of ${totalWorkstreams} workstreams are not yet complete. Send to IC Review anyway?`;
    return { warning, deal };
  }

  // Proceed — advance to IC_REVIEW and create/update ICProcess
  const updatedDeal = await prisma.deal.update({
    where: { id: dealId },
    data: { stage: "IC_REVIEW" },
  });

  // Ensure an ICProcess record exists
  const icProcess = await prisma.iCProcess.upsert({
    where: { dealId },
    create: { dealId, status: "pending" },
    update: {},
  });

  // Log the IC Review activity
  await prisma.dealActivity.create({
    data: {
      dealId,
      activityType: "SENT_TO_IC",
      description: `Sent to IC Review${!allComplete ? " (forced — incomplete workstreams)" : ""}`,
      metadata: {
        fromStage: "DUE_DILIGENCE",
        toStage: "IC_REVIEW",
        totalWorkstreams,
        completedWorkstreams,
        forced: !allComplete && force,
      },
    },
  });

  // Non-blocking notification
  notifyGPTeam({
    type: "STAGE_CHANGE",
    subject: `${deal.name} sent to IC Review`,
  }).catch(() => {});

  // Post to Slack (non-blocking — fire and forget)
  const dealForSlack = {
    id: deal.id,
    name: deal.name,
    assetClass: deal.assetClass,
    targetSize: deal.targetSize,
    aiScore: deal.aiScore,
    aiFlag: deal.aiFlag,
    sector: deal.sector,
    workstreams: deal.workstreams.map((ws) => ({
      status: ws.status,
      name: ws.name,
    })),
  };

  postICReviewToSlack(dealForSlack, icProcess)
    .then(async (slackResult) => {
      if (slackResult) {
        // Store Slack message reference on ICProcess for later updates
        await prisma.iCProcess.update({
          where: { id: icProcess.id },
          data: {
            slackMessageId: slackResult.ts,
            slackChannel: slackResult.channel,
          },
        });
      }
    })
    .catch((err) => {
      console.error("[Slack] Non-blocking IC post failed:", err);
    });

  return { warning: null, deal: updatedDeal };
}

/**
 * Kill a deal — moves any stage -> DEAD
 * Stores kill reason, optional free text, and previous stage (for revive).
 */
export async function killDeal(
  dealId: string,
  killReason: string,
  killReasonText?: string,
) {
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new Error(`Deal ${dealId} not found`);
  if (deal.stage === "DEAD") {
    throw new Error("Deal is already dead");
  }

  const previousStage = deal.stage;

  const updatedDeal = await prisma.deal.update({
    where: { id: dealId },
    data: {
      stage: "DEAD",
      killReason,
      killReasonText: killReasonText || null,
      previousStage,
    },
  });

  // Log the kill activity
  await prisma.dealActivity.create({
    data: {
      dealId,
      activityType: "DEAL_KILLED",
      description: `Deal killed (was in ${previousStage}) — Reason: ${killReason}${killReasonText ? ` — ${killReasonText}` : ""}`,
      metadata: {
        fromStage: previousStage,
        toStage: "DEAD",
        killReason,
        killReasonText: killReasonText || null,
      },
    },
  });

  // Non-blocking notification
  notifyGPTeam({
    type: "STAGE_CHANGE",
    subject: `${deal.name} has been killed`,
  }).catch(() => {});

  return updatedDeal;
}

/**
 * Revive a deal — DEAD -> previous stage
 * Restores the stage from before the deal was killed.
 */
export async function reviveDeal(dealId: string) {
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new Error(`Deal ${dealId} not found`);
  if (deal.stage !== "DEAD") {
    throw new Error("Deal is not dead — cannot revive");
  }

  const revivedToStage = deal.previousStage || "SCREENING";

  const updatedDeal = await prisma.deal.update({
    where: { id: dealId },
    data: {
      stage: revivedToStage,
      killReason: null,
      killReasonText: null,
      previousStage: null,
    },
  });

  // Log the revive activity
  await prisma.dealActivity.create({
    data: {
      dealId,
      activityType: "DEAL_REVIVED",
      description: `Deal revived — restored to ${revivedToStage}`,
      metadata: {
        fromStage: "DEAD",
        toStage: revivedToStage,
        revivedToStage,
      },
    },
  });

  // Non-blocking notification
  notifyGPTeam({
    type: "STAGE_CHANGE",
    subject: `${deal.name} has been revived`,
  }).catch(() => {});

  return updatedDeal;
}

/**
 * Send a deal back to DUE_DILIGENCE from IC_REVIEW.
 * Used when an IC voter casts a SEND_BACK vote.
 * Updates the ICProcess status and logs the reason.
 */
export async function sendBackToDueDiligence(dealId: string, reason: string) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { icProcess: true },
  });

  if (!deal) throw new Error(`Deal ${dealId} not found`);
  if (deal.stage !== "IC_REVIEW") {
    throw new Error(`Deal must be in IC_REVIEW to send back (currently ${deal.stage})`);
  }

  // Update deal stage
  const updatedDeal = await prisma.deal.update({
    where: { id: dealId },
    data: { stage: "DUE_DILIGENCE" },
  });

  // Update IC process status
  if (deal.icProcess) {
    await prisma.iCProcess.update({
      where: { id: deal.icProcess.id },
      data: { status: "sent_back" },
    });
  }

  // Log activity with reason
  await prisma.dealActivity.create({
    data: {
      dealId,
      activityType: "DEAL_SENT_BACK",
      description: `Deal sent back to DUE_DILIGENCE — ${reason}`,
      metadata: {
        fromStage: "IC_REVIEW",
        toStage: "DUE_DILIGENCE",
        reason,
      },
    },
  });

  // Non-blocking notification
  notifyGPTeam({
    type: "STAGE_CHANGE",
    subject: `${deal.name} sent back to Due Diligence`,
  }).catch(() => {});

  return updatedDeal;
}

/**
 * Close a deal — CLOSING -> CLOSED
 * Validates all closing checklist items are COMPLETE, then transitions.
 * Also creates an Asset record from the deal data.
 */
interface CloseAllocation {
  entityId: string;
  allocationPercent: number;
}

export async function closeDeal(
  dealId: string,
  opts: {
    costBasis: number;
    fairValue?: number;
    entryDate?: string;
    force?: boolean;
    allocations: CloseAllocation[];
  },
) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      closingChecklist: true,
      documents: true,
    },
  });
  if (!deal) throw new Error(`Deal ${dealId} not found`);
  if (deal.stage !== "CLOSING") {
    throw new Error(`Deal must be in CLOSING to close (currently ${deal.stage})`);
  }
  if (!deal.firmId) throw new Error("Deal has no firm associated");

  const totalItems = deal.closingChecklist.length;
  const completedItems = deal.closingChecklist.filter(
    (item) => item.status === "COMPLETE",
  ).length;

  if (totalItems === 0 && !opts.force) {
    return {
      warning: "Closing checklist has not been initialized. Close anyway?",
      checklistTotal: 0,
      checklistComplete: 0,
    };
  }
  if (totalItems > 0 && completedItems < totalItems && !opts.force) {
    return {
      warning: `${totalItems - completedItems} of ${totalItems} checklist items are incomplete. Close anyway?`,
      checklistTotal: totalItems,
      checklistComplete: completedItems,
    };
  }

  // Validate all entity IDs belong to the same firm
  const entityIds = opts.allocations.map((a) => a.entityId);
  const entities = await prisma.entity.findMany({
    where: { id: { in: entityIds }, firmId: deal.firmId },
    select: { id: true },
  });
  if (entities.length !== entityIds.length) {
    throw new Error("One or more entity IDs are invalid or do not belong to this firm");
  }

  const costBasis = opts.costBasis;
  const fairValue = opts.fairValue ?? costBasis;
  const entryDate = opts.entryDate ? new Date(opts.entryDate) : new Date();

  // Create asset from deal data with full metadata carryover
  const asset = await prisma.asset.create({
    data: {
      name: deal.name,
      assetClass: deal.assetClass,
      capitalInstrument: deal.capitalInstrument,
      participationStructure: deal.participationStructure,
      sector: deal.sector,
      status: "ACTIVE",
      costBasis,
      fairValue,
      entryDate,
      sourceDealId: dealId,
    },
  });

  // Create entity allocations
  for (const alloc of opts.allocations) {
    await prisma.assetEntityAllocation.create({
      data: {
        assetId: asset.id,
        entityId: alloc.entityId,
        allocationPercent: alloc.allocationPercent,
        costBasis: costBasis * (alloc.allocationPercent / 100),
      },
    });
  }

  // Link deal documents to the new asset
  if (deal.documents.length > 0) {
    await prisma.document.updateMany({
      where: { id: { in: deal.documents.map((d) => d.id) } },
      data: { assetId: asset.id },
    });
  }

  const updatedDeal = await prisma.deal.update({
    where: { id: dealId },
    data: { stage: "CLOSED" },
  });

  await prisma.dealActivity.create({
    data: {
      dealId,
      activityType: "DEAL_CLOSED",
      description: `Deal closed — asset "${asset.name}" created and booked (cost basis: $${costBasis.toLocaleString()})`,
      metadata: {
        fromStage: "CLOSING",
        toStage: "CLOSED",
        assetId: asset.id,
        assetName: asset.name,
        costBasis,
        fairValue,
        allocations: opts.allocations.map((a) => ({
          entityId: a.entityId,
          allocationPercent: a.allocationPercent,
          costBasis: costBasis * (a.allocationPercent / 100),
        })),
      },
    },
  });

  // Non-blocking notification
  notifyGPTeam({
    type: "STAGE_CHANGE",
    subject: `${deal.name} closed — asset created`,
  }).catch(() => {});

  return { deal: updatedDeal, asset };
}

/**
 * Recalculate workstream progress (totalTasks & completedTasks) after task mutations.
 */
export async function recalcWorkstreamProgress(workstreamId: string) {
  const ws = await prisma.dDWorkstream.findUnique({
    where: { id: workstreamId },
    select: { analysisResult: true },
  });
  const tasks = await prisma.dDTask.findMany({
    where: { workstreamId },
    select: { status: true },
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "DONE").length;
  const inProgress = tasks.some((t) => t.status === "IN_PROGRESS");

  let status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" = "NOT_STARTED";
  if (totalTasks > 0 && completedTasks === totalTasks) {
    status = "COMPLETE";
  } else if (completedTasks > 0 || inProgress) {
    status = "IN_PROGRESS";
  }

  return prisma.dDWorkstream.update({
    where: { id: workstreamId },
    data: { totalTasks, completedTasks, status },
  });
}

/**
 * Manual transition: IC_REVIEW -> CLOSING
 * Validates IC process exists with APPROVED decision before advancing.
 */
export async function advanceToClosing(dealId: string) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { icProcess: true },
  });

  if (!deal) throw new Error(`Deal ${dealId} not found`);
  if (deal.stage !== "IC_REVIEW") {
    throw new Error(
      `Deal must be in IC_REVIEW to advance to Closing (currently ${deal.stage})`
    );
  }
  if (!deal.icProcess || deal.icProcess.finalDecision !== "APPROVED") {
    throw new Error(
      "IC process must exist with an APPROVED decision to advance to Closing"
    );
  }

  const updatedDeal = await prisma.deal.update({
    where: { id: dealId },
    data: { stage: "CLOSING" },
  });

  await prisma.dealActivity.create({
    data: {
      dealId,
      activityType: "STAGE_TRANSITION",
      description: `Deal manually advanced from IC_REVIEW to CLOSING`,
      metadata: {
        fromStage: "IC_REVIEW",
        toStage: "CLOSING",
        decision: "APPROVED",
      },
    },
  });

  notifyGPTeam({
    type: "STAGE_CHANGE",
    subject: `${deal.name} advanced to Closing`,
  }).catch(() => {});

  return updatedDeal;
}
