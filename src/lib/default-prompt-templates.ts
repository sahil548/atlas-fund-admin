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
    type: "DD_FINANCIAL",
    module: "deals",
    name: "Financial Due Diligence",
    description: "Deep-dive financial analysis framework",
    content: `Perform a comprehensive financial due diligence analysis.

Quality of Earnings:
- Revenue breakdown by customer/segment/geography
- Recurring vs one-time revenue identification
- EBITDA adjustments (add-backs, normalizations)
- Working capital trends and seasonality
- Pro forma vs reported gaps

Balance Sheet:
- Asset quality and impairment risks
- Debt maturity schedule and covenants
- Off-balance-sheet liabilities
- Cash vs accrual discrepancies
- Intercompany transactions to eliminate

Cash Flow:
- Free cash flow conversion rate
- Capex breakdown (maintenance vs growth)
- Cash flow bridge (EBITDA to FCF)
- Distributions capacity analysis

Projections Stress Test:
- Management case vs independent analysis
- Sensitivity on: revenue growth, margins, cost of capital
- Downside scenario: what breaks first

Red Flags to check: revenue recognition policies, related-party transactions, unusual accounting elections, deferred revenue/liability trends, customer concentration above 20%, pending contingent liabilities.

End with GO / NO-GO / NEEDS MORE INFO and specific follow-up questions for the sponsor.`,
  },
  {
    type: "DD_LEGAL",
    module: "deals",
    name: "Legal Due Diligence",
    description: "Legal and structural analysis framework",
    content: `Perform legal and structural due diligence analysis.

Entity Structure:
- Holding structure (who owns what, through which vehicles)
- Tax implications (pass-through, blocker, UBTI)
- Jurisdictional risks

Key Agreements:
- Purchase/subscription agreement: terms, reps & warranties, indemnification
- Side letters with preferential terms
- Management agreement: fees, carry, clawback
- Operating/partnership agreement: governance, voting, consent rights

Regulatory:
- Required licenses and permits status
- Pending or threatened litigation
- Environmental compliance (Phase I/II if RE)
- OFAC/sanctions/KYC/AML screening

Covenant Analysis (if debt):
- Financial covenants: type, threshold, test frequency, headroom
- Negative covenants: restricted payments, additional indebtedness
- Change of control provisions
- Default triggers and cure periods

For each risk: provide Severity, Likelihood, Mitigation, and Owner.
Flag deal-breakers prominently. End with conditions to satisfy before closing.`,
  },
  {
    type: "DD_MARKET",
    module: "deals",
    name: "Market Due Diligence",
    description: "Market and commercial analysis framework",
    content: `Perform market and commercial due diligence analysis.

Market Sizing:
- TAM / SAM / SOM with sources
- Market growth rate and key drivers
- Cycle position (early/growth/mature/declining)

Competitive Landscape:
- Top 5 competitors with market share estimates
- Competitive moats: brand, scale, IP, switching costs, network effects
- Threat of new entrants and substitutes
- Pricing power assessment

Customer Analysis:
- Customer segmentation and concentration
- Retention/churn rates (or lease renewal rates for RE)
- Customer acquisition cost and lifetime value

Industry Trends:
- Tailwinds and headwinds
- Regulatory direction
- Technology disruption risks

Real Estate Specific (if applicable):
- Submarket supply/demand dynamics
- Rent comp analysis
- Vacancy trends
- Cap rate trends for the asset type and geography

End with: is this a good market to deploy capital into right now, and why/why not.`,
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
  {
    type: "COMP_ANALYSIS",
    module: "deals",
    name: "Comparable Analysis",
    description: "Find and analyze comparable transactions and public comps",
    content: `Find and analyze comparable transactions.

Transaction Comps:
- Search for recent M&A, investment, and financing transactions in the same sector/geography
- Deal size range: 0.5x to 3x the target
- Time period: last 3 years
- Build table: Date, Target, Acquirer/Investor, Deal Size, EV/EBITDA, EV/Revenue, Notes

Analysis:
- Median and mean multiples
- Range (25th to 75th percentile)
- Outliers and why they differ
- Trend over time (compressing or expanding?)

Public Market Comps (if applicable):
- Table: Ticker, Company, Market Cap, EV/EBITDA, EV/Revenue, Growth, Margin
- Trading vs transaction multiples gap
- Liquidity discount considerations

Benchmark:
- Where does our deal fall vs comps?
- Above median: justify the premium
- Below median: identify discount factors
- Implied valuation range based on comp multiples

End with: based on comps, the fair value range is $X-$Y, and the proposed entry represents a premium/discount of N%.`,
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
