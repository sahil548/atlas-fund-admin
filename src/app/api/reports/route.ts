/**
 * GET /api/reports
 * List generated reports (Documents with category REPORT or STATEMENT).
 * Filtered by firmId, optional entityId.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    const firmId =
      authUser?.firmId || req.nextUrl.searchParams.get("firmId");

    if (!firmId) {
      return NextResponse.json({ error: "firmId required" }, { status: 400 });
    }

    const entityId = req.nextUrl.searchParams.get("entityId") || undefined;

    // Build where clause: Documents with REPORT or STATEMENT category
    // belonging to entities of the given firm
    const where: Record<string, unknown> = {
      category: { in: ["REPORT", "STATEMENT"] },
    };

    if (entityId) {
      where.entityId = entityId;
      // Verify entity belongs to the firm
      const entity = await prisma.entity.findFirst({
        where: { id: entityId, firmId },
        select: { id: true },
      });
      if (!entity) {
        return NextResponse.json({ error: "Entity not found" }, { status: 404 });
      }
    } else {
      // Filter to entities of this firm
      const firmEntities = await prisma.entity.findMany({
        where: { firmId },
        select: { id: true },
      });
      const entityIds = firmEntities.map((e) => e.id);
      where.entityId = { in: entityIds };
    }

    const docs = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        entity: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(docs);
  } catch (err) {
    console.error("[reports]", err);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
