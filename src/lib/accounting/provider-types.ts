// Provider-agnostic interfaces — Xero will implement these same interfaces later

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;  // ISO date
  refreshTokenExpiresAt: string; // ISO date
  realmId: string;               // QBO company ID / Xero tenant ID
}

export interface ChartOfAccountsEntry {
  accountId: string;
  accountName: string;
  accountType: string;        // provider-native type (e.g., "Bank", "Accounts Receivable")
  accountSubType?: string;    // provider-native subtype
  currentBalance: number;
  classification: string;     // "Asset", "Liability", "Equity", "Revenue", "Expense"
  isActive: boolean;
}

export type AtlasAccountBucket =
  | "CASH"
  | "INVESTMENTS_AT_COST"
  | "OTHER_ASSETS"
  | "LIABILITIES"
  | "EQUITY_PARTNERS_CAPITAL";

export interface TrialBalanceEntry {
  accountId: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalanceResult {
  periodDate: string;         // ISO date — as-of date
  entries: TrialBalanceEntry[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface AccountingProviderInterface {
  /** Get the OAuth authorization URL to redirect the user to */
  getAuthorizationUrl(entityId: string, state: string): string;

  /** Exchange authorization code for tokens */
  exchangeCodeForTokens(code: string, realmId: string): Promise<OAuthTokens>;

  /** Refresh expired access token using refresh token */
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;

  /** Fetch chart of accounts from the provider */
  fetchChartOfAccounts(tokens: OAuthTokens): Promise<ChartOfAccountsEntry[]>;

  /** Fetch trial balance for a given period */
  fetchTrialBalance(tokens: OAuthTokens, asOfDate: string): Promise<TrialBalanceResult>;

  /** Revoke OAuth tokens (on disconnect) */
  revokeTokens(tokens: OAuthTokens): Promise<void>;
}

/** Auto-detect which Atlas bucket a provider account maps to based on account type/classification */
export function detectAtlasBucket(entry: ChartOfAccountsEntry): AtlasAccountBucket | null {
  const type = entry.accountType.toLowerCase();
  const subType = (entry.accountSubType || "").toLowerCase();
  const name = entry.accountName.toLowerCase();
  const classification = entry.classification.toLowerCase();

  // Cash detection
  if (
    type === "bank" ||
    subType.includes("cash") ||
    subType.includes("checking") ||
    subType.includes("savings") ||
    subType.includes("money market")
  ) {
    return "CASH";
  }

  // Investments at cost — look for investment-related accounts
  if (
    name.includes("investment") ||
    name.includes("portfolio") ||
    subType.includes("investment") ||
    (classification === "asset" &&
      (name.includes("equity") || name.includes("loan") || name.includes("note receivable")))
  ) {
    return "INVESTMENTS_AT_COST";
  }

  // Liabilities
  if (classification === "liability") {
    return "LIABILITIES";
  }

  // Equity / Partners' Capital
  if (
    classification === "equity" ||
    type.includes("equity") ||
    name.includes("partner") ||
    name.includes("capital")
  ) {
    return "EQUITY_PARTNERS_CAPITAL";
  }

  // Other assets (catch-all for remaining asset accounts)
  if (classification === "asset") {
    return "OTHER_ASSETS";
  }

  // Revenue/Expense accounts don't map to any bucket (balance sheet only)
  return null;
}
