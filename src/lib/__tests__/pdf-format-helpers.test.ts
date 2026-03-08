import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatPercent,
  formatMultiple,
  formatDate,
  formatDateShort,
} from "@/lib/pdf/shared-styles";

// ── formatCurrency ────────────────────────────────────────

describe("formatCurrency", () => {
  it("returns em dash for null", () => {
    expect(formatCurrency(null)).toBe("—");
  });

  it("returns em dash for undefined", () => {
    expect(formatCurrency(undefined)).toBe("—");
  });

  it("returns em dash for NaN", () => {
    expect(formatCurrency(NaN)).toBe("—");
  });

  it("formats 500 as $500", () => {
    expect(formatCurrency(500)).toBe("$500");
  });

  it("formats 1500 as $1.5K", () => {
    expect(formatCurrency(1500)).toBe("$1.5K");
  });

  it("formats 1500000 as $1.50M", () => {
    expect(formatCurrency(1500000)).toBe("$1.50M");
  });

  it("formats 1500000000 as $1.50B", () => {
    expect(formatCurrency(1500000000)).toBe("$1.50B");
  });

  it("formats negative 1500 as -$1.5K", () => {
    expect(formatCurrency(-1500)).toBe("-$1.5K");
  });

  it("formats negative 2000000 as -$2.00M", () => {
    expect(formatCurrency(-2000000)).toBe("-$2.00M");
  });
});

// ── formatPercent ─────────────────────────────────────────

describe("formatPercent", () => {
  it("returns em dash for null", () => {
    expect(formatPercent(null)).toBe("—");
  });

  it("returns em dash for undefined", () => {
    expect(formatPercent(undefined)).toBe("—");
  });

  it("formats 0.155 as 15.5% with default 1 decimal", () => {
    expect(formatPercent(0.155)).toBe("15.5%");
  });

  it("formats 0.155 with 2 decimals as 15.50%", () => {
    expect(formatPercent(0.155, 2)).toBe("15.50%");
  });

  it("formats 0 as 0.0%", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });
});

// ── formatMultiple ────────────────────────────────────────

describe("formatMultiple", () => {
  it("returns em dash for null", () => {
    expect(formatMultiple(null)).toBe("—");
  });

  it("returns em dash for undefined", () => {
    expect(formatMultiple(undefined)).toBe("—");
  });

  it("formats 1.5 as 1.50x", () => {
    expect(formatMultiple(1.5)).toBe("1.50x");
  });

  it("formats 2 as 2.00x", () => {
    expect(formatMultiple(2)).toBe("2.00x");
  });
});

// ── formatDate ────────────────────────────────────────────

describe("formatDate", () => {
  it("returns em dash for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("returns em dash for undefined", () => {
    expect(formatDate(undefined)).toBe("—");
  });

  it("formats a valid ISO date string to long format — contains year", () => {
    // Pass a Date object to avoid timezone off-by-one from UTC ISO strings
    const result = formatDate(new Date(2025, 0, 15));
    expect(result).toContain("2025");
    expect(result).toContain("15");
  });

  it("includes month abbreviation for a valid date", () => {
    const result = formatDate(new Date(2025, 2, 1)); // March 1, local time
    expect(result).toMatch(/Mar/);
  });

  it("returns em dash for empty string", () => {
    expect(formatDate("")).toBe("—");
  });
});

// ── formatDateShort ───────────────────────────────────────

describe("formatDateShort", () => {
  it("returns em dash for null", () => {
    expect(formatDateShort(null)).toBe("—");
  });

  it("returns em dash for undefined", () => {
    expect(formatDateShort(undefined)).toBe("—");
  });

  it("formats a valid date without year", () => {
    // Use Date constructor to avoid UTC timezone off-by-one
    const result = formatDateShort(new Date(2025, 5, 20)); // June 20, local time
    expect(result).toContain("20");
    expect(result).toMatch(/Jun/);
  });

  it("returns em dash for empty string", () => {
    expect(formatDateShort("")).toBe("—");
  });
});
