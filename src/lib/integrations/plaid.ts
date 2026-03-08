/**
 * Plaid integration client.
 * Uses the official Plaid SDK for Link Token generation (required by Plaid).
 * Per-entity connections mirroring the QBO pattern.
 */

import { PlaidApi, PlaidEnvironments, Configuration, Products, CountryCode } from "plaid";
import type { IntegrationConnection } from "@prisma/client";

function getPlaidClient(): PlaidApi {
  const clientId = process.env.PLAID_CLIENT_ID ?? "";
  const secret = process.env.PLAID_SECRET ?? "";
  const envName = (process.env.PLAID_ENV ?? "sandbox") as keyof typeof PlaidEnvironments;
  const basePath = PlaidEnvironments[envName] ?? PlaidEnvironments.sandbox;

  const config = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  return new PlaidApi(config);
}

export interface PlaidAccountData {
  accountId: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  currentBalance: number | null;
  availableBalance: number | null;
}

export interface PlaidTransaction {
  transactionId: string;
  accountId: string;
  name: string;
  amount: number;
  date: string;
  category: string[] | null;
  pending: boolean;
}

/**
 * Create a Plaid Link token for the given firm/entity.
 * Returns the link_token to be used with Plaid Link on the client.
 */
export async function createLinkToken(
  firmId: string,
  entityId: string
): Promise<string> {
  const plaid = getPlaidClient();

  const resp = await plaid.linkTokenCreate({
    user: {
      client_user_id: `${firmId}__${entityId}`,
    },
    client_name: "Atlas Fund Administration",
    products: [Products.Auth, Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
  });

  return resp.data.link_token;
}

/**
 * Exchange a Plaid public_token (from Link) for a permanent access_token.
 * Returns { accessToken, itemId } to be stored in IntegrationConnection.
 */
export async function exchangePublicToken(
  publicToken: string,
  _firmId: string,
  _entityId: string
): Promise<{ accessToken: string; itemId: string }> {
  const plaid = getPlaidClient();

  const resp = await plaid.itemPublicTokenExchange({
    public_token: publicToken,
  });

  return {
    accessToken: resp.data.access_token,
    itemId: resp.data.item_id,
  };
}

/**
 * Fetch account balances for a Plaid connection.
 */
export async function getAccounts(
  connection: IntegrationConnection
): Promise<PlaidAccountData[]> {
  const plaid = getPlaidClient();

  const resp = await plaid.accountsBalanceGet({
    access_token: connection.accessToken,
  });

  return resp.data.accounts.map((acct) => ({
    accountId: acct.account_id,
    name: acct.name,
    officialName: acct.official_name ?? null,
    type: acct.type,
    subtype: acct.subtype ?? null,
    currentBalance: acct.balances.current ?? null,
    availableBalance: acct.balances.available ?? null,
  }));
}

/**
 * Fetch recent transactions for a Plaid connection.
 */
export async function getTransactions(
  connection: IntegrationConnection,
  startDate: string, // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
): Promise<PlaidTransaction[]> {
  const plaid = getPlaidClient();

  const resp = await plaid.transactionsGet({
    access_token: connection.accessToken,
    start_date: startDate,
    end_date: endDate,
    options: {
      count: 100,
      offset: 0,
    },
  });

  return resp.data.transactions.map((txn) => ({
    transactionId: txn.transaction_id,
    accountId: txn.account_id,
    name: txn.name,
    amount: txn.amount,
    date: txn.date,
    category: txn.category ?? null,
    pending: txn.pending,
  }));
}
