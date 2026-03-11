import { describe, it, expect } from "vitest";
import {
  // Entity
  RegulatoryFilingsSchema,
  NavProxyConfigSchema,
  // AccountingConnection
  OauthCredentialsSchema,
  // TrialBalanceSnapshot
  AccountDataSchema,
  // User
  UserPermissionsSchema,
  PersonalAiConfigSchema,
  // Asset
  ProjectedMetricsSchema,
  // Lease
  RentEscalationSchema,
  RenewalOptionsSchema,
  TerminationOptionsSchema,
  // CreditAgreement
  AmortizationScheduleSchema,
  PrepaymentTermsSchema,
  CollateralSchema,
  GuarantorsSchema,
  DefaultProvisionsSchema,
  // Covenant
  BreachHistorySchema,
  // InvestorNotificationPreference
  InvestorNotificationTypesSchema,
  // NAVComputation
  NAVComputationDetailsSchema,
  // WaterfallCalculation
  WaterfallResultsSchema,
  // FeeCalculation
  FeeCalculationDetailsSchema,
  // CapitalAccount
  CapitalAccountDetailsSchema,
  // Deal
  AiPromptConfigSchema,
  DealMetadataSchema,
  // AIScreeningResult
  ScreeningStrengthsSchema,
  ScreeningRisksSchema,
  ScreeningFinancialsSchema,
  DDFindingsSchema,
  InputContextSchema,
  ScreeningConfigSchema,
  IcMemoSchema,
  PreviousVersionsSchema,
  // DealActivity
  DealActivityMetadataSchema,
  // Meeting
  MeetingDecisionsSchema,
  // Document
  ExtractedFieldsSchema,
  AppliedFieldsSchema,
  // ESignaturePackage
  SignersSchema,
  // AuditLog
  AuditLogMetadataSchema,
  // IntegrationConnection
  IntegrationMetadataSchema,
} from "../json-schemas";

// ============================================================
// DealMetadataSchema (Deal.dealMetadata)
// ============================================================
describe("DealMetadataSchema", () => {
  it("parses valid deal metadata", () => {
    const result = DealMetadataSchema.safeParse({
      extractedSize: "$50M",
      expectedReturn: "25%",
      structure: "equity",
    });
    expect(result.success).toBe(true);
  });

  it("parses empty object", () => {
    const result = DealMetadataSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts null (nullable field)", () => {
    const result = DealMetadataSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});

// ============================================================
// NavProxyConfigSchema (Entity.navProxyConfig)
// ============================================================
describe("NavProxyConfigSchema", () => {
  it("parses valid nav proxy config", () => {
    const result = NavProxyConfigSchema.safeParse({
      cashPercent: 20,
      otherAssetsPercent: 30,
      liabilitiesPercent: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects value above 100", () => {
    const result = NavProxyConfigSchema.safeParse({
      cashPercent: 200,
      otherAssetsPercent: 30,
      liabilitiesPercent: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects value below 0", () => {
    const result = NavProxyConfigSchema.safeParse({
      cashPercent: -5,
      otherAssetsPercent: 30,
      liabilitiesPercent: 10,
    });
    expect(result.success).toBe(false);
  });

  it("accepts null (nullable field)", () => {
    const result = NavProxyConfigSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("rejects missing required fields", () => {
    const result = NavProxyConfigSchema.safeParse({
      cashPercent: 20,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// MeetingDecisionsSchema (Meeting.decisions)
// ============================================================
describe("MeetingDecisionsSchema", () => {
  it("parses valid meeting decisions", () => {
    const result = MeetingDecisionsSchema.safeParse({
      actionItemsText: "1. Schedule follow-up\n2. Review financials",
      actionItemsList: ["Schedule follow-up", "Review financials"],
      keywords: ["valuation", "term sheet"],
    });
    expect(result.success).toBe(true);
  });

  it("parses empty object", () => {
    const result = MeetingDecisionsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = MeetingDecisionsSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("rejects non-array for actionItemsList", () => {
    const result = MeetingDecisionsSchema.safeParse({
      actionItemsList: "not an array",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// ExtractedFieldsSchema (Document.extractedFields)
// ============================================================
describe("ExtractedFieldsSchema", () => {
  it("parses valid extracted fields", () => {
    const result = ExtractedFieldsSchema.safeParse({
      companyName: { aiValue: "Acme Corp", label: "Company Name" },
      revenue: { aiValue: 5000000, label: "Revenue" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = ExtractedFieldsSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("rejects entry missing label", () => {
    const result = ExtractedFieldsSchema.safeParse({
      companyName: { aiValue: "Acme Corp" },
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// AppliedFieldsSchema (Document.appliedFields)
// ============================================================
describe("AppliedFieldsSchema", () => {
  it("parses valid applied fields", () => {
    const result = AppliedFieldsSchema.safeParse({
      companyName: {
        aiValue: "Acme Corp",
        appliedValue: "Acme Corporation",
        appliedAt: "2024-01-15T10:00:00Z",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = AppliedFieldsSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});

// ============================================================
// UserPermissionsSchema (User.permissions)
// ============================================================
describe("UserPermissionsSchema", () => {
  it("parses valid user permissions", () => {
    const result = UserPermissionsSchema.safeParse({
      canViewDeals: true,
      canViewAssets: false,
      notifEmail: true,
      notifSms: false,
      digestFrequency: "daily",
    });
    expect(result.success).toBe(true);
  });

  it("parses empty object", () => {
    const result = UserPermissionsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = UserPermissionsSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});

// ============================================================
// ProjectedMetricsSchema (Asset.projectedMetrics)
// ============================================================
describe("ProjectedMetricsSchema", () => {
  it("parses real estate projected metrics", () => {
    const result = ProjectedMetricsSchema.safeParse({
      capRate: 0.065,
      cashOnCash: 0.08,
      targetIRR: 0.15,
    });
    expect(result.success).toBe(true);
  });

  it("parses credit projected metrics", () => {
    const result = ProjectedMetricsSchema.safeParse({
      yieldToMaturity: 0.12,
      currentYield: 0.10,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = ProjectedMetricsSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("parses empty object", () => {
    const result = ProjectedMetricsSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ============================================================
// IcMemoSchema (AIScreeningResult.memo)
// ============================================================
describe("IcMemoSchema", () => {
  it("parses valid IC memo", () => {
    const result = IcMemoSchema.safeParse({
      summary: "This is a promising deal.",
      sections: [
        { title: "Executive Summary", content: "...", order: 1 },
        { title: "Financial Analysis", content: "...", order: 2 },
      ],
      recommendation: "Proceed to IC vote",
      generatedAt: "2024-01-15T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = IcMemoSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("parses empty object", () => {
    const result = IcMemoSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects non-array for sections", () => {
    const result = IcMemoSchema.safeParse({
      sections: "not an array",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// RegulatoryFilingsSchema (Entity.regulatoryFilings)
// ============================================================
describe("RegulatoryFilingsSchema", () => {
  it("parses valid regulatory filings array", () => {
    const result = RegulatoryFilingsSchema.safeParse([
      { type: "Form D", filedDate: "2024-01-01", status: "filed" },
      { type: "Schedule 13G", status: "pending" },
    ]);
    expect(result.success).toBe(true);
  });

  it("accepts empty array", () => {
    const result = RegulatoryFilingsSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = RegulatoryFilingsSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("rejects entry missing required type field", () => {
    const result = RegulatoryFilingsSchema.safeParse([
      { filedDate: "2024-01-01" }, // missing type
    ]);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// WaterfallResultsSchema (WaterfallCalculation.results)
// ============================================================
describe("WaterfallResultsSchema", () => {
  it("parses valid waterfall results", () => {
    const result = WaterfallResultsSchema.safeParse({
      totalDistributable: 5000000,
      tiers: [
        { tierName: "Return of Capital", lpAmount: 3000000, gpAmount: 0, hurdleCleared: true },
        { tierName: "Carried Interest", lpAmount: 1600000, gpAmount: 400000, hurdleCleared: true },
      ],
      lpTotal: 4600000,
      gpTotal: 400000,
    });
    expect(result.success).toBe(true);
  });

  it("parses empty object", () => {
    const result = WaterfallResultsSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ============================================================
// AuditLogMetadataSchema (AuditLog.metadata)
// ============================================================
describe("AuditLogMetadataSchema", () => {
  it("parses valid audit log metadata", () => {
    const result = AuditLogMetadataSchema.safeParse({
      before: { stage: "SCREENING" },
      after: { stage: "DUE_DILIGENCE" },
      description: "Deal advanced to due diligence",
      changedFields: ["stage"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = AuditLogMetadataSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});

// ============================================================
// AccountDataSchema (TrialBalanceSnapshot.accountData)
// ============================================================
describe("AccountDataSchema", () => {
  it("parses valid trial balance account data", () => {
    const result = AccountDataSchema.safeParse([
      {
        accountId: "acc-1",
        accountName: "Cash",
        accountType: "ASSET",
        debit: 100000,
        credit: 0,
        balance: 100000,
      },
    ]);
    expect(result.success).toBe(true);
  });

  it("rejects entry with missing required fields", () => {
    const result = AccountDataSchema.safeParse([
      { accountId: "acc-1", accountName: "Cash" }, // missing required fields
    ]);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// SignersSchema (ESignaturePackage.signers)
// ============================================================
describe("SignersSchema", () => {
  it("parses valid signers array", () => {
    const result = SignersSchema.safeParse([
      { name: "John Smith", email: "john@example.com", role: "signer", order: 1 },
      { name: "Jane Doe", email: "jane@example.com", role: "cc", order: 2 },
    ]);
    expect(result.success).toBe(true);
  });

  it("accepts empty array", () => {
    const result = SignersSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = SignersSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});

// ============================================================
// IntegrationMetadataSchema (IntegrationConnection.metadata)
// ============================================================
describe("IntegrationMetadataSchema", () => {
  it("parses workspace config as key-value map", () => {
    const result = IntegrationMetadataSchema.safeParse({
      workspaceId: "ws-123",
      projectId: "proj-456",
      syncEnabled: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = IntegrationMetadataSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});

// ============================================================
// BreachHistorySchema (Covenant.breachHistory)
// ============================================================
describe("BreachHistorySchema", () => {
  it("parses valid breach history", () => {
    const result = BreachHistorySchema.safeParse([
      { date: "2024-03-15", value: 0.8, status: "BREACH", resolution: "Waived", notes: "Q1 2024" },
    ]);
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = BreachHistorySchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("rejects entry missing required date field", () => {
    const result = BreachHistorySchema.safeParse([{ value: 0.8 }]);
    expect(result.success).toBe(false);
  });
});

// ============================================================
// ScreeningStrengthsSchema and ScreeningRisksSchema
// ============================================================
describe("ScreeningStrengthsSchema", () => {
  it("parses array of strings", () => {
    const result = ScreeningStrengthsSchema.safeParse([
      "Strong management team",
      "Market leader position",
    ]);
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = ScreeningStrengthsSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it("rejects non-string items", () => {
    const result = ScreeningStrengthsSchema.safeParse([1, 2, 3]);
    expect(result.success).toBe(false);
  });
});

describe("ScreeningRisksSchema", () => {
  it("parses array of risk strings", () => {
    const result = ScreeningRisksSchema.safeParse([
      "High leverage",
      "Market concentration",
    ]);
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = ScreeningRisksSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});

// ============================================================
// DealActivityMetadataSchema (DealActivity.metadata)
// ============================================================
describe("DealActivityMetadataSchema", () => {
  it("parses stage change metadata", () => {
    const result = DealActivityMetadataSchema.safeParse({
      before: { stage: "SCREENING" },
      after: { stage: "IC_REVIEW" },
      description: "Advanced to IC Review",
      changedFields: ["stage"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = DealActivityMetadataSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});

// ============================================================
// PersonalAiConfigSchema (User.personalAiConfig)
// ============================================================
describe("PersonalAiConfigSchema", () => {
  it("parses valid personal AI config", () => {
    const result = PersonalAiConfigSchema.safeParse({
      provider: "openai",
      model: "gpt-4o",
      apiKey: "sk-encrypted",
      apiKeyIV: "iv-string",
      apiKeyTag: "tag-string",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = PersonalAiConfigSchema.safeParse(null);
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });
});
