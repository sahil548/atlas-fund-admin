import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySlackSignature, updateSlackMessage } from "@/lib/slack";
import { logger } from "@/lib/logger";

/**
 * POST /api/slack/interactions
 * Handles Slack interactive payloads (button clicks from IC review messages).
 *
 * Slack sends a URL-encoded body with a `payload` field containing JSON.
 */
export async function POST(req: NextRequest) {
  try {
    // Read the raw body for signature verification
    const rawBody = await req.text();

    // Verify Slack signature
    const timestamp = req.headers.get("X-Slack-Request-Timestamp") || "";
    const signature = req.headers.get("X-Slack-Signature") || "";

    if (!verifySlackSignature(rawBody, timestamp, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse URL-encoded payload
    const formData = new URLSearchParams(rawBody);
    const payloadStr = formData.get("payload");
    if (!payloadStr) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    const payload = JSON.parse(payloadStr);
    const action = payload.actions?.[0];
    if (!action) {
      return NextResponse.json({ error: "No action found" }, { status: 400 });
    }

    const actionId = action.action_id as string;
    const slackUserId = payload.user?.id as string | undefined;

    // Only handle ic_approve and ic_reject actions
    if (actionId !== "ic_approve" && actionId !== "ic_reject") {
      // Acknowledge unknown actions gracefully
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Parse action value (contains dealId and icProcessId)
    let actionValue: { dealId: string; icProcessId: string };
    try {
      actionValue = JSON.parse(action.value);
    } catch {
      return NextResponse.json({ error: "Invalid action value" }, { status: 400 });
    }

    // Map Slack user to Atlas user
    let atlasUser = null;
    if (slackUserId) {
      atlasUser = await prisma.user.findFirst({
        where: { slackUserId },
      });
    }

    if (!atlasUser) {
      // If no Atlas user found, acknowledge but warn
      logger.warn(
        `[Slack] No Atlas user found for Slack user ${slackUserId}. Vote will not be recorded.`,
      );
      return NextResponse.json(
        { text: "Your Slack account is not linked to an Atlas user. Please contact your administrator." },
        { status: 200 },
      );
    }

    // Verify IC process exists
    const icProcess = await prisma.iCProcess.findUnique({
      where: { id: actionValue.icProcessId },
      include: { deal: { select: { id: true, name: true } } },
    });

    if (!icProcess) {
      return NextResponse.json(
        { text: "IC process not found." },
        { status: 200 },
      );
    }

    // Check for duplicate vote
    const existingVote = await prisma.iCVoteRecord.findFirst({
      where: {
        icProcessId: actionValue.icProcessId,
        userId: atlasUser.id,
      },
    });

    if (existingVote) {
      return NextResponse.json(
        { text: `You have already voted (${existingVote.vote}) on this deal.` },
        { status: 200 },
      );
    }

    // Record the vote
    const vote = actionId === "ic_approve" ? "APPROVE" : "REJECT";

    await prisma.iCVoteRecord.create({
      data: {
        icProcessId: actionValue.icProcessId,
        userId: atlasUser.id,
        vote,
      },
    });

    // Update the Slack message with vote confirmation (non-blocking)
    if (icProcess.slackChannel && icProcess.slackMessageId) {
      const dealName = icProcess.deal?.name || "Deal";
      updateSlackMessage(
        icProcess.slackChannel,
        icProcess.slackMessageId,
        `${atlasUser.name} voted ${vote} on ${dealName}`,
      ).catch((err) => {
        logger.error("[Slack] Failed to update message after vote:", { error: err instanceof Error ? err.message : String(err) });
      });
    }

    // Create a DealActivity for the vote
    await prisma.dealActivity.create({
      data: {
        dealId: actionValue.dealId,
        activityType: "IC_VOTE",
        description: `${atlasUser.name} voted ${vote} via Slack`,
        metadata: {
          userId: atlasUser.id,
          vote,
          source: "slack",
        },
      },
    });

    // Acknowledge the interaction
    return NextResponse.json(
      { text: `Your vote (${vote}) has been recorded. Thank you!` },
      { status: 200 },
    );
  } catch (err) {
    logger.error("[Slack] Error handling interaction:", { error: err instanceof Error ? err.message : String(err) });
    // Always return 200 to Slack to avoid retries
    return NextResponse.json(
      { text: "An error occurred processing your action." },
      { status: 200 },
    );
  }
}
