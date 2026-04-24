/**
 * Dwolla integration client.
 *
 * Uses the official `dwolla-v2` SDK. Dwolla issues application-scoped OAuth tokens
 * (client_credentials) which are acquired lazily by the SDK on first call.
 *
 * Environment:
 *   DWOLLA_KEY            — application key (client_id)
 *   DWOLLA_SECRET         — application secret
 *   DWOLLA_ENV            — "sandbox" | "production" (default: sandbox)
 *   DWOLLA_MASTER_CUSTOMER_URL — (optional) URL of the Calafia-level Verified
 *                                Business Customer used as the PARENT for
 *                                per-entity funding sources. If each fund gets
 *                                its own Dwolla Verified Customer, leave unset
 *                                and pass customer URLs per-entity instead.
 *
 * Docs:
 *   https://developers.dwolla.com/api-reference
 *   https://developers.dwolla.com/concepts/customer-types
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Client as DwollaClient } from "dwolla-v2";

export type DwollaEnv = "sandbox" | "production";

export function getDwollaEnv(): DwollaEnv {
  const env = (process.env.DWOLLA_ENV ?? "sandbox").toLowerCase();
  return env === "production" ? "production" : "sandbox";
}

export function isDwollaConfigured(): boolean {
  return Boolean(process.env.DWOLLA_KEY && process.env.DWOLLA_SECRET);
}

let cachedClient: DwollaClient | null = null;

export function getDwollaClient(): DwollaClient {
  if (!isDwollaConfigured()) {
    throw new Error(
      "Dwolla credentials not configured. Set DWOLLA_KEY and DWOLLA_SECRET.",
    );
  }
  if (cachedClient) return cachedClient;
  cachedClient = new DwollaClient({
    key: process.env.DWOLLA_KEY as string,
    secret: process.env.DWOLLA_SECRET as string,
    environment: getDwollaEnv(),
  });
  return cachedClient;
}

/** Extract the trailing id from a Dwolla resource URL (e.g. .../customers/<id>). */
export function extractDwollaId(url: string | undefined | null): string | null {
  if (!url) return null;
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

// ── Customers ──────────────────────────────────────────────────

export interface CreateReceiveOnlyCustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  businessName?: string; // if set, creates a "receive-only" business customer
}

/**
 * Create a Dwolla "receive-only" customer for an investor. Receive-only
 * customers can be credited via ACH but cannot send funds — sufficient for
 * investors who only receive distributions. If an investor later needs to
 * fund capital calls via Dwolla pull, upgrade the record with verification.
 *
 * Returns the customer's URL id (the trailing portion of the Location header).
 */
export async function createReceiveOnlyCustomer(
  input: CreateReceiveOnlyCustomerInput,
): Promise<{ customerUrl: string; customerId: string }> {
  const client = getDwollaClient();
  const body: Record<string, string> = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    type: "receive-only",
  };
  if (input.businessName) body.businessName = input.businessName;

  const res = await client.post("customers", body);
  const customerUrl = res.headers.get("location");
  if (!customerUrl) {
    throw new Error("Dwolla did not return a customer Location header");
  }
  const customerId = extractDwollaId(customerUrl);
  if (!customerId) {
    throw new Error(`Could not parse customer id from ${customerUrl}`);
  }
  return { customerUrl, customerId };
}

/** Fetch a customer record by URL id. */
export async function getCustomer(customerId: string): Promise<any> {
  const client = getDwollaClient();
  const res = await client.get(`customers/${customerId}`);
  return res.body;
}

// ── Funding sources (via Plaid processor token) ─────────────────

/**
 * Attach a bank account to a Dwolla customer using a Plaid-issued processor
 * token. This is the recommended flow: the user authenticates with their
 * bank via Plaid Link; Plaid issues a processor_token; we hand it to Dwolla
 * which creates a verified funding source without Atlas ever seeing the
 * raw routing/account numbers.
 */
export async function createFundingSourceFromPlaidToken(params: {
  customerId: string;
  plaidProcessorToken: string;
  accountNickname: string;
}): Promise<{ fundingSourceUrl: string; fundingSourceId: string }> {
  const client = getDwollaClient();
  const res = await client.post(
    `customers/${params.customerId}/funding-sources`,
    {
      plaidToken: params.plaidProcessorToken,
      name: params.accountNickname,
    },
  );
  const fundingSourceUrl = res.headers.get("location");
  if (!fundingSourceUrl) {
    throw new Error("Dwolla did not return a funding source Location header");
  }
  const fundingSourceId = extractDwollaId(fundingSourceUrl);
  if (!fundingSourceId) {
    throw new Error(`Could not parse funding source id from ${fundingSourceUrl}`);
  }
  return { fundingSourceUrl, fundingSourceId };
}

/** Fetch a funding source record by URL id. */
export async function getFundingSource(fundingSourceId: string): Promise<any> {
  const client = getDwollaClient();
  const res = await client.get(`funding-sources/${fundingSourceId}`);
  return res.body;
}

/** Remove (soft-delete) a funding source. */
export async function removeFundingSource(fundingSourceId: string): Promise<void> {
  const client = getDwollaClient();
  await client.post(`funding-sources/${fundingSourceId}`, { removed: true });
}

// ── Transfers (Phase B — not yet exercised but helper available) ─

export interface CreateTransferInput {
  sourceFundingSourceId: string;
  destinationFundingSourceId: string;
  amount: number; // dollars
  correlationId?: string; // our own id for reconciling webhooks → DB row
  metadata?: Record<string, string>;
}

/**
 * Initiate an ACH transfer between two funding sources. Returns the transfer
 * URL id for webhook reconciliation.
 */
export async function createTransfer(
  input: CreateTransferInput,
): Promise<{ transferUrl: string; transferId: string }> {
  const client = getDwollaClient();
  const base = getDwollaEnv() === "production"
    ? "https://api.dwolla.com"
    : "https://api-sandbox.dwolla.com";
  const body: Record<string, unknown> = {
    _links: {
      source: { href: `${base}/funding-sources/${input.sourceFundingSourceId}` },
      destination: { href: `${base}/funding-sources/${input.destinationFundingSourceId}` },
    },
    amount: {
      currency: "USD",
      value: input.amount.toFixed(2),
    },
  };
  if (input.correlationId) body.correlationId = input.correlationId;
  if (input.metadata) body.metadata = input.metadata;

  const res = await client.post("transfers", body);
  const transferUrl = res.headers.get("location");
  if (!transferUrl) {
    throw new Error("Dwolla did not return a transfer Location header");
  }
  const transferId = extractDwollaId(transferUrl);
  if (!transferId) {
    throw new Error(`Could not parse transfer id from ${transferUrl}`);
  }
  return { transferUrl, transferId };
}

/** Map a Dwolla customer status string to our enum. */
export function mapDwollaCustomerStatus(
  status: string | undefined | null,
):
  | "UNVERIFIED"
  | "RETRY"
  | "DOCUMENT"
  | "VERIFIED"
  | "SUSPENDED"
  | "DEACTIVATED" {
  switch ((status ?? "").toLowerCase()) {
    case "verified":
      return "VERIFIED";
    case "retry":
      return "RETRY";
    case "document":
      return "DOCUMENT";
    case "suspended":
      return "SUSPENDED";
    case "deactivated":
      return "DEACTIVATED";
    default:
      return "UNVERIFIED";
  }
}

/** Map a Dwolla funding source status string to our enum. */
export function mapFundingSourceStatus(
  status: string | undefined | null,
): "UNVERIFIED" | "PENDING" | "VERIFIED" | "REMOVED" {
  switch ((status ?? "").toLowerCase()) {
    case "verified":
      return "VERIFIED";
    case "unverified":
      return "UNVERIFIED";
    case "pending":
      return "PENDING";
    case "removed":
      return "REMOVED";
    default:
      return "UNVERIFIED";
  }
}
