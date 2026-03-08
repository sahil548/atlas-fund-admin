/**
 * DELETE /api/integrations/connections/[id]
 *
 * Disconnects an integration by removing the connection record.
 * Preserves synced data (only removes auth tokens/connection).
 */

import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { id } = await params;

  // Verify connection belongs to this firm
  const connection = await prisma.integrationConnection.findFirst({
    where: { id, firmId: authUser.firmId },
  });

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  await prisma.integrationConnection.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
