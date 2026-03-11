// Zod schemas for all 39 JSON blob fields in prisma/schema.prisma
// One named schema per Json/Json? field, grouped by model.
// Use z.record(z.string(), z.unknown()) for genuinely dynamic fields (Zod 4 syntax).
// Use .nullable() for Json? fields to accept null values.

import { z } from "zod";

// ============================================================
// Entity model
// ============================================================

// Entity.regulatoryFilings — array of filing objects
export const RegulatoryFilingSchema = z.object({
  type: z.string(),
  filedDate: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});
export const RegulatoryFilingsSchema = z.array(RegulatoryFilingSchema).nullable();

// Entity.navProxyConfig — { cashPercent, otherAssetsPercent, liabilitiesPercent }
export const NavProxyConfigSchema = z
  .object({
    cashPercent: z.number().min(0).max(100),
    otherAssetsPercent: z.number().min(0).max(100),
    liabilitiesPercent: z.number().min(0).max(100),
  })
  .nullable();

// ============================================================
// AccountingConnection model
// ============================================================

// AccountingConnection.oauthCredentials — provider-specific OAuth tokens
export const OauthCredentialsSchema = z
  .object({
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    tokenExpiry: z.string().optional(),
    scope: z.string().optional(),
  })
  .nullable();

// ============================================================
// TrialBalanceSnapshot model
// ============================================================

// TrialBalanceSnapshot.accountData — array of { accountId, accountName, accountType, debit, credit, balance }
export const TrialBalanceAccountSchema = z.object({
  accountId: z.string(),
  accountName: z.string(),
  accountType: z.string(),
  debit: z.number(),
  credit: z.number(),
  balance: z.number(),
});
export const AccountDataSchema = z.array(TrialBalanceAccountSchema);

// ============================================================
// User model
// ============================================================

// User.permissions — GP_TEAM configurable permissions + notification prefs
export const UserPermissionsSchema = z
  .object({
    // Area permissions
    canViewDeals: z.boolean().optional(),
    canViewAssets: z.boolean().optional(),
    canViewCapital: z.boolean().optional(),
    canViewEntities: z.boolean().optional(),
    canViewReports: z.boolean().optional(),
    // Notification preferences
    notifEmail: z.boolean().optional(),
    notifSms: z.boolean().optional(),
    digestFrequency: z.string().optional(),
  })
  .nullable();

// User.personalAiConfig — { provider, model, apiKey, apiKeyIV, apiKeyTag }
export const PersonalAiConfigSchema = z
  .object({
    provider: z.string().optional(),
    model: z.string().optional(),
    apiKey: z.string().optional(),
    apiKeyIV: z.string().optional(),
    apiKeyTag: z.string().optional(),
  })
  .nullable();

// ============================================================
// Asset model
// ============================================================

// Asset.projectedMetrics — asset-class-specific projected metrics
export const ProjectedMetricsSchema = z
  .object({
    // Real estate
    capRate: z.number().optional(),
    cashOnCash: z.number().optional(),
    // Credit
    yieldToMaturity: z.number().optional(),
    currentYield: z.number().optional(),
    // Equity / operating business
    revenueMultiple: z.number().optional(),
    ebitdaMultiple: z.number().optional(),
    // Generic
    targetIRR: z.number().optional(),
    targetMultiple: z.number().optional(),
  })
  .nullable();

// ============================================================
// Lease model
// ============================================================

// Lease.rentEscalation
export const RentEscalationSchema = z
  .object({
    type: z.string().optional(), // "fixed_percent" | "cpi" | "fixed_amount"
    rate: z.number().optional(),
    amount: z.number().optional(),
    schedule: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .nullable();

// Lease.renewalOptions
export const RenewalOptionsSchema = z
  .array(
    z.object({
      termYears: z.number().optional(),
      noticeDays: z.number().optional(),
      rentAdjustment: z.string().optional(),
      notes: z.string().optional(),
    })
  )
  .nullable();

// Lease.terminationOptions
export const TerminationOptionsSchema = z
  .object({
    earlyTerminationFee: z.number().optional(),
    noticeDays: z.number().optional(),
    conditions: z.string().optional(),
    notes: z.string().optional(),
  })
  .nullable();

// ============================================================
// CreditAgreement model
// ============================================================

// CreditAgreement.amortizationSchedule — array of scheduled payment entries
export const AmortizationEntrySchema = z.object({
  date: z.string().optional(),
  principal: z.number().optional(),
  interest: z.number().optional(),
  balance: z.number().optional(),
});
export const AmortizationScheduleSchema = z
  .array(AmortizationEntrySchema)
  .nullable();

// CreditAgreement.prepaymentTerms
export const PrepaymentTermsSchema = z
  .object({
    lockoutPeriodMonths: z.number().optional(),
    prepaymentPenaltyPercent: z.number().optional(),
    makeWholeProvision: z.boolean().optional(),
    notes: z.string().optional(),
  })
  .nullable();

// CreditAgreement.collateral — array of collateral items
export const CollateralSchema = z
  .array(
    z.object({
      type: z.string().optional(),
      description: z.string().optional(),
      value: z.number().optional(),
      lienPosition: z.string().optional(),
    })
  )
  .nullable();

// CreditAgreement.guarantors — array of guarantor records
export const GuarantorsSchema = z
  .array(
    z.object({
      name: z.string().optional(),
      type: z.string().optional(), // "personal" | "corporate"
      amount: z.number().optional(),
      notes: z.string().optional(),
    })
  )
  .nullable();

// CreditAgreement.defaultProvisions
export const DefaultProvisionsSchema = z
  .object({
    crossDefaultThreshold: z.number().optional(),
    gracePeriosDays: z.number().optional(),
    events: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .nullable();

// ============================================================
// Covenant model
// ============================================================

// Covenant.breachHistory — array of breach event records
export const BreachEventSchema = z.object({
  date: z.string(),
  value: z.number().optional(),
  status: z.string().optional(),
  resolution: z.string().optional(),
  notes: z.string().optional(),
});
export const BreachHistorySchema = z.array(BreachEventSchema).nullable();

// ============================================================
// InvestorNotificationPreference model
// ============================================================

// InvestorNotificationPreference.notificationTypes
export const InvestorNotificationTypesSchema = z
  .record(z.string(), z.boolean())
  .nullable();

// ============================================================
// NAVComputation model
// ============================================================

// NAVComputation.details — breakdown of NAV computation
export const NAVComputationDetailsSchema = z
  .object({
    assetBreakdown: z.array(z.record(z.string(), z.unknown())).optional(),
    adjustments: z.record(z.string(), z.unknown()).optional(),
    notes: z.string().optional(),
  })
  .nullable();

// ============================================================
// WaterfallCalculation model
// ============================================================

// WaterfallCalculation.results — full waterfall calc output
export const WaterfallResultsSchema = z.object({
  totalDistributable: z.number().optional(),
  tiers: z
    .array(
      z.object({
        tierName: z.string().optional(),
        lpAmount: z.number().optional(),
        gpAmount: z.number().optional(),
        hurdleCleared: z.boolean().optional(),
      })
    )
    .optional(),
  lpTotal: z.number().optional(),
  gpTotal: z.number().optional(),
  scenarios: z.array(z.record(z.string(), z.unknown())).optional(),
});

// ============================================================
// FeeCalculation model
// ============================================================

// FeeCalculation.details — breakdown of fee calculation
export const FeeCalculationDetailsSchema = z
  .object({
    managementFeeBreakdown: z.record(z.string(), z.unknown()).optional(),
    carryBreakdown: z.record(z.string(), z.unknown()).optional(),
    notes: z.string().optional(),
  })
  .nullable();

// ============================================================
// CapitalAccount model
// ============================================================

// CapitalAccount.details — period-level capital account detail
export const CapitalAccountDetailsSchema = z
  .object({
    allocationBreakdown: z.record(z.string(), z.unknown()).optional(),
    notes: z.string().optional(),
  })
  .nullable();

// ============================================================
// Deal model
// ============================================================

// Deal.aiPromptConfig — AI prompt configuration for this deal
export const AiPromptConfigSchema = z
  .object({
    systemPrompt: z.string().optional(),
    userPromptTemplate: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    model: z.string().optional(),
  })
  .nullable();

// Deal.dealMetadata — AI-extracted structured data
export const DealMetadataSchema = z
  .object({
    extractedSize: z.string().optional(),
    expectedReturn: z.string().optional(),
    structure: z.string().optional(),
    sector: z.string().optional(),
    targetCheckSize: z.string().optional(),
    targetReturn: z.string().optional(),
    notes: z.string().optional(),
  })
  .nullable();

// ============================================================
// AIScreeningResult model
// ============================================================

// AIScreeningResult.strengths — array of strength strings
export const ScreeningStrengthsSchema = z.array(z.string()).nullable();

// AIScreeningResult.risks — array of risk strings
export const ScreeningRisksSchema = z.array(z.string()).nullable();

// AIScreeningResult.financials — extracted financial data
export const ScreeningFinancialsSchema = z
  .object({
    revenue: z.string().optional(),
    ebitda: z.string().optional(),
    debtLevel: z.string().optional(),
    equity: z.string().optional(),
    multiple: z.string().optional(),
    notes: z.string().optional(),
  })
  .nullable();

// AIScreeningResult.ddFindings — due diligence findings
export const DDFindingsSchema = z
  .object({
    summary: z.string().optional(),
    findings: z.array(z.record(z.string(), z.unknown())).optional(),
    redFlags: z.array(z.string()).optional(),
  })
  .nullable();

// AIScreeningResult.inputContext — context used for AI screening
export const InputContextSchema = z
  .object({
    documentText: z.string().optional(),
    dealDetails: z.record(z.string(), z.unknown()).optional(),
    additionalContext: z.string().optional(),
  })
  .nullable();

// AIScreeningResult.screeningConfig — configuration for AI screening
export const ScreeningConfigSchema = z
  .object({
    model: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    version: z.string().optional(),
  })
  .nullable();

// AIScreeningResult.memo — IC Memo: { summary, sections[], recommendation }
export const MemoSectionSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  order: z.number().optional(),
});
export const IcMemoSchema = z
  .object({
    summary: z.string().optional(),
    sections: z.array(MemoSectionSchema).optional(),
    recommendation: z.string().optional(),
    generatedAt: z.string().optional(),
  })
  .nullable();

// AIScreeningResult.previousVersions — array of full snapshots for version history
export const PreviousVersionsSchema = z
  .array(z.record(z.string(), z.unknown()))
  .nullable();

// ============================================================
// DealActivity model
// ============================================================

// DealActivity.metadata — activity event metadata
export const DealActivityMetadataSchema = z
  .object({
    before: z.record(z.string(), z.unknown()).optional(),
    after: z.record(z.string(), z.unknown()).optional(),
    description: z.string().optional(),
    changedFields: z.array(z.string()).optional(),
  })
  .nullable();

// ============================================================
// Meeting model
// ============================================================

// Meeting.decisions — action items, keywords from Fireflies or manual entry
export const MeetingDecisionsSchema = z
  .object({
    actionItemsText: z.string().optional(),
    actionItemsList: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
  })
  .nullable();

// ============================================================
// Document model
// ============================================================

// Document.extractedFields — raw AI output: { fieldKey: { aiValue, label } }
export const ExtractedFieldSchema = z.object({
  aiValue: z.unknown(),
  label: z.string(),
});
export const ExtractedFieldsSchema = z
  .record(z.string(), ExtractedFieldSchema)
  .nullable();

// Document.appliedFields — audit record: { fieldKey: { aiValue, appliedValue, appliedAt } }
export const AppliedFieldEntrySchema = z.object({
  aiValue: z.unknown(),
  appliedValue: z.unknown(),
  appliedAt: z.string().optional(),
});
export const AppliedFieldsSchema = z
  .record(z.string(), AppliedFieldEntrySchema)
  .nullable();

// ============================================================
// ESignaturePackage model
// ============================================================

// ESignaturePackage.signers — array of signer objects
export const SignerSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  role: z.string().optional(),
  order: z.number().optional(),
  status: z.string().optional(),
});
export const SignersSchema = z.array(SignerSchema).nullable();

// ============================================================
// AuditLog model
// ============================================================

// AuditLog.metadata — { before, after, description, ... }
export const AuditLogMetadataSchema = z
  .object({
    before: z.record(z.string(), z.unknown()).optional(),
    after: z.record(z.string(), z.unknown()).optional(),
    description: z.string().optional(),
    changedFields: z.array(z.string()).optional(),
  })
  .nullable();

// ============================================================
// IntegrationConnection model
// ============================================================

// IntegrationConnection.metadata — provider-specific config (workspace ID, project ID, etc.)
export const IntegrationMetadataSchema = z
  .record(z.string(), z.unknown())
  .nullable();
