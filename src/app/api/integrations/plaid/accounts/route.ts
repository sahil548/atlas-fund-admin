/**
 * GET /api/integrations/plaid/accounts?entityId=xxx
 *
 * Returns Plaid account balances + recent transactions for the given entity.
 * Also syncs/caches account data in PlaidAccount model.
 */

import { NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccounts, getTransactions } from "@/lib/integrations/plaid";

export async function GET(req: Request): Promise<Response> {
  const authUser = await getAuthUser();
  if (!authUser) return unauthorized();

  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entityId");

  if (!entityId) {
    return NextResponse.json({ error: "entityId query param required" }, { status: 400 });
  }

  const firmId = authUser.firmId;

  // Verify entity belongs to firm
  const entity = await prisma.entity.findFirst({
    where: { id: entityId, firmId },
  });
  if (!entity) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  // Find Plaid connection for this entity
  const connection = await prisma.integrationConnection.findFirst({
    where: { firmId, provider: "plaid", entityId },
  });

  if (!connection) {
    return NextResponse.json({
      connected: false,
      accounts: [],
      transactions: [],
    });
  }

  // Fetch accounts from Plaid
  let accounts = [];
  let transactions = [];

  try {
    accounts = await getAccounts(connection);

    // Sync accounts to cache
    await Promise.all(
      accounts.map((acct) =>
        prisma.plaidAccount.upsert({
          where: {
            connectionId_accountId: {
              connectionId: connection.id,
              accountId: acct.accountId,
            },
          },
          create: {
            connectionId: connection.id,
            accountId: acct.accountId,
            name: acct.name,
            type: acct.type,
            subtype: acct.subtype,
            currentBalance: acct.currentBalance,
            availableBalance: acct.availableBalance,
            lastSynced: new Date(),
          },
          update: {
            name: acct.name,
            type: acct.type,
            subtype: acct.subtype,
            currentBalance: acct.currentBalance,
            availableBalance: acct.availableBalance,
            lastSynced: new Date(),
          },
        })
      )
    );

    // Fetch last 30 days of transactions
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    transactions = await getTransactions(connection, startDate, endDate);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch Plaid data";
    console.error("[plaid/accounts]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    connected: true,
    entityId,
    accounts,
    transactions: transactions.slice(0, 50), // return last 50
  });
}
