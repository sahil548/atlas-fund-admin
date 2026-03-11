import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { getValidTokens } from "@/lib/accounting/token-manager";
import { qboProvider } from "@/lib/accounting/qbo-provider";
import { logger } from "@/lib/logger";

/** Get the last day of the previous month as YYYY-MM-DD */
function lastDayOfPreviousMonth(): string {
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 1);
  return lastOfPrevMonth.toISOString().split("T")[0];
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();

    const { connectionId } = await params;
    const { searchParams } = new URL(req.url);
    const asOfDate = searchParams.get("asOfDate") ?? lastDayOfPreviousMonth();

    // Load connection with entity for firm check
    const connection = await prisma.accountingConnection.findUnique({
      where: { id: connectionId },
      include: { entity: { select: { firmId: true } } },
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    // Verify firm ownership
    if (connection.entity.firmId !== authUser.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get valid tokens
    const tokens = await getValidTokens(connectionId);
    if (!tokens) {
      return NextResponse.json(
        { error: "OAuth tokens expired or missing. Please reconnect." },
        { status: 401 }
      );
    }

    // Mark connection as SYNCING
    await prisma.accountingConnection.update({
      where: { id: connectionId },
      data: { syncStatus: "SYNCING" },
    });

    try {
      // Fetch trial balance from QBO
      const result = await qboProvider.fetchTrialBalance(tokens, asOfDate);

      // Calculate isBalanced
      const isBalanced = Math.abs(result.totalDebits - result.totalCredits) < 0.01;

      // Upsert trial balance snapshot by (connectionId, periodDate)
      const periodDate = new Date(result.periodDate);

      const snapshot = await prisma.trialBalanceSnapshot.upsert({
        where: {
          connectionId_periodDate: {
            connectionId,
            periodDate,
          },
        },
        update: {
          accountData: result.entries as unknown as import("@prisma/client").Prisma.InputJsonValue,
          totalDebits: result.totalDebits,
          totalCredits: result.totalCredits,
          isBalanced,
          syncedAt: new Date(),
        },
        create: {
          connectionId,
          periodDate,
          accountData: result.entries as unknown as import("@prisma/client").Prisma.InputJsonValue,
          totalDebits: result.totalDebits,
          totalCredits: result.totalCredits,
          isBalanced,
        },
      });

      // Count unreconciled items if not balanced
      const unreconciledItems = isBalanced ? 0 : result.entries.filter(
        (e) => Math.abs(e.debit - e.credit) > 0.01 && (e.debit > 0 || e.credit > 0)
      ).length;

      // Update connection: CONNECTED, lastSyncAt, clear error
      await prisma.accountingConnection.update({
        where: { id: connectionId },
        data: {
          syncStatus: "CONNECTED",
          lastSyncAt: new Date(),
          lastSyncError: null,
          ...(unreconciledItems > 0 ? { unreconciledItems } : { unreconciledItems: 0 }),
        },
      });

      return NextResponse.json({
        snapshot: {
          id: snapshot.id,
          periodDate: snapshot.periodDate,
          syncedAt: snapshot.syncedAt,
          totalDebits: snapshot.totalDebits,
          totalCredits: snapshot.totalCredits,
          isBalanced: snapshot.isBalanced,
          entryCount: result.entries.length,
        },
        syncStatus: "CONNECTED",
        asOfDate,
      });
    } catch (syncErr: unknown) {
      const message = syncErr instanceof Error ? syncErr.message : "Sync failed";

      // Mark connection ERROR, keep lastSyncAt unchanged
      await prisma.accountingConnection.update({
        where: { id: connectionId },
        data: {
          syncStatus: "ERROR",
          lastSyncError: message,
        },
      });

      return NextResponse.json(
        { error: `Trial balance sync failed: ${message}` },
        { status: 500 }
      );
    }
  } catch (err: unknown) {
    logger.error("[sync] Error:", { error: err instanceof Error ? err.message : String(err) });
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
