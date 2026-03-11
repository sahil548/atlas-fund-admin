import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import type { TrialBalanceEntry } from "@/lib/accounting/provider-types";
import { logger } from "@/lib/logger";

type AtlasBucketKey =
  | "CASH"
  | "INVESTMENTS_AT_COST"
  | "OTHER_ASSETS"
  | "LIABILITIES"
  | "EQUITY_PARTNERS_CAPITAL"
  | "UNMAPPED";

interface BucketData {
  accounts: (TrialBalanceEntry & { atlasAccountType: string })[];
  total: number;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();

    const { connectionId } = await params;
    const { searchParams } = new URL(req.url);
    const periodDateParam = searchParams.get("periodDate");
    const listOnly = searchParams.get("list") === "true";

    // Verify firm ownership
    const connection = await prisma.accountingConnection.findUnique({
      where: { id: connectionId },
      include: {
        entity: { select: { firmId: true } },
        accountMappings: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    if (connection.entity.firmId !== authUser.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If list=true, return all available period dates
    if (listOnly) {
      const snapshots = await prisma.trialBalanceSnapshot.findMany({
        where: { connectionId },
        select: { periodDate: true },
        orderBy: { periodDate: "desc" },
      });

      const availablePeriods = snapshots.map((s) =>
        s.periodDate.toISOString().split("T")[0]
      );

      return NextResponse.json({ availablePeriods });
    }

    // Fetch specific or most recent snapshot
    let snapshot;
    if (periodDateParam) {
      snapshot = await prisma.trialBalanceSnapshot.findUnique({
        where: {
          connectionId_periodDate: {
            connectionId,
            periodDate: new Date(periodDateParam),
          },
        },
      });
    } else {
      snapshot = await prisma.trialBalanceSnapshot.findFirst({
        where: { connectionId },
        orderBy: { periodDate: "desc" },
      });
    }

    if (!snapshot) {
      return NextResponse.json({
        periodDate: null,
        syncedAt: null,
        isBalanced: true,
        totalDebits: 0,
        totalCredits: 0,
        buckets: {
          CASH: { accounts: [], total: 0 },
          INVESTMENTS_AT_COST: { accounts: [], total: 0 },
          OTHER_ASSETS: { accounts: [], total: 0 },
          LIABILITIES: { accounts: [], total: 0 },
          EQUITY_PARTNERS_CAPITAL: { accounts: [], total: 0 },
          UNMAPPED: { accounts: [], total: 0 },
        },
        availablePeriods: [],
      });
    }

    // Build mapping: providerAccountId -> atlasAccountType
    const mappingByAccountId = new Map<string, string>();
    const mappingByAccountName = new Map<string, string>();
    for (const m of connection.accountMappings) {
      if (m.providerAccountId) {
        mappingByAccountId.set(m.providerAccountId, m.atlasAccountType);
      }
      if (m.providerAccountName) {
        mappingByAccountName.set(m.providerAccountName.toLowerCase(), m.atlasAccountType);
      }
    }

    // Parse accountData from JSON
    const entries = snapshot.accountData as unknown as TrialBalanceEntry[];

    // Organize entries by bucket
    const buckets: Record<AtlasBucketKey, BucketData> = {
      CASH: { accounts: [], total: 0 },
      INVESTMENTS_AT_COST: { accounts: [], total: 0 },
      OTHER_ASSETS: { accounts: [], total: 0 },
      LIABILITIES: { accounts: [], total: 0 },
      EQUITY_PARTNERS_CAPITAL: { accounts: [], total: 0 },
      UNMAPPED: { accounts: [], total: 0 },
    };

    for (const entry of entries) {
      // Look up bucket by accountId first, then by name
      let bucket: AtlasBucketKey | undefined =
        (mappingByAccountId.get(entry.accountId) as AtlasBucketKey) ??
        (mappingByAccountName.get(entry.accountName.toLowerCase()) as AtlasBucketKey);

      if (!bucket || !(bucket in buckets)) {
        bucket = "UNMAPPED";
      }

      const enrichedEntry = { ...entry, atlasAccountType: bucket };
      buckets[bucket].accounts.push(enrichedEntry);
      buckets[bucket].total += entry.balance;
    }

    // Get available periods for the period selector dropdown
    const allSnapshots = await prisma.trialBalanceSnapshot.findMany({
      where: { connectionId },
      select: { periodDate: true },
      orderBy: { periodDate: "desc" },
    });

    const availablePeriods = allSnapshots.map((s) =>
      s.periodDate.toISOString().split("T")[0]
    );

    return NextResponse.json({
      periodDate: snapshot.periodDate.toISOString().split("T")[0],
      syncedAt: snapshot.syncedAt.toISOString(),
      isBalanced: snapshot.isBalanced,
      totalDebits: snapshot.totalDebits,
      totalCredits: snapshot.totalCredits,
      buckets,
      availablePeriods,
    });
  } catch (err: unknown) {
    logger.error("[trial-balance] Error:", { error: err instanceof Error ? err.message : String(err) });
    const message = err instanceof Error ? err.message : "Failed to fetch trial balance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
