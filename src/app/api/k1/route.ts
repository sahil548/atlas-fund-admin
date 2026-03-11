/**
 * GET /api/k1
 * List K-1 tax documents (Documents with category TAX).
 *
 * Query params:
 *   - firmId: required (scopes to firm via entity.firmId)
 *   - entityId: optional filter
 *   - taxYear: optional filter (matches filename containing the year)
 *
 * Returns array of documents with entity.name and investor.name included.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { getEffectivePermissions, checkPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  if (authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "reports", "read_only")) return forbidden();
  }

  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId") ?? undefined;
    const taxYear = searchParams.get("taxYear") ?? undefined;

    // Build the where clause — scope to firm via entity.firmId
    const where: any = {
      category: "TAX",
      entity: {
        firmId: authUser.firmId,
      },
    };

    if (entityId) {
      where.entityId = entityId;
    }

    if (taxYear) {
      // Filter by taxYear contained in the document name/filename
      where.name = {
        contains: taxYear,
        mode: "insensitive",
      };
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        entity: {
          select: { id: true, name: true },
        },
        investor: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (err: any) {
    logger.error("[k1]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: err.message || "Failed to fetch K-1 documents" },
      { status: 500 },
    );
  }
}
