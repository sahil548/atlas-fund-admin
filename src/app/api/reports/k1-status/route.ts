/**
 * GET /api/reports/k1-status
 * Returns per-investor K-1 acknowledgment status for GP tracking view.
 *
 * Auth: GP_ADMIN or GP_TEAM with reports permission
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

  // Only GP roles can view K-1 tracking
  if (authUser.role !== "GP_ADMIN" && authUser.role !== "GP_TEAM") {
    return forbidden();
  }

  if (authUser.role === "GP_TEAM") {
    const perms = await getEffectivePermissions(authUser.id);
    if (!checkPermission(perms, "reports", "read_only")) return forbidden();
  }

  try {
    // Fetch all TAX documents for the firm, grouped by investor
    const k1Docs = await prisma.document.findMany({
      where: {
        category: "TAX",
        entity: { firmId: authUser.firmId },
      },
      include: {
        investor: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by investor
    const investorMap = new Map<
      string,
      {
        investorId: string;
        investorName: string;
        total: number;
        acknowledged: number;
        lastAcknowledgedAt: string | null;
      }
    >();

    for (const doc of k1Docs) {
      if (!doc.investor) continue;

      const investorId = doc.investor.id;
      const existing = investorMap.get(investorId);

      if (!existing) {
        investorMap.set(investorId, {
          investorId,
          investorName: doc.investor.name,
          total: 1,
          acknowledged: doc.acknowledgedAt ? 1 : 0,
          lastAcknowledgedAt: doc.acknowledgedAt
            ? doc.acknowledgedAt.toISOString()
            : null,
        });
      } else {
        existing.total += 1;
        if (doc.acknowledgedAt) {
          existing.acknowledged += 1;
          // Track the latest acknowledgedAt
          if (
            !existing.lastAcknowledgedAt ||
            doc.acknowledgedAt.toISOString() > existing.lastAcknowledgedAt
          ) {
            existing.lastAcknowledgedAt = doc.acknowledgedAt.toISOString();
          }
        }
      }
    }

    const result = Array.from(investorMap.values()).map((item) => ({
      ...item,
      pending: item.total - item.acknowledged,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    logger.error("[reports/k1-status]", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: err.message || "Failed to fetch K-1 status" },
      { status: 500 }
    );
  }
}
