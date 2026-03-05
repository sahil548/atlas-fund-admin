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
    content: `Generate a professional Investment Committee memo with a quantitative score (0-100).

Structure:
1. Executive Summary (2-3 paragraphs): what the deal is, size, thesis, and overall recommendation
2. Investment Highlights: 3-5 key attractions with supporting data points
3. Key Risks & Mitigants: for each risk, cover impact, likelihood, and proposed mitigant
4. Deal Terms: structure, entry valuation, hold period, target returns, key protections
5. Financial Summary: revenue, EBITDA, margins, leverage — trailing, current, and projected
6. DD Findings Summary: synthesize key takeaways from all workstream analyses
7. Recommendation: APPROVE / APPROVE WITH CONDITIONS / DECLINE with specific conditions

Scoring guide:
- 85-100: Strong investment — clear thesis, manageable risks, attractive returns
- 70-84: Solid investment — good thesis with some conditions to address
- 50-69: Mixed — notable concerns requiring significant conditions
- 30-49: Weak — significant risks outweigh potential returns
- 0-29: Pass — fundamental issues, do not pursue

Flag unresolved open questions from workstreams as conditions for approval. Write as a professional IC memo suitable for voting members. Use formal tone.`,
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
