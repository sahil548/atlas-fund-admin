import { describe, it, expect } from "vitest";
import { VALID_TYPES } from "@/lib/notification-types";

// ── VALID_TYPES set membership ────────────────────────────

describe("VALID_TYPES notification type set", () => {
  const expectedTypes = [
    "STAGE_CHANGE",
    "IC_VOTE",
    "DOCUMENT_UPLOAD",
    "CAPITAL_CALL",
    "TASK_ASSIGNED",
    "CLOSING_UPDATE",
    "GENERAL",
    "DISTRIBUTION",
    "REPORT",
  ];

  it("contains all 9 expected notification types", () => {
    expect(VALID_TYPES.size).toBe(9);
  });

  for (const type of expectedTypes) {
    it(`contains the type: ${type}`, () => {
      expect(VALID_TYPES.has(type)).toBe(true);
    });
  }

  it("does not contain an invalid type", () => {
    expect(VALID_TYPES.has("INVALID_TYPE")).toBe(false);
    expect(VALID_TYPES.has("")).toBe(false);
    expect(VALID_TYPES.has("stage_change")).toBe(false); // case-sensitive
  });
});

// ── Type filter logic (mirrors route behavior) ────────────

describe("notification type filter logic", () => {
  function applyTypeFilter(typeParam: string | null): string | undefined {
    return typeParam && VALID_TYPES.has(typeParam) ? typeParam : undefined;
  }

  it("returns the type when it is valid", () => {
    expect(applyTypeFilter("CAPITAL_CALL")).toBe("CAPITAL_CALL");
  });

  it("returns undefined for an invalid type", () => {
    expect(applyTypeFilter("INVALID")).toBeUndefined();
  });

  it("returns undefined for null input", () => {
    expect(applyTypeFilter(null)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(applyTypeFilter("")).toBeUndefined();
  });

  it("returns undefined for lowercase valid type (case-sensitive filter)", () => {
    expect(applyTypeFilter("report")).toBeUndefined();
  });
});
