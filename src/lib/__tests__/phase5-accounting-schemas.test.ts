import { describe, it, expect } from "vitest";
import {
  AtlasAccountBucketEnum,
  CreateAccountMappingSchema,
  UpdateAccountMappingSchema,
  UpdateAccountingConnectionSchema,
} from "@/lib/schemas";

/**
 * Phase 5 — ACCT-01 through ACCT-03
 * Requirement: Zod schemas enforce valid accounting data shapes for
 * account buckets, account mappings, and accounting connections.
 */

// ── AtlasAccountBucketEnum ─────────────────────────────────────

describe("AtlasAccountBucketEnum — validates 5 Atlas account buckets", () => {
  const validBuckets = [
    "CASH",
    "INVESTMENTS_AT_COST",
    "OTHER_ASSETS",
    "LIABILITIES",
    "EQUITY_PARTNERS_CAPITAL",
  ];

  it.each(validBuckets)("accepts valid bucket '%s'", (bucket) => {
    const result = AtlasAccountBucketEnum.safeParse(bucket);
    expect(result.success).toBe(true);
  });

  it("rejects invalid bucket value", () => {
    const result = AtlasAccountBucketEnum.safeParse("REVENUE");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = AtlasAccountBucketEnum.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects null", () => {
    const result = AtlasAccountBucketEnum.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("rejects number", () => {
    const result = AtlasAccountBucketEnum.safeParse(42);
    expect(result.success).toBe(false);
  });
});

// ── CreateAccountMappingSchema ─────────────────────────────────

describe("CreateAccountMappingSchema — validates account mapping creation", () => {
  const validPayload = {
    connectionId: "conn-123",
    atlasAccountType: "CASH",
    providerAccountId: "acct-456",
    providerAccountName: "Checking Account",
  };

  it("accepts valid mapping with all required fields", () => {
    const result = CreateAccountMappingSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.connectionId).toBe("conn-123");
      expect(result.data.atlasAccountType).toBe("CASH");
      expect(result.data.providerAccountId).toBe("acct-456");
      expect(result.data.providerAccountName).toBe("Checking Account");
    }
  });

  it("accepts valid mapping with optional isAutoDetected field", () => {
    const result = CreateAccountMappingSchema.safeParse({
      ...validPayload,
      isAutoDetected: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAutoDetected).toBe(true);
    }
  });

  it("rejects missing connectionId", () => {
    const { connectionId, ...rest } = validPayload;
    const result = CreateAccountMappingSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty connectionId", () => {
    const result = CreateAccountMappingSchema.safeParse({
      ...validPayload,
      connectionId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing atlasAccountType", () => {
    const { atlasAccountType, ...rest } = validPayload;
    const result = CreateAccountMappingSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid atlasAccountType", () => {
    const result = CreateAccountMappingSchema.safeParse({
      ...validPayload,
      atlasAccountType: "INVALID_BUCKET",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing providerAccountId", () => {
    const { providerAccountId, ...rest } = validPayload;
    const result = CreateAccountMappingSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty providerAccountId", () => {
    const result = CreateAccountMappingSchema.safeParse({
      ...validPayload,
      providerAccountId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing providerAccountName", () => {
    const { providerAccountName, ...rest } = validPayload;
    const result = CreateAccountMappingSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty providerAccountName", () => {
    const result = CreateAccountMappingSchema.safeParse({
      ...validPayload,
      providerAccountName: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all 5 bucket types as atlasAccountType", () => {
    const buckets = [
      "CASH",
      "INVESTMENTS_AT_COST",
      "OTHER_ASSETS",
      "LIABILITIES",
      "EQUITY_PARTNERS_CAPITAL",
    ];
    for (const bucket of buckets) {
      const result = CreateAccountMappingSchema.safeParse({
        ...validPayload,
        atlasAccountType: bucket,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ── UpdateAccountMappingSchema ─────────────────────────────────

describe("UpdateAccountMappingSchema — validates account mapping updates", () => {
  it("accepts valid atlasAccountType update", () => {
    const result = UpdateAccountMappingSchema.safeParse({
      atlasAccountType: "LIABILITIES",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.atlasAccountType).toBe("LIABILITIES");
    }
  });

  it("rejects invalid atlasAccountType", () => {
    const result = UpdateAccountMappingSchema.safeParse({
      atlasAccountType: "NOT_A_BUCKET",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing atlasAccountType", () => {
    const result = UpdateAccountMappingSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ── UpdateAccountingConnectionSchema ───────────────────────────

describe("UpdateAccountingConnectionSchema — validates connection status updates", () => {
  it("accepts valid connection update with SYNCING status", () => {
    const result = UpdateAccountingConnectionSchema.safeParse({
      entityId: "entity-1",
      syncStatus: "SYNCING",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.syncStatus).toBe("SYNCING");
    }
  });

  it("accepts CONNECTED status", () => {
    const result = UpdateAccountingConnectionSchema.safeParse({
      entityId: "entity-1",
      syncStatus: "CONNECTED",
    });
    expect(result.success).toBe(true);
  });

  it("accepts DISCONNECTED status", () => {
    const result = UpdateAccountingConnectionSchema.safeParse({
      entityId: "entity-1",
      syncStatus: "DISCONNECTED",
    });
    expect(result.success).toBe(true);
  });

  it("accepts ERROR status", () => {
    const result = UpdateAccountingConnectionSchema.safeParse({
      entityId: "entity-1",
      syncStatus: "ERROR",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional lastSyncAt field", () => {
    const result = UpdateAccountingConnectionSchema.safeParse({
      entityId: "entity-1",
      syncStatus: "CONNECTED",
      lastSyncAt: "2026-03-08T12:00:00Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lastSyncAt).toBe("2026-03-08T12:00:00Z");
    }
  });

  it("rejects invalid syncStatus", () => {
    const result = UpdateAccountingConnectionSchema.safeParse({
      entityId: "entity-1",
      syncStatus: "PENDING",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing entityId", () => {
    const result = UpdateAccountingConnectionSchema.safeParse({
      syncStatus: "CONNECTED",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty entityId", () => {
    const result = UpdateAccountingConnectionSchema.safeParse({
      entityId: "",
      syncStatus: "CONNECTED",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing syncStatus", () => {
    const result = UpdateAccountingConnectionSchema.safeParse({
      entityId: "entity-1",
    });
    expect(result.success).toBe(false);
  });
});
