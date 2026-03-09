/**
 * POST /api/meetings/sync
 *
 * Sync meetings from all connected Fireflies accounts within the firm.
 * Deduplicates by firefliesId to prevent importing the same transcript twice.
 * Persists action_items text in the decisions Json field for Plan 06 rendering.
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { decryptApiKey } from "@/lib/ai-config";
import { fetchTranscripts, parseActionItems } from "@/lib/fireflies";

export async function POST(_req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  // Find all users with Fireflies keys in this firm
  const connectedUsers = await prisma.user.findMany({
    where: {
      firmId: authUser.firmId,
      firefliesApiKey: { not: null },
    },
    select: {
      id: true,
      firefliesApiKey: true,
      firefliesApiKeyIV: true,
      firefliesApiKeyTag: true,
    },
  });

  let totalSynced = 0;
  let totalSkipped = 0;
  const errors: { userId: string; error: string }[] = [];

  for (const user of connectedUsers) {
    try {
      const apiKey = decryptApiKey(
        user.firefliesApiKey!,
        user.firefliesApiKeyIV!,
        user.firefliesApiKeyTag!
      );
      const transcripts = await fetchTranscripts(apiKey);

      for (const transcript of transcripts) {
        // Check if already imported (deduplication by firefliesId)
        const existing = await prisma.meeting.findUnique({
          where: { firefliesId: transcript.id },
        });
        if (existing) {
          totalSkipped++;
          continue;
        }

        const actionItemsText = transcript.summary?.action_items ?? null;
        const actionItems = parseActionItems(actionItemsText);

        const newMeeting = await prisma.meeting.create({
          data: {
            title: transcript.title || "Untitled Meeting",
            meetingDate: new Date(transcript.date),
            source: "FIREFLIES",
            hasTranscript: true,
            transcript:
              transcript.sentences
                ?.map((s) => `${s.speaker_name}: ${s.text}`)
                .join("\n") ?? null,
            summary: transcript.summary?.overview ?? null,
            // CRITICAL: Persist structured action items in the decisions Json field
            // so Plan 06 MeetingDetailCard can render action items as a checklist.
            // Stores: actionItemsText (raw), actionItemsList (parsed), keywords
            decisions: {
              actionItemsText: actionItemsText,
              actionItemsList: actionItems,
              keywords: transcript.summary?.keywords ?? [],
            },
            actionItems: actionItems.length,
            firefliesId: transcript.id,
            firmId: authUser.firmId,
            // dealId, entityId, assetId left null — linked later via context link UI
          },
        });

        // MTG-03: Auto-create TODO tasks from parsed action items
        // contextType=MEETING identifies tasks that originated from a meeting sync
        if (actionItems.length > 0) {
          await prisma.task.createMany({
            data: actionItems.map((title, index) => ({
              title,
              status: "TODO" as const,
              priority: "MEDIUM" as const,
              contextType: "MEETING",
              contextId: newMeeting.id,
              order: index,
              // entityId and dealId are null at sync time — linked later when meeting is linked
            })),
          });
        }

        totalSynced++;
      }

      // Update last sync time for this user
      await prisma.user.update({
        where: { id: user.id },
        data: { firefliesLastSync: new Date() },
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      errors.push({ userId: user.id, error: message });
    }
  }

  return NextResponse.json({
    synced: totalSynced,
    skipped: totalSkipped,
    connectedAccounts: connectedUsers.length,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
