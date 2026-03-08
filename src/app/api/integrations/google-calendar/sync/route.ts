/**
 * POST /api/integrations/google-calendar/sync
 *
 * Triggers bidirectional sync between Atlas meetings/tasks and Google Calendar.
 * Returns { synced: { toGoogle, fromGoogle } }.
 */

import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleCalendarClient } from "@/lib/integrations/google-calendar";

export async function POST(_req: Request): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const firmId = authUser.firmId;

  const connection = await prisma.integrationConnection.findFirst({
    where: { firmId, provider: "google_calendar" },
  });

  if (!connection) {
    return NextResponse.json(
      { error: "Google Calendar not connected. Connect from Settings > Integrations." },
      { status: 404 }
    );
  }

  const client = new GoogleCalendarClient(connection);

  // Refresh token if needed, then update in DB
  try {
    const refreshed = await client.refreshTokenIfNeeded();
    if (refreshed) {
      await prisma.integrationConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: refreshed.accessToken,
          tokenExpiry: refreshed.expiresAt,
        },
      });
    }
  } catch (err) {
    console.error("[google-calendar/sync] Token refresh failed:", err);
    return NextResponse.json(
      { error: "Google Calendar token expired. Please reconnect from Settings > Integrations." },
      { status: 401 }
    );
  }

  // Fetch Atlas tasks via entity relations to scope to this firm
  // Task has no firmId — scope via firm's entities
  const firmEntities = await prisma.entity.findMany({
    where: { firmId },
    select: { id: true },
  });
  const entityIds = firmEntities.map((e) => e.id);

  const tasks = await prisma.task.findMany({
    where: {
      entityId: { in: entityIds },
      dueDate: { not: null },
      status: { not: "DONE" },
    },
    take: 50,
    orderBy: { dueDate: "asc" },
  });

  // Sync task due dates to Google Calendar
  let toGoogle = { synced: 0, errors: 0 };
  if (tasks.length > 0) {
    toGoogle = await client.syncTaskDueDates(
      tasks
        .filter((t) => t.dueDate !== null)
        .map((t) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate!.toISOString().split("T")[0],
          description: null,
        }))
    );
  }

  // Fetch events from Google Calendar (last 30 days + next 30 days)
  let fromGoogle: { count: number } = { count: 0 };
  try {
    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const events = await client.listEvents("primary", timeMin, timeMax);
    fromGoogle = { count: events.length };
  } catch (err) {
    console.error("[google-calendar/sync] Failed to fetch events:", err);
    // Non-fatal — we still report toGoogle syncs
  }

  const metadata = (connection.metadata as Record<string, string>) ?? {};
  await prisma.integrationConnection.update({
    where: { id: connection.id },
    data: { metadata: { ...metadata, lastSynced: new Date().toISOString() } },
  });

  return NextResponse.json({
    synced: {
      toGoogle,
      fromGoogle,
    },
  });
}
