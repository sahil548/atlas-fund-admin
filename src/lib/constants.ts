// ── CRM: Relationship Tags & Interaction Types ─────────────

export const RELATIONSHIP_TAGS = [
  "Broker",
  "Co-Investor",
  "LP (current)",
  "LP Prospect",
  "Advisor",
  "Board Member",
  "Service Provider",
] as const;

export const INTERACTION_TYPES = ["CALL", "EMAIL", "MEETING", "NOTE"] as const;

export const INTERACTION_TYPE_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  NOTE: "Note",
};

export const INTERACTION_TYPE_COLORS: Record<string, string> = {
  CALL: "amber",
  EMAIL: "blue",
  MEETING: "green",
  NOTE: "gray",
};

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

export const PARTICIPATION_COLORS: Record<string, string> = {
  DIRECT_GP: "purple",
  CO_INVEST_JV_PARTNERSHIP: "indigo",
  LP_STAKE_SILENT_PARTNER: "gray",
};
