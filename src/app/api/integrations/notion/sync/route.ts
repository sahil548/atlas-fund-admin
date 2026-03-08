/**
 * POST /api/integrations/notion/sync
 *
 * Triggers bidirectional data sync between Atlas deals and Notion database.
 * Returns { synced: { toNotion, fromNotion } }.
 */

import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotionClient } from "@/lib/integrations/notion";

export async function POST(_req: Request): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const firmId = authUser.firmId;

  const connection = await prisma.integrationConnection.findFirst({
    where: { firmId, provider: "notion" },
  });

  if (!connection) {
    return NextResponse.json(
      { error: "Notion not connected. Connect from Settings > Integrations." },
      { status: 404 }
    );
  }

  const client = new NotionClient(connection);
  const metadata = (connection.metadata as Record<string, string>) ?? {};
  const databaseId = metadata.databaseId;

  // Fetch Atlas deals for this firm
  const deals = await prisma.deal.findMany({
    where: { firmId },
    take: 50,
    orderBy: { updatedAt: "desc" },
  });

  // Sync to Notion (if database is configured)
  let toNotion = { synced: 0, errors: 0 };
  if (databaseId) {
    toNotion = await client.syncToNotion(
      deals.map((d) => ({
        id: d.id,
        name: d.name,
        stage: d.stage,
        status: d.stage, // Deal uses stage as status
        assetClass: d.assetClass,
        description: d.description,
      }))
    );
  }

  // Sync from Notion (if database is configured)
  let fromNotion: { count: number } = { count: 0 };
  if (databaseId) {
    const pages = await client.syncFromNotion(databaseId);
    fromNotion = { count: pages.length };
  }

  // Update lastSynced timestamp
  await prisma.integrationConnection.update({
    where: { id: connection.id },
    data: { metadata: { ...metadata, lastSynced: new Date().toISOString() } },
  });

  return NextResponse.json({
    synced: {
      toNotion,
      fromNotion,
    },
  });
}
