import { z } from "zod";

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

export const CreateDealSchema = z.object({
  name: z.string().min(1, "Name is required"),
  assetClass: z.enum(ASSET_CLASSES),
  capitalInstrument: z.enum(CAPITAL_INSTRUMENTS).optional(),
  participationStructure: z.enum(PARTICIPATION_STRUCTURES).optional(),
  sector: z.string().optional(),
  targetSize: z.string().optional(),
  targetCheckSize: z.string().optional(),
  targetReturn: z.string().optional(),
  dealLeadId: z.string().optional(),
  gpName: z.string().optional(),
  source: z.string().optional(),
  counterparty: z.string().optional(),
  description: z.string().optional(),
  thesisNotes: z.string().optional(),
  investmentRationale: z.string().optional(),
  additionalContext: z.string().optional(),
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
});

export const KillDealSchema = z.object({
  action: z.literal("KILL"),
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

// ── Deal Activity ───────────────────────────────────

export const CreateDealActivitySchema = z.object({
  activityType: z.string().min(1),
  description: z.string().min(1),
  metadata: z.any().optional(),
});

export const CreateNoteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
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

// ── Investors ──────────────────────────────────────────

export const CreateInvestorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  investorType: z.string().min(1, "Type is required"),
  totalCommitted: z.number().nonnegative().default(0),
  kycStatus: z.string().default("Pending"),
  advisoryBoard: z.boolean().default(false),
  contactPreference: z.string().default("Email"),
});

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
  syncStatus: z.enum(["CONNECTED", "DISCONNECTED", "ERROR"]),
  lastSyncAt: z.string().optional(),
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
});

// ── Firms ─────────────────────────────────────────────

export const UpdateFirmSchema = z.object({
  name: z.string().min(1).optional(),
  legalName: z.string().optional(),
});
