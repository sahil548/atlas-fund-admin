import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { getValidTokens } from "@/lib/accounting/token-manager";
import { qboProvider } from "@/lib/accounting/qbo-provider";
import { detectAtlasBucket } from "@/lib/accounting/provider-types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return unauthorized();

    const { connectionId } = await params;
    const { searchParams } = new URL(req.url);
    const suggestFromConnectionId = searchParams.get("suggestFrom");

    // Load connection with entity for firm ownership check
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

    // Fetch chart of accounts from QBO
    const accounts = await qboProvider.fetchChartOfAccounts(tokens);

    // Build a map of existing mappings: providerAccountId -> atlasAccountType
    const mappingMap = new Map<string, string>();
    for (const m of connection.accountMappings) {
      if (m.providerAccountId) {
        mappingMap.set(m.providerAccountId, m.atlasAccountType);
      }
    }

    // Optionally load suggestion mappings from another connection
    const suggestMap = new Map<string, string>();
    if (suggestFromConnectionId) {
      const sourceMappings = await prisma.accountMapping.findMany({
        where: { connectionId: suggestFromConnectionId },
      });
      for (const m of sourceMappings) {
        if (m.providerAccountName) {
          suggestMap.set(m.providerAccountName.toLowerCase(), m.atlasAccountType);
        }
      }
    }

    let unmappedCount = 0;

    const enriched = accounts.map((acct) => {
      // Try name-based suggestion from reference connection first, then auto-detect
      let suggestedBucket: string | null = null;
      if (suggestFromConnectionId && suggestMap.has(acct.accountName.toLowerCase())) {
        suggestedBucket = suggestMap.get(acct.accountName.toLowerCase()) ?? null;
      } else {
        suggestedBucket = detectAtlasBucket(acct);
      }

      const currentMapping = mappingMap.get(acct.accountId) ?? null;
      const isMapped = currentMapping !== null;

      // Only count balance-sheet accounts as needing mapping
      if (suggestedBucket !== null && !isMapped) {
        unmappedCount++;
      }

      return {
        accountId: acct.accountId,
        accountName: acct.accountName,
        accountType: acct.accountType,
        accountSubType: acct.accountSubType,
        classification: acct.classification,
        currentBalance: acct.currentBalance,
        isActive: acct.isActive,
        suggestedBucket,
        currentMapping,
        isMapped,
      };
    });

    return NextResponse.json({
      accounts: enriched,
      unmappedCount,
      totalAccounts: accounts.length,
    });
  } catch (err: unknown) {
    console.error("[chart-of-accounts] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch chart of accounts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
