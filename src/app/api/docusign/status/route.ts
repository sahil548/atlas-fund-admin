/**
 * GET /api/docusign/status?firmId=xxx
 *
 * Returns whether DocuSign is connected for the firm.
 * Used by UI components to conditionally show Send for Signature buttons.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const connection = await prisma.docuSignConnection.findUnique({
    where: { firmId: authUser.firmId },
    select: { id: true, accountId: true, createdAt: true },
  });

  return NextResponse.json({
    connected: !!connection,
    accountId: connection?.accountId ?? null,
    connectedSince: connection?.createdAt ?? null,
  });
}
