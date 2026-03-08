/**
 * POST /api/integrations/asana/sync
 *
 * Triggers bidirectional task sync between Atlas and Asana.
 * Returns { synced: { toAsana, fromAsana } }.
 */

import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AsanaClient } from "@/lib/integrations/asana";

export async function POST(_req: Request): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const firmId = authUser.firmId;

  // Find the Asana connection for this firm
  const connection = await prisma.integrationConnection.findFirst({
    where: { firmId, provider: "asana" },
  });

  if (!connection) {
    return NextResponse.json(
      { error: "Asana not connected. Connect from Settings > Integrations." },
      { status: 404 }
    );
  }

  const client = new AsanaClient(connection);
  const metadata = (connection.metadata as Record<string, string>) ?? {};
  const projectGid = metadata.projectGid;

  // Fetch Atlas tasks via entity relations to scope to this firm
  // Task has no firmId — scope via firm's entities
  const firmEntities = await prisma.entity.findMany({
    where: { firmId },
    select: { id: true },
  });
  const entityIds = firmEntities.map((e) => e.id);

  const atlasTasks = await prisma.task.findMany({
    where: { entityId: { in: entityIds } },
    include: { assignee: true },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });

  // Sync to Asana (if project is configured)
  let toAsana = { synced: 0, errors: 0 };
  if (projectGid) {
    toAsana = await client.syncTasksToAsana(
      atlasTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assigneeEmail: t.assignee?.email ?? null,
        dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
      }))
    );
  }

  // Sync from Asana (if project is configured)
  let fromAsana: { count: number } = { count: 0 };
  if (projectGid) {
    const asanaTasks = await client.syncTasksFromAsana(projectGid);
    fromAsana = { count: asanaTasks.length };
    // Note: creating Atlas tasks from Asana is a UI-driven import step,
    // so we return the count of available tasks without auto-creating them
  }

  // Update lastSynced timestamp in metadata
  await prisma.integrationConnection.update({
    where: { id: connection.id },
    data: { metadata: { ...metadata, lastSynced: new Date().toISOString() } },
  });

  return NextResponse.json({
    synced: {
      toAsana,
      fromAsana,
    },
  });
}
