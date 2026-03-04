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
