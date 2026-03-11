/**
 * Slack integration library for Atlas deal platform.
 *
 * Provides functions for posting IC review messages, updating messages,
 * and verifying Slack request signatures. All functions are non-blocking
 * and catch errors internally to avoid disrupting deal workflows.
 *
 * Environment variables:
 *   SLACK_BOT_TOKEN      — Bot User OAuth Token (xoxb-...)
 *   SLACK_SIGNING_SECRET — Slack app signing secret for request verification
 *   SLACK_IC_CHANNEL     — Channel ID for IC review messages
 */

import crypto from "crypto";
import { logger } from "@/lib/logger";

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_IC_CHANNEL = process.env.SLACK_IC_CHANNEL;

interface Deal {
  id: string;
  name: string;
  assetClass: string;
  targetSize?: string | null;
  aiScore?: number | null;
  aiFlag?: string | null;
  sector?: string | null;
  workstreams?: { status: string; name: string }[];
}

interface ICProcess {
  id: string;
  status: string;
  quorumType?: string;
  deadline?: Date | null;
}

interface SlackPostResult {
  ts: string;
  channel: string;
}

/**
 * Post an IC Review message to the configured Slack channel using Block Kit.
 * Returns { ts, channel } for storing on ICProcess, or null on failure.
 */
export async function postICReviewToSlack(
  deal: Deal,
  icProcess: ICProcess,
): Promise<SlackPostResult | null> {
  try {
    if (!SLACK_BOT_TOKEN || !SLACK_IC_CHANNEL) {
      logger.warn("[Slack] SLACK_BOT_TOKEN or SLACK_IC_CHANNEL not configured — skipping IC post.");
      return null;
    }

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const dealUrl = `${appBaseUrl}/deals/${deal.id}`;

    // DD completion summary
    const workstreams = deal.workstreams || [];
    const totalWs = workstreams.length;
    const completedWs = workstreams.filter((ws) => ws.status === "COMPLETE").length;
    const ddSummary = totalWs > 0
      ? `${completedWs}/${totalWs} workstreams complete`
      : "No workstreams";

    const scoreDisplay = deal.aiScore != null ? `${deal.aiScore}/100` : "N/A";
    const recommendationDisplay = deal.aiFlag
      ? deal.aiFlag.replace(/_/g, " ")
      : "N/A";

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `IC Review: ${deal.name}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Asset Class:*\n${deal.assetClass.replace(/_/g, " ")}` },
          { type: "mrkdwn", text: `*Target Size:*\n${deal.targetSize || "N/A"}` },
          { type: "mrkdwn", text: `*AI Score:*\n${scoreDisplay}` },
          { type: "mrkdwn", text: `*Recommendation:*\n${recommendationDisplay}` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*DD Completion:* ${ddSummary}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${dealUrl}|View deal in Atlas>`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Approve", emoji: true },
            style: "primary",
            action_id: "ic_approve",
            value: JSON.stringify({ dealId: deal.id, icProcessId: icProcess.id }),
          },
          {
            type: "button",
            text: { type: "plain_text", text: "Reject", emoji: true },
            style: "danger",
            action_id: "ic_reject",
            value: JSON.stringify({ dealId: deal.id, icProcessId: icProcess.id }),
          },
          {
            type: "button",
            text: { type: "plain_text", text: "View in Atlas", emoji: true },
            url: dealUrl,
            action_id: "ic_view",
          },
        ],
      },
    ];

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify({
        channel: SLACK_IC_CHANNEL,
        text: `IC Review: ${deal.name} — Score: ${scoreDisplay}, ${ddSummary}`,
        blocks,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      logger.error("[Slack] Failed to post IC review message", { error: result.error });
      return null;
    }

    return {
      ts: result.ts as string,
      channel: result.channel as string,
    };
  } catch (err) {
    logger.error("[Slack] Error posting IC review message", { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/**
 * Update an existing Slack message (e.g., after a vote is cast).
 */
export async function updateSlackMessage(
  channel: string,
  ts: string,
  text: string,
): Promise<boolean> {
  try {
    if (!SLACK_BOT_TOKEN) {
      logger.warn("[Slack] SLACK_BOT_TOKEN not configured — skipping message update.");
      return false;
    }

    const response = await fetch("https://slack.com/api/chat.update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify({
        channel,
        ts,
        text,
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      logger.error("[Slack] Failed to update message", { error: result.error });
      return false;
    }

    return true;
  } catch (err) {
    logger.error("[Slack] Error updating message", { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

/**
 * Verify an incoming Slack request signature.
 *
 * Slack sends:
 *   X-Slack-Request-Timestamp — epoch seconds
 *   X-Slack-Signature         — v0=<hex HMAC-SHA256>
 *
 * Returns true if the signature is valid, false otherwise.
 * If SLACK_SIGNING_SECRET is not configured, returns true (allows development without Slack).
 */
export function verifySlackSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
): boolean {
  try {
    if (!SLACK_SIGNING_SECRET) {
      logger.warn("[Slack] SLACK_SIGNING_SECRET not configured — skipping signature verification.");
      return true;
    }

    // Reject requests older than 5 minutes to prevent replay attacks
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
      logger.warn("[Slack] Request timestamp too old — possible replay attack.");
      return false;
    }

    const sigBasestring = `v0:${timestamp}:${rawBody}`;
    const hmac = crypto.createHmac("sha256", SLACK_SIGNING_SECRET);
    hmac.update(sigBasestring);
    const computedSignature = `v0=${hmac.digest("hex")}`;

    return crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(signature),
    );
  } catch (err) {
    logger.error("[Slack] Error verifying signature", { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
