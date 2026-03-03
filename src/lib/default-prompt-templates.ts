// Default AI prompt templates — grouped by module.
// When a new module gets AI, add entries here. They auto-appear in Settings.

export interface DefaultTemplate {
  type: string;
  module: string;
  name: string;
  description: string;
  content: string;
}

export const DEFAULT_PROMPT_TEMPLATES: DefaultTemplate[] = [
  // ── Deal Desk ────────────────────────────────────────
  {
    type: "SCREENING",
    module: "deals",
    name: "Deal Screening",
    description: "Initial AI screening when a deal enters the pipeline",
    content: `You are an expert investment analyst for a family office GP. Analyze the provided deal data and produce a structured screening report.

Evaluate the deal across these dimensions:
1. Business quality and competitive positioning
2. Financial health and growth trajectory (revenue, EBITDA, margins, cash flow)
3. Management team strength and key person risk
4. Deal structure and terms (valuation multiples, leverage, protections)
5. Key risks and mitigants (rate each HIGH/MEDIUM/LOW)
6. Investment thesis: bull case, base case, bear case

Scoring weights: Financials 30%, Market Position 20%, Risk Profile 25%, Management 15%, Structure 10%

Provide a score (0-100) and recommendation:
- 85-100: STRONG_PROCEED (exceptional opportunity, minimal red flags)
- 70-84: PROCEED (solid opportunity, manageable risks)
- 50-69: PROCEED_WITH_CAUTION (notable concerns, extra DD needed)
- 30-49: WATCHLIST (significant concerns, revisit later)
- 0-29: PASS (fundamental issues, do not pursue)`,
  },
  {
    type: "IC_MEMO",
    module: "deals",
    name: "IC Memo Generator",
    description: "Generate an Investment Committee memo from deal data",
    content: `Generate a professional Investment Committee memo.

Structure:
1. Executive Summary (1 paragraph): what the deal is, size, why we're looking at it, recommendation
2. Investment Highlights: 3-5 bullet points on why this is attractive
3. Key Risks & Mitigants: table with Risk, Impact, Likelihood, Mitigant columns
4. Deal Terms: structure, entry valuation, hold period, target returns, key protections
5. Financial Summary: table with Trailing, Current, Projected for revenue, EBITDA, margins, leverage
6. DD Findings Summary: key takeaways from financial, legal, and market DD
7. Allocation Recommendation: which fund entities participate, amounts, co-invest for LPs, capital call timing
8. Recommendation: APPROVE / APPROVE WITH CONDITIONS / DECLINE with conditions listed

Write as a professional IC memo suitable for distribution to voting members. Use formal tone. Target 3-5 pages equivalent.`,
  },
];

// ── Helpers ────────────────────────────────────────

/** All modules that have templates */
export function getTemplateModules(): string[] {
  const mods = new Set(DEFAULT_PROMPT_TEMPLATES.map((t) => t.module));
  return Array.from(mods);
}

/** Get default content for a specific template type */
export function getDefaultContent(type: string): string | null {
  return DEFAULT_PROMPT_TEMPLATES.find((t) => t.type === type)?.content ?? null;
}

/** Module display labels */
export const MODULE_LABELS: Record<string, string> = {
  deals: "Deal Desk",
  accounting: "Accounting",
  entities: "Entities",
  directory: "Directory",
  assets: "Assets",
  lp: "LP Portal",
};
