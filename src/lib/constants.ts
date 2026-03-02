// Demo investor ID — replace with authenticated user context when auth is added
export const INVESTOR_ID = "investor-1";

// ── Shared Taxonomy Labels & Colors ────────────────────────

export const ASSET_CLASS_LABELS: Record<string, string> = {
  CASH_AND_EQUIVALENTS: "Cash",
  PUBLIC_SECURITIES: "Public Securities",
  REAL_ESTATE: "Real Estate",
  INFRASTRUCTURE: "Infrastructure",
  OPERATING_BUSINESS: "Operating Business",
  DIVERSIFIED: "Diversified",
  NON_CORRELATED: "Non-Correlated",
  COMMODITIES: "Commodities",
};

export const ASSET_CLASS_COLORS: Record<string, string> = {
  CASH_AND_EQUIVALENTS: "gray",
  PUBLIC_SECURITIES: "blue",
  REAL_ESTATE: "green",
  INFRASTRUCTURE: "orange",
  OPERATING_BUSINESS: "purple",
  DIVERSIFIED: "indigo",
  NON_CORRELATED: "red",
  COMMODITIES: "yellow",
};

export const CAPITAL_INSTRUMENT_LABELS: Record<string, string> = {
  DEBT: "Debt",
  EQUITY: "Equity",
};

export const PARTICIPATION_LABELS: Record<string, string> = {
  DIRECT_GP: "Direct / GP",
  CO_INVEST_JV_PARTNERSHIP: "Co-Invest / JV",
  LP_STAKE_SILENT_PARTNER: "LP Stake",
};
