/**
 * GET /api/integrations/connections?firmId=xxx
 *
 * Returns all integration connections for a firm.
 * Used by the Integrations tab to display connection status.
 */

import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { searchParams } = new URL(req.url);
  const firmId = searchParams.get("firmId") ?? authUser.firmId;

  // Only allow access to own firm's connections
  if (firmId !== authUser.firmId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const connections = await prisma.integrationConnection.findMany({
    where: { firmId },
    select: {
      id: true,
      provider: true,
      entityId: true,
      externalAccountId: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(connections);
}
