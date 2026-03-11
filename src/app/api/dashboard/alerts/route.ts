import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { buildAlerts } from "@/lib/dashboard-alerts-utils";
import { logger } from "@/lib/logger";

/**
 * GET /api/dashboard/alerts
 *
 * Returns cross-module alerts for the morning briefing:
 *   - Overdue capital calls (ISSUED status, past dueDate)
 *   - Covenant breaches (currentStatus = BREACH)
 *   - Expiring leases (ACTIVE, leaseEndDate within 90 days)
 *
 * Response: { alerts: [...sortedByDate], counts: { overdueCapitalCalls, covenantBreaches, leaseExpiries } }
 */
export async function GET(req: Request) {
  try {
    const authUser = await getAuthUser();
    const url = new URL(req.url);
    const firmId =
      authUser?.firmId ?? url.searchParams.get("firmId") ?? undefined;

    const today = new Date();
    const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const entityFilter = firmId ? { entity: { firmId } } : {};
    const assetEntityFilter = firmId
      ? { entityAllocations: { some: { entity: { firmId } } } }
      : {};

    const [overdueCapitalCalls, covenantBreaches, expiringLeases] =
      await Promise.all([
        // (a) Overdue capital calls: ISSUED status, dueDate in the past
        prisma.capitalCall.findMany({
          where: {
            ...entityFilter,
            status: "ISSUED",
            dueDate: { lt: today },
          },
          include: {
            entity: { select: { id: true, name: true } },
          },
          take: 20,
        }),

        // (b) Covenant breaches: currentStatus = BREACH
        prisma.covenant.findMany({
          where: {
            currentStatus: "BREACH",
            agreement: {
              asset: assetEntityFilter,
            },
          },
          include: {
            agreement: {
              include: {
                asset: { select: { id: true, name: true } },
              },
            },
          },
          take: 20,
        }),

        // (c) Expiring leases: ACTIVE, leaseEndDate within next 90 days
        prisma.lease.findMany({
          where: {
            asset: assetEntityFilter,
            currentStatus: "ACTIVE",
            leaseEndDate: {
              gte: today,
              lte: ninetyDaysFromNow,
            },
          },
          include: {
            asset: { select: { id: true, name: true } },
          },
          take: 20,
        }),
      ]);

    const result = buildAlerts(overdueCapitalCalls, covenantBreaches, expiringLeases);

    return NextResponse.json(result);
  } catch (err) {
    logger.error("[dashboard/alerts] Error:", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to load dashboard alerts" },
      { status: 500 }
    );
  }
}
