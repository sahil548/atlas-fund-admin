/**
 * Hardcoded Due Diligence templates.
 * Each template defines workstreams with pre-populated task lists.
 */

export interface DDTemplateTask {
  title: string;
}

export interface DDTemplateWorkstream {
  name: string;
  tasks: DDTemplateTask[];
}

export interface DDTemplate {
  id: string;
  name: string;
  description: string;
  workstreams: DDTemplateWorkstream[];
}

export const DD_TEMPLATES: DDTemplate[] = [
  {
    id: "standard-equity",
    name: "Standard Equity DD",
    description:
      "Comprehensive due diligence for direct equity / PE investments",
    workstreams: [
      {
        name: "Financial",
        tasks: [
          { title: "Review historical financial statements (3 years)" },
          { title: "Analyze revenue composition and growth drivers" },
          { title: "Assess working capital and cash flow dynamics" },
          { title: "Validate management projections and assumptions" },
          { title: "Review quality of earnings report" },
          { title: "Evaluate capital expenditure requirements" },
        ],
      },
      {
        name: "Operational",
        tasks: [
          { title: "Map key business processes and workflows" },
          { title: "Assess technology stack and infrastructure" },
          { title: "Review customer concentration and retention" },
          { title: "Evaluate supply chain dependencies" },
          { title: "Analyze competitive positioning and market share" },
        ],
      },
      {
        name: "Legal",
        tasks: [
          { title: "Review corporate structure and governance docs" },
          { title: "Assess pending and potential litigation" },
          { title: "Review material contracts and obligations" },
          { title: "Evaluate intellectual property portfolio" },
          { title: "Check regulatory compliance status" },
        ],
      },
      {
        name: "Tax",
        tasks: [
          { title: "Review tax returns and filing history" },
          { title: "Assess tax positions and contingencies" },
          { title: "Evaluate transfer pricing arrangements" },
          { title: "Review structuring and tax optimization" },
        ],
      },
      {
        name: "ESG",
        tasks: [
          { title: "Assess environmental risks and compliance" },
          { title: "Review labor practices and workforce policies" },
          { title: "Evaluate governance structure and board composition" },
          { title: "Check for ESG-related controversies or violations" },
        ],
      },
      {
        name: "Management",
        tasks: [
          { title: "Conduct management team interviews" },
          { title: "Review key person dependencies and succession plans" },
          { title: "Assess compensation structure and incentives" },
          { title: "Check references and background verification" },
        ],
      },
    ],
  },
  {
    id: "credit-dd",
    name: "Credit DD",
    description:
      "Due diligence template for private credit and lending transactions",
    workstreams: [
      {
        name: "Financial",
        tasks: [
          { title: "Analyze debt service coverage ratios" },
          { title: "Review historical cash flow and repayment capacity" },
          { title: "Assess leverage ratios and capital structure" },
          { title: "Validate financial covenants and headroom" },
          { title: "Review borrower financial projections" },
          { title: "Evaluate working capital adequacy" },
        ],
      },
      {
        name: "Legal",
        tasks: [
          { title: "Review credit agreement and all amendments" },
          { title: "Assess security package and perfection" },
          { title: "Review inter-creditor agreements" },
          { title: "Evaluate guarantor structure and enforceability" },
          { title: "Check regulatory and licensing compliance" },
        ],
      },
      {
        name: "Collateral",
        tasks: [
          { title: "Review collateral valuation reports" },
          { title: "Assess collateral coverage ratios" },
          { title: "Evaluate asset quality and depreciation" },
          { title: "Review insurance coverage on collateral" },
          { title: "Verify lien positions and priority" },
        ],
      },
      {
        name: "Tax",
        tasks: [
          { title: "Review borrower tax returns and compliance" },
          { title: "Assess withholding tax implications" },
          { title: "Evaluate structural tax efficiency" },
          { title: "Review transfer pricing for cross-border loans" },
        ],
      },
      {
        name: "ESG",
        tasks: [
          { title: "Screen for ESG exclusion list compliance" },
          { title: "Assess environmental liability exposure" },
          { title: "Review social and governance risk factors" },
        ],
      },
      {
        name: "Counterparty",
        tasks: [
          { title: "Run background checks on key principals" },
          { title: "Review borrower credit history and track record" },
          { title: "Assess related-party transactions" },
          { title: "Evaluate management team experience" },
        ],
      },
    ],
  },
  {
    id: "real-estate-dd",
    name: "Real Estate DD",
    description:
      "Due diligence template for direct real estate investments",
    workstreams: [
      {
        name: "Financial",
        tasks: [
          { title: "Review historical operating statements (3 years)" },
          { title: "Analyze rent roll and tenant creditworthiness" },
          { title: "Validate underwriting assumptions and projections" },
          { title: "Assess capital expenditure and deferred maintenance" },
          { title: "Evaluate financing terms and debt coverage" },
        ],
      },
      {
        name: "Property",
        tasks: [
          { title: "Order and review property condition assessment" },
          { title: "Review ALTA survey and title commitment" },
          { title: "Assess location, demographics, and submarket" },
          { title: "Evaluate comparable sales and market rents" },
          { title: "Review zoning and entitlements compliance" },
        ],
      },
      {
        name: "Legal",
        tasks: [
          { title: "Review all existing lease agreements" },
          { title: "Assess title exceptions and encumbrances" },
          { title: "Review HOA/CC&R documents if applicable" },
          { title: "Evaluate pending or potential litigation" },
          { title: "Check ADA and building code compliance" },
        ],
      },
      {
        name: "Environmental",
        tasks: [
          { title: "Order and review Phase I ESA report" },
          { title: "Assess flood zone and natural hazard exposure" },
          { title: "Review hazardous materials and asbestos reports" },
          { title: "Evaluate stormwater and wetlands compliance" },
        ],
      },
      {
        name: "Tax",
        tasks: [
          { title: "Review property tax assessments and appeals" },
          { title: "Assess transfer tax and recording implications" },
          { title: "Evaluate 1031 exchange eligibility" },
          { title: "Review depreciation schedules and cost segregation" },
        ],
      },
      {
        name: "Tenant",
        tasks: [
          { title: "Analyze tenant financial statements" },
          { title: "Review lease expiration schedule and rollover risk" },
          { title: "Assess tenant improvement obligations" },
          { title: "Evaluate tenant retention and renewal probability" },
        ],
      },
    ],
  },
];
