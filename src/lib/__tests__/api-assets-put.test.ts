/**
 * Unit tests for the expanded PUT /api/assets/[id] handler
 * covering common scalars + type-conditional typeDetails fields.
 *
 * These tests validate the UpdateAssetSchema Zod schema only (no live DB).
 * They follow the established pattern from asset-exit.test.ts.
 */

import { describe, it, expect } from "vitest";
import { UpdateAssetSchema } from "../schemas";

describe("UpdateAssetSchema — common scalars", () => {
  it("accepts name update", () => {
    const result = UpdateAssetSchema.safeParse({ name: "New Asset Name" });
    expect(result.success).toBe(true);
  });

  it("accepts entryDate as ISO datetime string", () => {
    const result = UpdateAssetSchema.safeParse({
      entryDate: "2020-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects entryDate as plain date string (not ISO datetime)", () => {
    // Zod datetime() requires full ISO 8601 with time component
    const result = UpdateAssetSchema.safeParse({ entryDate: "2020-01-01" });
    expect(result.success).toBe(false);
  });

  it("accepts costBasis of 0 (explicitly valid)", () => {
    const result = UpdateAssetSchema.safeParse({ costBasis: 0 });
    expect(result.success).toBe(true);
  });

  it("rejects negative costBasis", () => {
    const result = UpdateAssetSchema.safeParse({ costBasis: -1000 });
    expect(result.success).toBe(false);
  });

  it("accepts sector field update", () => {
    const result = UpdateAssetSchema.safeParse({
      sector: "Healthcare",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty body (at least one field required)", () => {
    const result = UpdateAssetSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/at least one field/i);
    }
  });
});

describe("UpdateAssetSchema — PRIVATE_CREDIT typeDetails", () => {
  it("accepts Private Credit typeDetails with spread and maturityDate", () => {
    const result = UpdateAssetSchema.safeParse({
      typeDetails: {
        kind: "PRIVATE_CREDIT",
        spread: "SOFR+450bps",
        maturity: "2028-06-15",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts Private Credit typeDetails with rate string", () => {
    const result = UpdateAssetSchema.safeParse({
      typeDetails: {
        kind: "PRIVATE_CREDIT",
        rate: "12% Fixed",
        principal: "$15M",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts Private Credit typeDetails with all optional fields absent", () => {
    const result = UpdateAssetSchema.safeParse({
      typeDetails: { kind: "PRIVATE_CREDIT" },
    });
    expect(result.success).toBe(true);
  });
});

describe("UpdateAssetSchema — REAL_ESTATE typeDetails", () => {
  it("accepts Real Estate typeDetails with capRate and propertyType", () => {
    const result = UpdateAssetSchema.safeParse({
      typeDetails: {
        kind: "REAL_ESTATE",
        capRate: "6.7%",
        propertyType: "Industrial Warehouse",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts Real Estate typeDetails with squareFeet and occupancy", () => {
    const result = UpdateAssetSchema.safeParse({
      typeDetails: {
        kind: "REAL_ESTATE",
        squareFeet: "185,000",
        occupancy: "94%",
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("UpdateAssetSchema — OPERATING typeDetails", () => {
  it("accepts Operating typeDetails with ownership and ebitda", () => {
    const result = UpdateAssetSchema.safeParse({
      typeDetails: {
        kind: "OPERATING",
        ownership: "18.4%",
        ebitda: "$22M",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts Operating typeDetails with revenue and growth", () => {
    const result = UpdateAssetSchema.safeParse({
      typeDetails: {
        kind: "OPERATING",
        revenue: "$85M",
        growth: "+42% YoY",
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("UpdateAssetSchema — LP_INTEREST typeDetails", () => {
  it("accepts LP Interest typeDetails with commitment and vintage", () => {
    const result = UpdateAssetSchema.safeParse({
      typeDetails: {
        kind: "LP_INTEREST",
        commitment: "$15M",
        vintage: 2022,
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts LP Interest typeDetails with gpName and gpNav", () => {
    const result = UpdateAssetSchema.safeParse({
      typeDetails: {
        kind: "LP_INTEREST",
        gpName: "Sequoia Capital",
        gpNav: "$14.2M",
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("UpdateAssetSchema — discriminatedUnion kind validation", () => {
  it("rejects unknown kind in typeDetails", () => {
    const result = UpdateAssetSchema.safeParse({
      typeDetails: { kind: "UNKNOWN_TYPE", someField: "value" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects typeDetails with no kind field", () => {
    const result = UpdateAssetSchema.safeParse({
      typeDetails: { capRate: "6.7%" },
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdateAssetSchema — combined common + typeDetails", () => {
  it("accepts common scalars combined with typeDetails", () => {
    const result = UpdateAssetSchema.safeParse({
      name: "Updated Asset",
      costBasis: 15_000_000,
      typeDetails: {
        kind: "REAL_ESTATE",
        capRate: "7.2%",
        propertyType: "Industrial",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts common-only update (typeDetails omitted)", () => {
    const result = UpdateAssetSchema.safeParse({
      name: "Renamed Asset",
      entryDate: "2020-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});
