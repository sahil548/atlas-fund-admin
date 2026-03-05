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
    defaultInstructions: "Perform a comprehensive financial due diligence analysis. Cover quality of earnings, balance sheet review, cash flow analysis, and projections stress test.",
    isDefault: true,
    scope: "UNIVERSAL",
    sortOrder: 1,
  },
  {
    name: "Legal DD",
    description: "Corporate structure, contracts, litigation, IP",
    defaultInstructions: "Perform legal and structural due diligence analysis. Cover entity structure, key agreements, regulatory compliance, and covenant analysis.",
    isDefault: true,
    scope: "UNIVERSAL",
    sortOrder: 2,
  },
  {
    name: "Tax DD",
    description: "Tax structure, compliance, entity elections",
    defaultInstructions: "Perform comprehensive tax due diligence analysis. Cover tax structure, entity elections, compliance history, credits/exposures, and transaction implications.",
    isDefault: true,
    scope: "UNIVERSAL",
    sortOrder: 3,
  },
  {
    name: "Operational DD",
    description: "Management, processes, technology, scalability",
    defaultInstructions: "Perform comprehensive operational due diligence analysis. Cover management assessment, business processes, technology infrastructure, scalability, and key person risk.",
    isDefault: true,
    scope: "UNIVERSAL",
    sortOrder: 4,
  },
  {
    name: "Market DD",
    description: "Market size, competitive landscape, positioning, comparable analysis",
    defaultInstructions: "Perform market and comparable analysis due diligence. Cover market sizing, competitive landscape, customer analysis, industry trends, and transaction/public comps.",
    isDefault: true,
    scope: "UNIVERSAL",
    sortOrder: 5,
  },
  {
    name: "ESG DD",
    description: "Environmental, social, governance, compliance",
    defaultInstructions: "Perform comprehensive ESG due diligence analysis. Cover environmental assessment, social factors, governance structure, ESG framework alignment, and risk/opportunity assessment.",
    isDefault: true,
    scope: "UNIVERSAL",
    sortOrder: 6,
  },
  // ── REAL_ESTATE specific ──
  {
    name: "Collateral DD",
    description: "Property appraisals, site condition, title/lien positions, insurance",
    defaultInstructions: "Perform real estate collateral due diligence analysis. Cover property valuation, physical condition, title/lien analysis, insurance review, and environmental assessment.",
    isDefault: true,
    scope: "REAL_ESTATE",
    sortOrder: 7,
  },
  {
    name: "Tenant & Lease DD",
    description: "Tenant credit, lease terms, occupancy, rent comparables",
    defaultInstructions: "Perform tenant and lease due diligence analysis. Cover tenant credit, lease terms, occupancy analysis, rent comparables, and rollover risk.",
    isDefault: true,
    scope: "REAL_ESTATE",
    sortOrder: 8,
  },
  // ── OPERATING_BUSINESS specific ──
  {
    name: "Customer DD",
    description: "Customer concentration, retention, cohort economics",
    defaultInstructions: "Perform customer due diligence analysis. Cover customer concentration, retention/churn, unit economics, and pipeline/growth analysis.",
    isDefault: true,
    scope: "OPERATING_BUSINESS",
    sortOrder: 9,
  },
  {
    name: "Technology DD",
    description: "Tech stack, technical debt, product roadmap, cybersecurity",
    defaultInstructions: "Perform technology due diligence analysis. Cover technology stack, technical debt, product/roadmap, cybersecurity, and IP/data assessment.",
    isDefault: true,
    scope: "OPERATING_BUSINESS",
    sortOrder: 10,
  },
  // ── INFRASTRUCTURE specific ──
  {
    name: "Regulatory & Permitting DD",
    description: "Regulatory approvals, permits, government concessions",
    defaultInstructions: "Perform regulatory and permitting due diligence. Cover regulatory framework, permitting status, government concessions, and compliance assessment.",
    isDefault: true,
    scope: "INFRASTRUCTURE",
    sortOrder: 11,
  },
  {
    name: "Engineering DD",
    description: "Engineering design, construction risk, asset condition",
    defaultInstructions: "Perform engineering due diligence analysis. Cover design/engineering, construction risk, asset condition, and performance assessment.",
    isDefault: true,
    scope: "INFRASTRUCTURE",
    sortOrder: 12,
  },
  // ── DEBT specific ──
  {
    name: "Credit DD",
    description: "Credit metrics, covenants, collateral coverage, downside modeling",
    defaultInstructions: "Perform credit due diligence analysis. Cover credit metrics, debt structure, covenant package, collateral coverage, and downside modeling.",
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
