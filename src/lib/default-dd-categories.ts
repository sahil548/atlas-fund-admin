/**
 * Default DD Category Templates
 *
 * These are the built-in workstream categories that every firm starts with.
 * They are auto-provisioned when a firm is created (via Clerk webhook)
 * and used as fallbacks when no templates exist in the database.
 *
 * Users can customize these in Settings → Deal Desk, and add their own
 * custom categories on top.
 */

export interface DefaultDDCategory {
  name: string;
  description: string;
  defaultInstructions: string;
  isDefault: boolean;
  scope: string;
  sortOrder: number;
}

export const DEFAULT_DD_CATEGORIES: DefaultDDCategory[] = [
  // ── UNIVERSAL (apply to all deals) ──
  {
    name: "Financial DD",
    description: "Revenue/cash flow analysis, financial model, projections, quality of earnings",
    defaultInstructions: "You are a senior financial analyst. Perform comprehensive financial due diligence. Analyze quality of earnings, balance sheet composition, cash flow conversion, and management projections. Produce a detailed summary of findings and raise specific, answerable open questions the deal team needs to resolve (e.g. 'What are the EBITDA add-backs and supporting documentation?' or 'Can management provide a trailing 24-month revenue bridge?').",
    isDefault: true,
    scope: "UNIVERSAL",
    sortOrder: 1,
  },
  {
    name: "Legal DD",
    description: "Corporate structure, contracts, litigation, IP",
    defaultInstructions: "You are a senior legal analyst. Perform legal and structural due diligence. Analyze entity structure, key contracts, regulatory compliance, pending litigation, and IP ownership. Raise specific open questions about legal risks (e.g. 'Do all material contracts survive change of control?' or 'What is the status of pending litigation disclosed in the CIM?').",
    isDefault: true,
    scope: "UNIVERSAL",
    sortOrder: 2,
  },
  {
    name: "Tax DD",
    description: "Tax structure, compliance, entity elections",
    defaultInstructions: "You are a senior tax analyst. Perform comprehensive tax due diligence. Analyze tax structure, entity elections, compliance history, available credits, and transaction implications. Raise specific open questions (e.g. 'Is a Section 754 election in place?' or 'What is the UBTI exposure for tax-exempt LPs?').",
    isDefault: true,
    scope: "UNIVERSAL",
    sortOrder: 3,
  },
  {
    name: "Operational DD",
    description: "Management, processes, technology, scalability",
    defaultInstructions: "You are a senior operational analyst. Perform comprehensive operational due diligence. Assess management team, business processes, technology infrastructure, scalability constraints, and key person risk. Raise specific open questions (e.g. 'What is the succession plan for the CEO?' or 'What is the ERP upgrade timeline and budget?').",
    isDefault: true,
    scope: "UNIVERSAL",
    sortOrder: 4,
  },
  {
    name: "Market DD",
    description: "Market size, competitive landscape, positioning, comparable analysis",
    defaultInstructions: "You are a senior market analyst. Perform market and competitive due diligence. Analyze market sizing, competitive landscape, customer dynamics, industry trends, and comparable transactions. Raise specific open questions (e.g. 'What is the company's market share in the core segment?' or 'How do entry multiples compare to recent transactions?').",
    isDefault: true,
    scope: "UNIVERSAL",
    sortOrder: 5,
  },
  {
    name: "ESG DD",
    description: "Environmental, social, governance, compliance",
    defaultInstructions: "You are a senior ESG analyst. Perform comprehensive ESG due diligence. Assess environmental liabilities, social factors, governance structure, and framework alignment. Raise specific open questions (e.g. 'What are Scope 1 and 2 emissions?' or 'Does the board meet independence requirements?').",
    isDefault: true,
    scope: "UNIVERSAL",
    sortOrder: 6,
  },
  // ── REAL_ESTATE specific ──
  {
    name: "Collateral DD",
    description: "Property appraisals, site condition, title/lien positions, insurance",
    defaultInstructions: "You are a senior real estate analyst. Perform collateral due diligence. Analyze property valuation, physical condition, title and lien positions, insurance adequacy, and environmental factors. Raise specific open questions (e.g. 'When was the last appraisal and what methodology was used?' or 'Are there any outstanding title exceptions?').",
    isDefault: true,
    scope: "REAL_ESTATE",
    sortOrder: 7,
  },
  {
    name: "Tenant & Lease DD",
    description: "Tenant credit, lease terms, occupancy, rent comparables",
    defaultInstructions: "You are a senior real estate analyst. Perform tenant and lease due diligence. Analyze tenant credit quality, lease terms and expirations, occupancy trends, rent comparables, and rollover risk. Raise specific open questions (e.g. 'What is the weighted average lease term remaining?' or 'What are rents vs market comparables by unit type?').",
    isDefault: true,
    scope: "REAL_ESTATE",
    sortOrder: 8,
  },
  // ── OPERATING_BUSINESS specific ──
  {
    name: "Customer DD",
    description: "Customer concentration, retention, cohort economics",
    defaultInstructions: "You are a senior business analyst. Perform customer due diligence. Analyze customer concentration, retention and churn rates, cohort economics, and pipeline quality. Raise specific open questions (e.g. 'What percentage of revenue comes from the top 5 customers?' or 'What is the net revenue retention rate by cohort?').",
    isDefault: true,
    scope: "OPERATING_BUSINESS",
    sortOrder: 9,
  },
  {
    name: "Technology DD",
    description: "Tech stack, technical debt, product roadmap, cybersecurity",
    defaultInstructions: "You are a senior technology analyst. Perform technology due diligence. Analyze technology stack, technical debt, product roadmap, cybersecurity posture, and IP/data assets. Raise specific open questions (e.g. 'What is the estimated cost to address critical technical debt?' or 'Is SOC 2 Type II certification completed or in progress?').",
    isDefault: true,
    scope: "OPERATING_BUSINESS",
    sortOrder: 10,
  },
  // ── INFRASTRUCTURE specific ──
  {
    name: "Regulatory & Permitting DD",
    description: "Regulatory approvals, permits, government concessions",
    defaultInstructions: "You are a senior regulatory analyst. Perform regulatory and permitting due diligence. Analyze the regulatory framework, permitting status, government concessions, and compliance requirements. Raise specific open questions (e.g. 'What permits are required and what is the expected timeline?' or 'Are there any pending regulatory changes that could affect operations?').",
    isDefault: true,
    scope: "INFRASTRUCTURE",
    sortOrder: 11,
  },
  {
    name: "Engineering DD",
    description: "Engineering design, construction risk, asset condition",
    defaultInstructions: "You are a senior engineering analyst. Perform engineering due diligence. Analyze design and engineering quality, construction risk, asset condition, and performance metrics. Raise specific open questions (e.g. 'What is the remaining useful life of critical infrastructure?' or 'What is the deferred maintenance backlog and estimated cost?').",
    isDefault: true,
    scope: "INFRASTRUCTURE",
    sortOrder: 12,
  },
  // ── DEBT specific ──
  {
    name: "Credit DD",
    description: "Credit metrics, covenants, collateral coverage, downside modeling",
    defaultInstructions: "You are a senior credit analyst. Perform credit due diligence. Analyze credit metrics, debt structure, covenant package, collateral coverage, and downside scenarios. Raise specific open questions (e.g. 'What is the debt service coverage ratio under the downside case?' or 'What are the financial covenant thresholds and current headroom?').",
    isDefault: true,
    scope: "DEBT",
    sortOrder: 13,
  },
];

/**
 * Creates the Prisma data array for provisioning default templates for a firm.
 */
export function getDefaultDDCategoriesForFirm(firmId: string) {
  return DEFAULT_DD_CATEGORIES.map((cat) => ({
    firmId,
    ...cat,
  }));
}
