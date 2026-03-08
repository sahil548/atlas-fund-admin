import { describe, it, expect } from "vitest";
import {
  KillDealSchema,
  AddDealEntitySchema,
  AddCustomClosingItemSchema,
  CastICVoteSchema,
  CreateDecisionStructureSchema,
  UpdateDecisionStructureSchema,
  AddDecisionMemberSchema,
  CreateDealSchema,
  PARTICIPATION_STRUCTURES,
} from "@/lib/schemas";

// ── KillDealSchema (DEAL-09) ─────────────────────────────────
// Requirement: Kill deal requires a reason (dropdown + free text)

describe("KillDealSchema — kill deal requires a reason", () => {
  it("accepts valid kill payload with required reason", () => {
    const result = KillDealSchema.safeParse({
      action: "KILL",
      killReason: "Pricing",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid kill payload with reason and optional free text", () => {
    const result = KillDealSchema.safeParse({
      action: "KILL",
      killReason: "Risk",
      killReasonText: "Leverage too high for current market conditions",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.killReason).toBe("Risk");
      expect(result.data.killReasonText).toBe("Leverage too high for current market conditions");
    }
  });

  it("rejects kill payload missing killReason", () => {
    const result = KillDealSchema.safeParse({
      action: "KILL",
    });
    expect(result.success).toBe(false);
  });

  it("rejects kill payload with empty killReason string", () => {
    const result = KillDealSchema.safeParse({
      action: "KILL",
      killReason: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects kill payload missing action field", () => {
    const result = KillDealSchema.safeParse({
      killReason: "Timing",
    });
    expect(result.success).toBe(false);
  });

  it("killReasonText is optional — payload without it is valid", () => {
    const result = KillDealSchema.safeParse({
      action: "KILL",
      killReason: "Other",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.killReasonText).toBeUndefined();
    }
  });
});

// ── AddDealEntitySchema (DEAL-04) ────────────────────────────
// Requirement: Deal can be linked to multiple entities via junction table

describe("AddDealEntitySchema — multi-entity deal support", () => {
  it("accepts a payload with required entityId only", () => {
    const result = AddDealEntitySchema.safeParse({ entityId: "entity-abc-123" });
    expect(result.success).toBe(true);
  });

  it("accepts a payload with entityId, allocationPercent, and role", () => {
    const result = AddDealEntitySchema.safeParse({
      entityId: "entity-abc-123",
      allocationPercent: 60,
      role: "Lead Entity",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allocationPercent).toBe(60);
      expect(result.data.role).toBe("Lead Entity");
    }
  });

  it("rejects payload missing entityId", () => {
    const result = AddDealEntitySchema.safeParse({
      allocationPercent: 50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty entityId", () => {
    const result = AddDealEntitySchema.safeParse({ entityId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects allocationPercent above 100", () => {
    const result = AddDealEntitySchema.safeParse({
      entityId: "entity-abc-123",
      allocationPercent: 110,
    });
    expect(result.success).toBe(false);
  });

  it("rejects allocationPercent below 0", () => {
    const result = AddDealEntitySchema.safeParse({
      entityId: "entity-abc-123",
      allocationPercent: -5,
    });
    expect(result.success).toBe(false);
  });
});

// ── AddCustomClosingItemSchema (DEAL-02) ─────────────────────
// Requirement: Closing checklist supports custom items (GP can add beyond template)

describe("AddCustomClosingItemSchema — custom closing checklist items", () => {
  it("accepts a valid custom item title", () => {
    const result = AddCustomClosingItemSchema.safeParse({
      title: "Execute side letter",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = AddCustomClosingItemSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty title string", () => {
    const result = AddCustomClosingItemSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });
});

// ── CastICVoteSchema (DEAL-08) ───────────────────────────────
// Requirement: Vote options are Approve, Reject, Send Back; conditions are optional

describe("CastICVoteSchema — IC voting with optional conditions", () => {
  it("accepts APPROVE vote with userId", () => {
    const result = CastICVoteSchema.safeParse({
      vote: "APPROVE",
      userId: "user-abc",
    });
    expect(result.success).toBe(true);
  });

  it("accepts REJECT vote with userId", () => {
    const result = CastICVoteSchema.safeParse({
      vote: "REJECT",
      userId: "user-abc",
    });
    expect(result.success).toBe(true);
  });

  it("accepts SEND_BACK vote with userId", () => {
    const result = CastICVoteSchema.safeParse({
      vote: "SEND_BACK",
      userId: "user-abc",
    });
    expect(result.success).toBe(true);
  });

  it("accepts vote with optional conditions text", () => {
    const result = CastICVoteSchema.safeParse({
      vote: "APPROVE",
      userId: "user-abc",
      conditions: "Contingent on side letter review",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conditions).toBe("Contingent on side letter review");
    }
  });

  it("rejects unknown vote value", () => {
    const result = CastICVoteSchema.safeParse({
      vote: "ABSTAIN",
      userId: "user-abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing userId", () => {
    const result = CastICVoteSchema.safeParse({
      vote: "APPROVE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty userId", () => {
    const result = CastICVoteSchema.safeParse({
      vote: "APPROVE",
      userId: "",
    });
    expect(result.success).toBe(false);
  });

  it("conditions are optional — vote without conditions is valid", () => {
    const result = CastICVoteSchema.safeParse({
      vote: "REJECT",
      userId: "user-xyz",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conditions).toBeUndefined();
    }
  });
});

// ── CreateDecisionStructureSchema (DEAL-08) ──────────────────
// Requirement: Each structure defines name, who votes (member list), quorum, approval threshold

describe("CreateDecisionStructureSchema — IC decision structure configuration", () => {
  it("accepts valid structure with required fields", () => {
    const result = CreateDecisionStructureSchema.safeParse({
      firmId: "firm-abc",
      name: "Investment Committee",
    });
    expect(result.success).toBe(true);
  });

  it("accepts structure with optional description and thresholds", () => {
    const result = CreateDecisionStructureSchema.safeParse({
      firmId: "firm-abc",
      name: "Board Vote",
      description: "Full board approval required",
      quorumRequired: 3,
      approvalThreshold: 3,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quorumRequired).toBe(3);
      expect(result.data.approvalThreshold).toBe(3);
    }
  });

  it("defaults quorumRequired to 1 when not provided", () => {
    const result = CreateDecisionStructureSchema.safeParse({
      firmId: "firm-abc",
      name: "Single Approver",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quorumRequired).toBe(1);
    }
  });

  it("defaults approvalThreshold to 1 when not provided", () => {
    const result = CreateDecisionStructureSchema.safeParse({
      firmId: "firm-abc",
      name: "Single Approver",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.approvalThreshold).toBe(1);
    }
  });

  it("rejects structure missing firmId", () => {
    const result = CreateDecisionStructureSchema.safeParse({
      name: "IC",
    });
    expect(result.success).toBe(false);
  });

  it("rejects structure missing name", () => {
    const result = CreateDecisionStructureSchema.safeParse({
      firmId: "firm-abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects quorumRequired below 1", () => {
    const result = CreateDecisionStructureSchema.safeParse({
      firmId: "firm-abc",
      name: "IC",
      quorumRequired: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ── UpdateDecisionStructureSchema (DEAL-08) ──────────────────

describe("UpdateDecisionStructureSchema — IC structure update validation", () => {
  it("accepts partial update with name only", () => {
    const result = UpdateDecisionStructureSchema.safeParse({
      name: "Renamed IC",
    });
    expect(result.success).toBe(true);
  });

  it("accepts update with quorumRequired and approvalThreshold", () => {
    const result = UpdateDecisionStructureSchema.safeParse({
      quorumRequired: 2,
      approvalThreshold: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects quorumRequired below 1", () => {
    const result = UpdateDecisionStructureSchema.safeParse({
      quorumRequired: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ── AddDecisionMemberSchema (DEAL-08) ────────────────────────

describe("AddDecisionMemberSchema — IC committee member role assignment", () => {
  it("accepts member with userId only (defaults role to VOTER)", () => {
    const result = AddDecisionMemberSchema.safeParse({
      userId: "user-abc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("VOTER");
    }
  });

  it("accepts member with explicit role OBSERVER", () => {
    const result = AddDecisionMemberSchema.safeParse({
      userId: "user-abc",
      role: "OBSERVER",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("OBSERVER");
    }
  });

  it("rejects missing userId", () => {
    const result = AddDecisionMemberSchema.safeParse({ role: "VOTER" });
    expect(result.success).toBe(false);
  });

  it("rejects empty userId", () => {
    const result = AddDecisionMemberSchema.safeParse({ userId: "" });
    expect(result.success).toBe(false);
  });
});

// ── CreateDealSchema — Participation Structure (DEAL-01) ─────
// Requirement: Wizard Step 1 includes Participation Structure dropdown

describe("CreateDealSchema — participation structure field in deal creation", () => {
  it("accepts deal creation with participationStructure DIRECT_GP", () => {
    const result = CreateDealSchema.safeParse({
      name: "Tech Acquisition",
      assetClass: "OPERATING_BUSINESS",
      participationStructure: "DIRECT_GP",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.participationStructure).toBe("DIRECT_GP");
    }
  });

  it("accepts deal creation with participationStructure CO_INVEST_JV_PARTNERSHIP", () => {
    const result = CreateDealSchema.safeParse({
      name: "RE Acquisition",
      assetClass: "REAL_ESTATE",
      participationStructure: "CO_INVEST_JV_PARTNERSHIP",
    });
    expect(result.success).toBe(true);
  });

  it("accepts deal creation with participationStructure LP_STAKE_SILENT_PARTNER", () => {
    const result = CreateDealSchema.safeParse({
      name: "Fund Investment",
      assetClass: "DIVERSIFIED",
      participationStructure: "LP_STAKE_SILENT_PARTNER",
    });
    expect(result.success).toBe(true);
  });

  it("accepts deal creation without participationStructure (optional field)", () => {
    const result = CreateDealSchema.safeParse({
      name: "Opportunity",
      assetClass: "REAL_ESTATE",
    });
    expect(result.success).toBe(true);
  });

  it("all participation structure enum values are valid", () => {
    expect(PARTICIPATION_STRUCTURES).toContain("DIRECT_GP");
    expect(PARTICIPATION_STRUCTURES).toContain("CO_INVEST_JV_PARTNERSHIP");
    expect(PARTICIPATION_STRUCTURES).toContain("LP_STAKE_SILENT_PARTNER");
    expect(PARTICIPATION_STRUCTURES).toHaveLength(3);
  });

  it("rejects invalid participationStructure value", () => {
    const result = CreateDealSchema.safeParse({
      name: "Deal",
      assetClass: "REAL_ESTATE",
      participationStructure: "SYNDICATION",
    });
    expect(result.success).toBe(false);
  });
});
