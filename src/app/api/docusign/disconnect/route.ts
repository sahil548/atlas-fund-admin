/**
 * POST /api/docusign/disconnect
 *
 * Removes the DocuSignConnection for the authenticated GP admin's firm.
 * Does not revoke the DocuSign token (user can re-connect at any time).
 */

import { NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(_req: Request): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();
  if (authUser.role !== "GP_ADMIN") return forbidden();

  try {
    await prisma.docuSignConnection.delete({
      where: { firmId: authUser.firmId },
    });
  } catch (e: unknown) {
    // P2025 = record not found — already disconnected
    if ((e as { code?: string }).code === "P2025") {
      return NextResponse.json({ message: "Not connected" }, { status: 200 });
    }
    logger.error("[docusign/disconnect] Error:", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return NextResponse.json({ message: "DocuSign disconnected" });
}
