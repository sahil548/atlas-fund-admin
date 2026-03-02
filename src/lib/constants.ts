// Demo investor ID — replace with authenticated user context when auth is added
export const INVESTOR_ID = "investor-1";

// ── Shared Taxonomy Labels & Colors ────────────────────────

export const ASSET_CLASS_LABELS: Record<string, string> = {
  REAL_ESTATE: "Real Estate",
  PUBLIC_SECURITIES: "Public Securities",
  VENTURE_CAPITAL: "Venture Capital",
  INFRASTRUCTURE: "Infrastructure",
  COMMODITIES: "Commodities",
  DIVERSIFIED: "Diversified",
  NON_CORRELATED: "Non-Correlated",
  CASH_AND_EQUIVALENTS: "Cash",
};

export const ASSET_CLASS_COLORS: Record<string, string> = {
  REAL_ESTATE: "green",
  PUBLIC_SECURITIES: "blue",
  VENTURE_CAPITAL: "purple",
  INFRASTRUCTURE: "orange",
  COMMODITIES: "yellow",
  DIVERSIFIED: "indigo",
  NON_CORRELATED: "red",
  CASH_AND_EQUIVALENTS: "gray",
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
