/**
 * Plaid integration client.
 * Uses the official Plaid SDK for Link Token generation (required by Plaid).
 * Per-entity connections mirroring the QBO pattern.
 */

import { PlaidApi, PlaidEnvironments, Configuration, Products, CountryCode } from "plaid";
import type { IntegrationConnection } from "@prisma/client";

export { Products, CountryCode };

export function isPlaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

export function getPlaidClientExported(): PlaidApi {
  return getPlaidClient();
}

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

// ── Investor bank-link flow (Dwolla funding source) ────────────

/**
 * Create a Plaid Link token for an INVESTOR to link their personal bank
 * account for receiving distributions. Scoped with the investor id so a
 * single Plaid institution connection stays distinct per investor.
 *
 * Uses only the Auth product (account/routing for ACH) — we don't pull
 * transactions for investor bank accounts, keeping scope minimal.
 */
export async function createInvestorLinkToken(params: {
  investorId: string;
  investorName: string;
}): Promise<string> {
  const plaid = getPlaidClient();
  const resp = await plaid.linkTokenCreate({
    user: {
      client_user_id: `investor__${params.investorId}`,
      legal_name: params.investorName,
    },
    client_name: "Atlas Fund Administration",
    products: [Products.Auth],
    country_codes: [CountryCode.Us],
    language: "en",
    // Restrict to checking/savings only. Dwolla can't receive ACH into
    // investment / brokerage / cash-management accounts, so showing them
    // in the picker would lead to inevitable downstream rejection.
    // The SDK type for account_subtypes is DepositoryAccountSubtype (enum);
    // cast through unknown so we don't have to version-track the enum import.
    account_filters: {
      depository: {
        account_subtypes: ["checking", "savings"] as unknown as never[],
      },
    },
  });
  return resp.data.link_token;
}

/**
 * Exchange a Plaid public_token received from Plaid Link for a permanent
 * access_token. Use this before calling createProcessorToken.
 */
export async function exchangeInvestorPublicToken(
  publicToken: string,
): Promise<{ accessToken: string; itemId: string }> {
  const plaid = getPlaidClient();
  const resp = await plaid.itemPublicTokenExchange({ public_token: publicToken });
  return { accessToken: resp.data.access_token, itemId: resp.data.item_id };
}

/**
 * List the bank accounts available on a Plaid Item, so the user can pick
 * which one to register as a Dwolla funding source (or we can take the first
 * depository account automatically for single-account items).
 */
export async function listAuthAccounts(accessToken: string): Promise<
  Array<{
    accountId: string;
    name: string;
    officialName: string | null;
    type: string;
    subtype: string | null;
    mask: string | null;
  }>
> {
  const plaid = getPlaidClient();
  const resp = await plaid.authGet({ access_token: accessToken });
  return resp.data.accounts.map((a) => ({
    accountId: a.account_id,
    name: a.name,
    officialName: a.official_name ?? null,
    type: a.type,
    subtype: a.subtype ?? null,
    mask: a.mask ?? null,
  }));
}

/**
 * Create a Plaid "processor token" scoped for Dwolla. This token is handed
 * to Dwolla to create a funding source without Atlas ever holding raw
 * account/routing numbers.
 */
export async function createProcessorTokenForDwolla(params: {
  accessToken: string;
  accountId: string;
}): Promise<string> {
  const plaid = getPlaidClient();
  // Plaid SDK types don't expose processorTokenCreate for all processor enums
  // uniformly across versions — use the loose call shape and cast.
  const resp = await (plaid as unknown as {
    processorTokenCreate: (args: {
      access_token: string;
      account_id: string;
      processor: string;
    }) => Promise<{ data: { processor_token: string } }>;
  }).processorTokenCreate({
    access_token: params.accessToken,
    account_id: params.accountId,
    processor: "dwolla",
  });
  return resp.data.processor_token;
}
