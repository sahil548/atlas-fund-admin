import { prisma } from "@/lib/prisma";
import { postICReviewToSlack } from "@/lib/slack";

/**
 * Central stage engine for deal workflow transitions.
 *
 * Rules:
 *  SCREENING + screeningResult exists  -> DUE_DILIGENCE
 *  IC_REVIEW  + decision APPROVED      -> CLOSING
 *  IC_REVIEW  + decision REJECTED      -> DEAD
 *  IC_REVIEW  + decision SEND_BACK     -> DUE_DILIGENCE
 */

export async function checkAndAdvanceDeal(dealId: string) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      screeningResult: true,
      icProcess: true,
    },
  });

  if (!deal) throw new Error(`Deal ${dealId} not found`);

  // SCREENING -> DUE_DILIGENCE when AI screening completes
  if (deal.stage === "SCREENING" && deal.screeningResult) {
    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        stage: "DUE_DILIGENCE",
        aiScore: deal.screeningResult.score,
        aiFlag: deal.screeningResult.recommendation,
      },
    });

    // Log stage transition activity
    await prisma.dealActivity.create({
      data: {
        dealId,
        activityType: "STAGE_TRANSITION",
        description: `Deal advanced from SCREENING to DUE_DILIGENCE`,
        metadata: {
          fromStage: "SCREENING",
          toStage: "DUE_DILIGENCE",
          aiScore: deal.screeningResult.score,
          aiFlag: deal.screeningResult.recommendation,
        },
      },
    });

    return updatedDeal;
  }

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

  // Post to Slack (non-blocking — fire and forget)
  const dealForSlack = {
    id: deal.id,
    name: deal.name,
    dealCategory: deal.dealCategory,
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
 */
export async function killDeal(dealId: string) {
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new Error(`Deal ${dealId} not found`);
  if (deal.stage === "DEAD") {
    throw new Error("Deal is already dead");
  }

  const previousStage = deal.stage;

  const updatedDeal = await prisma.deal.update({
    where: { id: dealId },
    data: { stage: "DEAD" },
  });

  // Log the kill activity
  await prisma.dealActivity.create({
    data: {
      dealId,
      activityType: "DEAL_KILLED",
      description: `Deal killed (was in ${previousStage})`,
      metadata: {
        fromStage: previousStage,
        toStage: "DEAD",
      },
    },
  });

  return updatedDeal;
}

/**
 * Recalculate workstream progress (totalTasks & completedTasks) after task mutations.
 */
export async function recalcWorkstreamProgress(workstreamId: string) {
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
