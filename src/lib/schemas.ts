import { z } from "zod";

// ── Pagination ────────────────────────────────────────────

export const PaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: z.string().optional(),
});

// ── Shared Taxonomy ──────────────────────────────────────

export const ASSET_CLASSES = [
  "REAL_ESTATE",
  "PUBLIC_SECURITIES",
  "OPERATING_BUSINESS",
  "INFRASTRUCTURE",
  "COMMODITIES",
  "DIVERSIFIED",
  "NON_CORRELATED",
  "CASH_AND_EQUIVALENTS",
] as const;

export const CAPITAL_INSTRUMENTS = ["DEBT", "EQUITY"] as const;

export const PARTICIPATION_STRUCTURES = [
  "DIRECT_GP",
  "CO_INVEST_JV_PARTNERSHIP",
  "LP_STAKE_SILENT_PARTNER",
] as const;

// ── Deals ──────────────────────────────────────────────

// Helper: accept enum value OR empty string → transform "" to undefined
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).or(z.literal("")).transform((v) => (v === "" ? undefined : v)).optional();

// Helper: accept string OR empty → transform "" to undefined
const optionalStr = z.string().transform((v) => (v === "" ? undefined : v)).optional();

export const CreateDealSchema = z.object({
  name: z.string().min(1, "Name is required"),
  assetClass: z.enum(ASSET_CLASSES),
  capitalInstrument: optionalEnum(CAPITAL_INSTRUMENTS),
  participationStructure: optionalEnum(PARTICIPATION_STRUCTURES),
  sector: optionalStr,
  targetSize: optionalStr,
  targetCheckSize: optionalStr,
  targetReturn: optionalStr,
  dealLeadId: optionalStr,
  gpName: optionalStr,
  source: optionalStr,
  counterparty: optionalStr,
  entityId: optionalStr,
  description: optionalStr,
  thesisNotes: optionalStr,
  investmentRationale: optionalStr,
  additionalContext: optionalStr,
});

export const UpdateDealSchema = z.object({
  name: z.string().min(1).optional(),
  assetClass: z.enum(ASSET_CLASSES).optional(),
  capitalInstrument: z.enum(CAPITAL_INSTRUMENTS).nullable().optional(),
  participationStructure: z.enum(PARTICIPATION_STRUCTURES).nullable().optional(),
  sector: z.string().optional(),
  targetSize: z.string().optional(),
  targetCheckSize: z.string().nullable().optional(),
  targetReturn: z.string().nullable().optional(),
  dealLeadId: z.string().nullable().optional(),
  gpName: z.string().nullable().optional(),
  source: z.string().optional(),
  counterparty: z.string().optional(),
  entityId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  thesisNotes: z.string().nullable().optional(),
  investmentRationale: z.string().nullable().optional(),
  additionalContext: z.string().nullable().optional(),
  dealMetadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const KillDealSchema = z.object({
  action: z.literal("KILL"),
  killReason: z.string().min(1, "Kill reason is required"),
  killReasonText: z.string().optional(),
});

export const AddDealEntitySchema = z.object({
  entityId: z.string().min(1, "Entity ID is required"),
  allocationPercent: z.number().min(0).max(100).optional(),
  role: z.string().optional(),
});

export const AddCustomClosingItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export const CreateDDWorkstreamSchema = z.object({
  dealId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETE"]).default("NOT_STARTED"),
});

// ── DD Tasks ─────────────────────────────────────────

export const CreateDDTaskSchema = z.object({
  workstreamId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  description: z.string().optional(),
  priority: z.string().optional(),
  source: z.string().optional(),
});

export const UpdateDDTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  assignee: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  resolution: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
});

export const ApplyDDTemplateSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
});

// ── IC Review ────────────────────────────────────────

export const ICDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "SEND_BACK"]),
  userId: z.string().min(1),
  notes: z.string().optional(),
});

export const CreateICQuestionSchema = z.object({
  authorId: z.string().min(1),
  content: z.string().min(1, "Question content is required"),
});

export const CreateICReplySchema = z.object({
  authorId: z.string().min(1),
  content: z.string().min(1, "Reply content is required"),
});

export const UpdateICQuestionSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["OPEN", "RESOLVED", "DEFERRED"]),
});

// ── Send to IC ───────────────────────────────────────

export const SendToICSchema = z.object({
  force: z.boolean().default(false),
});

// ── AI Screening ────────────────────────────────────

export const ScreeningConfigSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string().min(1),
      instructions: z.string().optional(),
      enabled: z.boolean().default(true),
    })
  ),
  customInstructions: z.string().optional(),
});

// ── DD Analysis ─────────────────────────────────────

export const DD_ANALYSIS_TYPES = [
  "DD_FINANCIAL",
  "DD_LEGAL",
  "DD_MARKET",
  "DD_TAX",
  "DD_OPERATIONAL",
  "DD_ESG",
  "DD_COLLATERAL",
  "DD_TENANT_LEASE",
  "DD_CUSTOMER",
  "DD_TECHNOLOGY",
  "DD_REGULATORY",
  "DD_ENGINEERING",
  "DD_CREDIT",
  "DD_COMMERCIAL",
  "DD_MANAGEMENT",
  "DD_CUSTOM",
  "IC_MEMO",
] as const;

/** Map DD category template names → analysis type enum values */
export const CATEGORY_NAME_TO_TYPE: Record<string, string> = {
  "Financial DD": "DD_FINANCIAL",
  "Legal DD": "DD_LEGAL",
  "Market DD": "DD_MARKET",
  "Tax DD": "DD_TAX",
  "Operational DD": "DD_OPERATIONAL",
  "ESG DD": "DD_ESG",
  "Collateral DD": "DD_COLLATERAL",
  "Tenant & Lease DD": "DD_TENANT_LEASE",
  "Customer DD": "DD_CUSTOMER",
  "Technology DD": "DD_TECHNOLOGY",
  "Regulatory & Permitting DD": "DD_REGULATORY",
  "Engineering DD": "DD_ENGINEERING",
  "Credit DD": "DD_CREDIT",
  "Commercial DD": "DD_COMMERCIAL",
  "Management DD": "DD_MANAGEMENT",
};

export const DDAnalyzeRequestSchema = z.object({
  type: z.enum(DD_ANALYSIS_TYPES),
  categoryName: z.string().optional(),
  rerun: z.boolean().default(false),
});

// ── Deal Activity ───────────────────────────────────

export const CreateDealActivitySchema = z.object({
  activityType: z.string().min(1),
  description: z.string().min(1),
  metadata: z.any().optional(),
});

export const CreateNoteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
  authorId: z.string().optional(),
  dealId: z.string().optional(),
  assetId: z.string().optional(),
  entityId: z.string().optional(),
  investorId: z.string().optional(),
});

export const CreateClosingChecklistItemSchema = z.object({
  dealId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  order: z.number().int().default(0),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETE"]).default("NOT_STARTED"),
});

export const UpdateClosingChecklistItemSchema = z.object({
  id: z.string().min(1),
  action: z.string().optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETE"]).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const InitializeClosingSchema = z.object({
  action: z.literal("INITIALIZE"),
});

export const CloseDealSchema = z.object({
  action: z.literal("CLOSE"),
  costBasis: z.number().positive("Cost basis must be positive"),
  fairValue: z.number().positive().optional(),
  entryDate: z.string().optional(),
  force: z.boolean().optional(),
  allocations: z
    .array(
      z.object({
        entityId: z.string().min(1, "Entity ID is required"),
        allocationPercent: z.number().min(0.01).max(100),
      }),
    )
    .min(1, "At least one entity allocation is required")
    .refine(
      (allocations) => {
        const total = allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
        return Math.abs(total - 100) < 0.01;
      },
      { message: "Allocation percentages must total 100%" },
    )
    .refine(
      (allocations) => {
        const ids = allocations.map((a) => a.entityId);
        return new Set(ids).size === ids.length;
      },
      { message: "Duplicate entity allocations are not allowed" },
    ),
});

// ── Assets ─────────────────────────────────────────────

export const UpdateAssetSchema = z.object({
  fairValue: z.number().positive().optional(),
  status: z.enum(["ACTIVE", "EXITED", "WRITTEN_OFF"]).optional(),
  assetClass: z.enum(ASSET_CLASSES).optional(),
  capitalInstrument: z.enum(CAPITAL_INSTRUMENTS).nullable().optional(),
  participationStructure: z.enum(PARTICIPATION_STRUCTURES).nullable().optional(),
  sector: z.string().optional(),
  incomeType: z.string().optional(),
  // Phase 4: projection fields (GP manual override)
  projectedIRR: z.number().nullable().optional(),
  projectedMultiple: z.number().nullable().optional(),
  projectedMetrics: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const UpdateAssetProjectionsSchema = z.object({
  projectedIRR: z.number().nullable().optional(),
  projectedMultiple: z.number().nullable().optional(),
  projectedMetrics: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const ExitAssetSchema = z.object({
  exitDate: z.string().min(1, "Exit date is required"),
  exitProceeds: z.number().positive("Exit proceeds must be positive"),
  exitNotes: z.string().optional(),
});

export const CreateValuationSchema = z.object({
  assetId: z.string().min(1),
  valuationDate: z.string().min(1, "Date is required"),
  method: z.enum(["COMPARABLE_MULTIPLES", "LAST_ROUND", "DCF", "APPRAISAL", "GP_REPORTED_NAV", "COST"]),
  fairValue: z.number().positive("Fair value must be positive"),
  moic: z.number().optional(),
  notes: z.string().optional(),
  status: z.enum(["DRAFT", "APPROVED"]).default("DRAFT"),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  assigneeName: z.string().optional(),
  dueDate: z.string().optional(),
  assetId: z.string().optional(),
});

export const CreateDocumentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["BOARD", "FINANCIAL", "LEGAL", "GOVERNANCE", "VALUATION", "STATEMENT", "TAX", "REPORT", "NOTICE", "OTHER"]),
  assetId: z.string().optional(),
  entityId: z.string().optional(),
  dealId: z.string().optional(),
});

export const CreateIncomeEventSchema = z.object({
  assetId: z.string().optional(),
  entityId: z.string().min(1),
  incomeType: z.enum(["INTEREST", "DIVIDEND", "RENTAL", "ROYALTY", "FEE", "OTHER"]),
  amount: z.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  isPrincipal: z.boolean().default(false),
});

// ── Companies ─────────────────────────────────────────

export const CreateCompanySchema = z.object({
  firmId: z.string().min(1, "Firm ID is required"),
  name: z.string().min(1, "Company name is required"),
  type: z.enum(["GP", "LP", "COUNTERPARTY", "SERVICE_PROVIDER", "OPERATING_COMPANY", "OTHER"]).default("OTHER"),
  industry: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
});

// ── Contact CRM ────────────────────────────────────────

export const CreateInteractionSchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING", "NOTE"]),
  notes: z.string().min(1, "Notes required"),
  date: z.string().optional(),
  dealId: z.string().optional(),
  entityId: z.string().optional(),
});

export const UpdateInteractionSchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING", "NOTE"]).optional(),
  notes: z.string().min(1).optional(),
  date: z.string().optional(),
  dealId: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
});

export const ContactTagSchema = z.object({
  tag: z.string().min(1),
});

// ── Contacts ──────────────────────────────────────────

export const CreateContactSchema = z.object({
  firmId: z.string().min(1, "Firm ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  type: z.enum(["INTERNAL", "EXTERNAL"]).default("EXTERNAL"),
  companyId: z.string().optional(),
  notes: z.string().optional(),
});

// ── Side Letters ──────────────────────────────────────

export const CreateSideLetterSchema = z.object({
  investorId: z.string().min(1, "Investor is required"),
  entityId: z.string().min(1, "Entity is required"),
  terms: z.string().min(1, "Terms are required"),
});

export const UpdateSideLetterSchema = z.object({
  terms: z.string().min(1).optional(),
  investorId: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
});

export const SIDE_LETTER_RULE_TYPES = [
  "FEE_DISCOUNT",
  "CARRY_OVERRIDE",
  "MFN",
  "CO_INVEST_RIGHTS",
  "CUSTOM",
] as const;

export const CreateSideLetterRuleSchema = z.object({
  sideLetterId: z.string().min(1, "Side letter ID is required"),
  ruleType: z.enum(SIDE_LETTER_RULE_TYPES),
  value: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
});

export const UpdateSideLetterRuleSchema = z.object({
  ruleType: z.enum(SIDE_LETTER_RULE_TYPES).optional(),
  value: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ── Investors ──────────────────────────────────────────

export const CreateInvestorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  investorType: z.string().min(1, "Type is required"),
  totalCommitted: z.number().nonnegative().default(0),
  kycStatus: z.string().default("Pending"),
  advisoryBoard: z.boolean().default(false),
  contactPreference: z.string().default("Email"),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
}).refine(
  (data) => data.contactId || data.companyId,
  { message: "Must link to a company or contact", path: ["companyId"] }
);

export const UpdateInvestorSchema = z.object({
  name: z.string().min(1).optional(),
  investorType: z.string().optional(),
  totalCommitted: z.number().nonnegative().optional(),
  kycStatus: z.string().optional(),
  advisoryBoard: z.boolean().optional(),
  contactPreference: z.string().optional(),
});

// ── Capital Calls ──────────────────────────────────────

export const CreateCapitalCallSchema = z.object({
  entityId: z.string().min(1, "Entity is required"),
  callNumber: z.string().min(1, "Call number is required"),
  callDate: z.string().min(1, "Call date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  amount: z.number().positive("Amount must be positive"),
  purpose: z.string().optional(),
  status: z.enum(["DRAFT", "ISSUED", "FUNDED", "PARTIALLY_FUNDED", "OVERDUE"]).default("DRAFT"),
  autoGenerateLineItems: z.boolean().default(true),
});

export const UpdateCapitalCallSchema = z.object({
  status: z.enum(["DRAFT", "ISSUED", "FUNDED", "PARTIALLY_FUNDED", "OVERDUE"]).optional(),
  purpose: z.string().optional(),
  dueDate: z.string().optional(),
});

export const CreateCapitalCallLineItemSchema = z.object({
  investorId: z.string().min(1, "Investor is required"),
  amount: z.number().positive("Amount must be positive"),
});

export const UpdateCapitalCallLineItemSchema = z.object({
  status: z.enum(["Pending", "Funded"]).optional(),
  paidDate: z.string().optional(),
  amount: z.number().positive().optional(),
});

// ── Distributions ──────────────────────────────────────

export const CreateDistributionSchema = z.object({
  entityId: z.string().min(1, "Entity is required"),
  distributionDate: z.string().min(1, "Date is required"),
  grossAmount: z.number().positive("Gross amount must be positive"),
  source: z.string().optional(),
  returnOfCapital: z.number().default(0),
  income: z.number().default(0),
  longTermGain: z.number().default(0),
  shortTermGain: z.number().default(0),
  carriedInterest: z.number().default(0),
  netToLPs: z.number().default(0),
  status: z.enum(["DRAFT", "APPROVED", "PAID"]).default("APPROVED"),
  distributionType: z.string().optional(),
  memo: z.string().optional(),
  autoGenerateLineItems: z.boolean().default(true),
});

export const UpdateDistributionSchema = z.object({
  status: z.enum(["DRAFT", "APPROVED", "PAID"]).optional(),
  distributionType: z.string().optional(),
  memo: z.string().optional(),
  grossAmount: z.number().positive().optional(),
  returnOfCapital: z.number().optional(),
  income: z.number().optional(),
  longTermGain: z.number().optional(),
  shortTermGain: z.number().optional(),
  carriedInterest: z.number().optional(),
  netToLPs: z.number().optional(),
});

export const CreateDistributionLineItemSchema = z.object({
  investorId: z.string().min(1, "Investor is required"),
  grossAmount: z.number().positive("Gross amount must be positive"),
  returnOfCapital: z.number().default(0),
  income: z.number().default(0),
  longTermGain: z.number().default(0),
  carriedInterest: z.number().default(0),
  netAmount: z.number(),
});

export const UpdateDistributionLineItemSchema = z.object({
  grossAmount: z.number().positive().optional(),
  returnOfCapital: z.number().optional(),
  income: z.number().optional(),
  longTermGain: z.number().optional(),
  carriedInterest: z.number().optional(),
  netAmount: z.number().optional(),
});

// ── Meetings ───────────────────────────────────────────

export const CreateMeetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  meetingDate: z.string().min(1, "Date is required"),
  meetingType: z.string().optional(),
  source: z.enum(["FIREFLIES", "MANUAL", "ZOOM", "TEAMS"]).default("MANUAL"),
  assetId: z.string().optional(),
  dealId: z.string().optional(),
  entityId: z.string().optional(),
  actionItems: z.number().int().nonnegative().default(0),
});

// ── Waterfall ──────────────────────────────────────────

export const CreateWaterfallTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export const CreateWaterfallTierSchema = z.object({
  templateId: z.string().min(1),
  tierOrder: z.number().int().positive(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  splitLP: z.number().min(0).max(100).optional(),
  splitGP: z.number().min(0).max(100).optional(),
  hurdleRate: z.number().min(0).optional(),
  appliesTo: z.string().optional(),
});

export const UpdateWaterfallTierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  splitLP: z.number().min(0).max(100).optional(),
  splitGP: z.number().min(0).max(100).optional(),
  hurdleRate: z.number().min(0).optional(),
  appliesTo: z.string().optional(),
});

// ── Accounting ─────────────────────────────────────────

export const UpdateAccountingConnectionSchema = z.object({
  entityId: z.string().min(1),
  syncStatus: z.enum(["CONNECTED", "SYNCING", "DISCONNECTED", "ERROR"]),
  lastSyncAt: z.string().optional(),
});

export const AtlasAccountBucketEnum = z.enum([
  "CASH",
  "INVESTMENTS_AT_COST",
  "OTHER_ASSETS",
  "LIABILITIES",
  "EQUITY_PARTNERS_CAPITAL",
]);

export const CreateAccountMappingSchema = z.object({
  connectionId: z.string().min(1),
  atlasAccountType: AtlasAccountBucketEnum,
  providerAccountId: z.string().min(1),
  providerAccountName: z.string().min(1),
  isAutoDetected: z.boolean().optional(),
});

export const UpdateAccountMappingSchema = z.object({
  atlasAccountType: AtlasAccountBucketEnum,
});

// ── Entities ───────────────────────────────────────────

export const UpdateEntitySchema = z.object({
  name: z.string().min(1).optional(),
  legalName: z.string().optional(),
  entityType: z.enum(["MAIN_FUND", "SIDECAR", "SPV", "CO_INVEST_VEHICLE", "GP_ENTITY", "HOLDING_COMPANY"]).optional(),
  vehicleStructure: z.enum(["LLC", "LP", "CORP", "TRUST"]).optional(),
  status: z.enum(["ACTIVE", "WINDING_DOWN", "DISSOLVED"]).optional(),
  vintageYear: z.number().int().optional(),
  targetSize: z.number().optional(),
  totalCommitments: z.number().optional(),
  investmentPeriodEnd: z.string().optional(),
  fundTermYears: z.number().int().optional(),
  extensionOptions: z.string().optional(),
  fiscalYearEnd: z.string().optional(),
  regulatoryFilings: z.any().optional(),
  legalCounsel: z.string().optional(),
  taxPreparer: z.string().optional(),
  ein: z.string().optional(),
  stateOfFormation: z.string().optional(),
  waterfallTemplateId: z.string().optional(),
});

// ── Entities (Create) ─────────────────────────────────

export const CreateEntitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  entityType: z.enum(["MAIN_FUND", "SIDECAR", "SPV", "CO_INVEST_VEHICLE", "GP_ENTITY", "HOLDING_COMPANY"]),
  vehicleStructure: z.enum(["LLC", "LP", "CORP", "TRUST"]).default("LLC"),
  vintageYear: z.number().int().optional(),
  targetSize: z.number().optional(),
  legalName: z.string().optional(),
  stateOfFormation: z.string().optional(),
  ein: z.string().optional(),
  fiscalYearEnd: z.string().optional(),
  fundTermYears: z.number().int().optional(),
  startFormation: z.boolean().optional(),
});

// ── Firms ─────────────────────────────────────────────

export const UpdateFirmSchema = z.object({
  name: z.string().min(1).optional(),
  legalName: z.string().optional(),
});

// ── AI / Command Bar ─────────────────────────────────

export const AISearchSchema = z.object({
  query: z.string().min(1, "Query is required"),
  firmId: z.string().min(1, "Firm ID is required"),
});

export const AgentQuerySchema = z.object({
  action: z.literal("query"),
  query: z.string().min(1, "Query is required"),
  firmId: z.string().min(1, "Firm ID is required"),
});

export const AgentListSchema = z.object({
  action: z.literal("list"),
});

// ── AI Configuration ────────────────────────────────

export const UpdateAIConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic"]).optional(),
  model: z.string().min(1).optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  systemPrompt: z.string().optional(),
  thresholdScore: z.number().int().min(0).max(100).optional(),
  maxDocuments: z.number().int().min(1).max(50).optional(),
  processingMode: z.enum(["async", "sync"]).optional(),
});

// ── AI Prompt Templates ────────────────────────────

export const CreateAIPromptTemplateSchema = z.object({
  type: z.string().min(1, "Template type is required"),
  module: z.string().min(1).default("deals"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  content: z.string().min(1, "Prompt content is required"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const UpdateAIPromptTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  content: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// ── Decision Structures ─────────────────────────────

export const CreateDecisionStructureSchema = z.object({
  firmId: z.string().min(1, "Firm ID is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  quorumRequired: z.number().int().min(1).default(1),
  approvalThreshold: z.number().int().min(1).default(1),
});

export const UpdateDecisionStructureSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  quorumRequired: z.number().int().min(1).optional(),
  approvalThreshold: z.number().int().min(1).optional(),
});

export const AddDecisionMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.string().default("VOTER"),
});

// ── IC Voting ───────────────────────────────────────

export const CastICVoteSchema = z.object({
  vote: z.enum(["APPROVE", "REJECT", "SEND_BACK"]),
  conditions: z.string().optional(),
  userId: z.string().min(1, "User ID is required"),
});

// ── Permissions ─────────────────────────────────────

const PermissionLevelSchema = z.enum(["full", "read_only", "none"]);

export const UpdatePermissionsSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  permissions: z.object({
    deals: PermissionLevelSchema,
    entities: PermissionLevelSchema,
    capital_activity: PermissionLevelSchema,
    investors: PermissionLevelSchema,
    documents: PermissionLevelSchema,
    settings: PermissionLevelSchema,
    reports: PermissionLevelSchema,
  }),
});

export const UpdateEntityAccessSchema = z.object({
  entityIds: z.array(z.string()).min(0),
});

// ── Notification Preferences ─────────────────────────

export const UpdateNotificationPreferencesSchema = z.object({
  preferredChannel: z.enum(["EMAIL", "SMS", "PORTAL_ONLY"]).optional(),
  emailAddress: z.string().email().nullable().optional(),
  phoneNumber: z.string().min(10).nullable().optional(),
  digestPreference: z.enum(["IMMEDIATE", "DAILY_DIGEST", "WEEKLY_DIGEST"]).optional(),
  notificationTypes: z.object({
    capitalActivity: z.boolean().default(true),    // capital calls issued, distributions paid
    reports: z.boolean().default(true),             // quarterly reports, K-1 ready
    portfolio: z.boolean().default(true),           // NAV updates, valuation changes, new deal closes
  }).optional(),
});

// ── Reports ────────────────────────────────────────

export const GenerateReportSchema = z.object({
  entityId: z.string().min(1, "Entity ID is required"),
  reportType: z.enum(["QUARTERLY", "CAPITAL_ACCOUNT_STATEMENT", "FUND_SUMMARY"]),
  period: z.string().optional(), // e.g. "Q4 2025" or "2025"
  investorId: z.string().optional(), // for investor-specific capital account statement
});

// ── Bulk Deal Actions ────────────────────────────────

export const BulkDealActionSchema = z.object({
  dealIds: z.array(z.string()).min(1, "Select at least one deal"),
  action: z.enum(["kill", "assign", "advance"]),
  killReason: z.string().optional(),
  assignLeadId: z.string().optional(),
  firmId: z.string(),
});

// ── Audit Log ────────────────────────────────────────

export const AuditLogQuerySchema = z.object({
  firmId: z.string().min(1, "Firm ID is required"),
  targetType: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});
