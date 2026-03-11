/**
 * QBO (QuickBooks Online) implementation of AccountingProviderInterface.
 * Uses raw HTTP fetch to Intuit OAuth2 and REST API endpoints.
 * No node-quickbooks dependency — direct v3 REST calls.
 */

import type {
  AccountingProviderInterface,
  ChartOfAccountsEntry,
  OAuthTokens,
  TrialBalanceEntry,
  TrialBalanceResult,
} from "./provider-types";

import { logger } from "@/lib/logger";

const QBO_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QBO_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
const QBO_SCOPE = "com.intuit.quickbooks.accounting";

function getApiBase(realmId: string): string {
  const env = process.env.QBO_ENVIRONMENT ?? "sandbox";
  if (env === "production") {
    return `https://quickbooks.api.intuit.com/v3/company/${realmId}`;
  }
  return `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}`;
}

function getBasicAuthHeader(): string {
  const clientId = process.env.QBO_CLIENT_ID ?? "";
  const clientSecret = process.env.QBO_CLIENT_SECRET ?? "";
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

/** Compute ISO expiry date from seconds-from-now */
function expiresAtFromSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

/**
 * QBO-specific OAuth2 token response shape
 */
interface QBOTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;      // access token lifetime in seconds (~3600)
  x_refresh_token_expires_in: number; // refresh token lifetime in seconds (~8726400 = 101 days)
  token_type: string;
}

export class QBOProvider implements AccountingProviderInterface {
  getAuthorizationUrl(entityId: string, state: string): string {
    const clientId = process.env.QBO_CLIENT_ID ?? "";
    const redirectUri = process.env.QBO_REDIRECT_URI ?? "";

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: QBO_SCOPE,
      state,
    });

    return `${QBO_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, realmId: string): Promise<OAuthTokens> {
    const redirectUri = process.env.QBO_REDIRECT_URI ?? "";

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const resp = await fetch(QBO_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: getBasicAuthHeader(),
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`QBO token exchange failed (${resp.status}): ${text}`);
    }

    const data: QBOTokenResponse = await resp.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: expiresAtFromSeconds(data.expires_in),
      refreshTokenExpiresAt: expiresAtFromSeconds(data.x_refresh_token_expires_in),
      realmId,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const resp = await fetch(QBO_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: getBasicAuthHeader(),
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`QBO token refresh failed (${resp.status}): ${text}`);
    }

    const data: QBOTokenResponse = await resp.json();

    // realmId not returned in refresh — caller must preserve it
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpiresAt: expiresAtFromSeconds(data.expires_in),
      refreshTokenExpiresAt: expiresAtFromSeconds(data.x_refresh_token_expires_in),
      realmId: "", // Will be filled in by token-manager which has the existing realmId
    };
  }

  async fetchChartOfAccounts(tokens: OAuthTokens): Promise<ChartOfAccountsEntry[]> {
    const base = getApiBase(tokens.realmId);
    const query = encodeURIComponent("SELECT * FROM Account WHERE Active = true");
    const url = `${base}/query?query=${query}&minorversion=73`;

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept: "application/json",
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`QBO chart of accounts failed (${resp.status}): ${text}`);
    }

    const data = await resp.json();
    const accounts = data?.QueryResponse?.Account ?? [];

    return accounts.map((acct: Record<string, unknown>) => ({
      accountId: String(acct.Id ?? ""),
      accountName: String(acct.Name ?? ""),
      accountType: String(acct.AccountType ?? ""),
      accountSubType: acct.AccountSubType ? String(acct.AccountSubType) : undefined,
      currentBalance: typeof acct.CurrentBalance === "number" ? acct.CurrentBalance : 0,
      classification: String(acct.Classification ?? ""),
      isActive: acct.Active !== false,
    }));
  }

  async fetchTrialBalance(tokens: OAuthTokens, asOfDate: string): Promise<TrialBalanceResult> {
    const base = getApiBase(tokens.realmId);
    const url = `${base}/reports/TrialBalance?date_macro=Last+Month&minorversion=73`;

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept: "application/json",
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`QBO trial balance failed (${resp.status}): ${text}`);
    }

    const data = await resp.json();

    // Parse the QBO report format
    const rows: Record<string, unknown>[] = data?.Rows?.Row ?? [];
    const entries: TrialBalanceEntry[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const row of rows) {
      const colData = row.ColData as Array<{ value: string }> | undefined;
      if (!colData || colData.length < 3) continue;

      // Skip summary/total rows (they have type="Section" or similar)
      const rowType = row.type as string | undefined;
      if (rowType === "Section" || rowType === "GrandTotal") continue;

      const accountName = colData[0]?.value ?? "";
      const debitStr = colData[1]?.value ?? "0";
      const creditStr = colData[2]?.value ?? "0";

      if (!accountName) continue;

      const debit = parseFloat(debitStr) || 0;
      const credit = parseFloat(creditStr) || 0;
      const balance = debit - credit;

      // Get account ID from row header ColData (QBO uses Id property on some row types)
      // Fall back to account name as unique identifier if not available
      const rowHeader = row.Header as { ColData?: Array<{ value: string; id?: string }> } | undefined;
      const accountId = rowHeader?.ColData?.[0]?.id ?? accountName;

      entries.push({
        accountId: String(accountId),
        accountName,
        accountType: "", // QBO TrialBalance report doesn't include account type
        debit,
        credit,
        balance,
      });

      totalDebits += debit;
      totalCredits += credit;
    }

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    // Use the provided asOfDate or fall back to current date
    const reportDate = data?.Header?.EndPeriod ?? asOfDate;

    return {
      periodDate: reportDate,
      entries,
      totalDebits,
      totalCredits,
      isBalanced,
    };
  }

  async revokeTokens(tokens: OAuthTokens): Promise<void> {
    const body = new URLSearchParams({
      token: tokens.refreshToken,
    });

    // Fire-and-forget — we don't throw on failure
    try {
      await fetch(QBO_REVOKE_URL, {
        method: "POST",
        headers: {
          Authorization: getBasicAuthHeader(),
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
    } catch (err) {
      logger.error("[qbo-provider] Token revocation failed (non-fatal)", { error: err instanceof Error ? err.message : String(err) });
    }
  }
}

export const qboProvider = new QBOProvider();
