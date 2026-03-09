import { describe, it, expect } from "vitest";
import { fmt, pct, formatDate, formatDateShort, formatRelativeTime } from "@/lib/utils";

// ============================================================
// Formatter Tests — Wave 0
// ============================================================

describe("formatDate", () => {
  it('formats Date object to "Mar 8, 2026" format', () => {
    // Use local time constructor to avoid UTC off-by-one (Pitfall 5)
    expect(formatDate(new Date(2026, 2, 8))).toBe("Mar 8, 2026");
  });

  it("returns em-dash for null", () => {
    expect(formatDate(null)).toBe("\u2014");
  });

  it("returns em-dash for undefined", () => {
    expect(formatDate(undefined)).toBe("\u2014");
  });

  it("returns em-dash for invalid string", () => {
    expect(formatDate("invalid")).toBe("\u2014");
  });

  it("formats ISO string correctly", () => {
    // Use a full ISO string with time to avoid UTC midnight issue
    expect(formatDate("2026-03-08T12:00:00")).toBe("Mar 8, 2026");
  });
});

describe("formatDateShort", () => {
  it('formats Date object to "Mar 8" (no year)', () => {
    expect(formatDateShort(new Date(2026, 2, 8))).toBe("Mar 8");
  });

  it("returns em-dash for null", () => {
    expect(formatDateShort(null)).toBe("\u2014");
  });

  it("returns em-dash for undefined", () => {
    expect(formatDateShort(undefined)).toBe("\u2014");
  });
});

describe("formatRelativeTime", () => {
  it('returns "just now" for 30 seconds ago', () => {
    const d = new Date(Date.now() - 30 * 1000).toISOString();
    expect(formatRelativeTime(d)).toBe("just now");
  });

  it('returns "45m ago" for 45 minutes ago', () => {
    const d = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    expect(formatRelativeTime(d)).toBe("45m ago");
  });

  it('returns "3h ago" for 3 hours ago', () => {
    const d = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(d)).toBe("3h ago");
  });

  it('returns "yesterday" for 1 day ago', () => {
    const d = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(d)).toBe("yesterday");
  });

  it('returns "5d ago" for 5 days ago', () => {
    const d = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(d)).toBe("5d ago");
  });

  it("falls back to formatDate for 14 days ago", () => {
    const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const d = date.toISOString();
    const result = formatRelativeTime(d);
    // Should fall back to absolute date format (not relative)
    expect(result).not.toContain("ago");
    expect(result).not.toBe("just now");
    expect(result).not.toBe("yesterday");
  });
});

// ============================================================
// Regression Tests — existing fmt/pct must not change
// ============================================================

describe("fmt (regression)", () => {
  it('fmt(0) returns "$0"', () => {
    expect(fmt(0)).toBe("$0");
  });

  it('fmt(1500000) returns "$1.5M"', () => {
    expect(fmt(1500000)).toBe("$1.5M");
  });

  it('fmt(2500) returns "$2500" or "$3K" range', () => {
    expect(fmt(2500)).toBe("$3K");
  });

  it("fmt handles negative numbers", () => {
    expect(fmt(-1500000)).toBe("$-1.5M");
  });
});

describe("pct (regression)", () => {
  it('pct(0.15) returns "15.0%"', () => {
    expect(pct(0.15)).toBe("15.0%");
  });

  it('pct(1) returns "100.0%"', () => {
    expect(pct(1)).toBe("100.0%");
  });
});

// ============================================================
// Component Tests — Placeholder blocks (filled in Task 2)
// ============================================================

describe("EmptyState", () => {
  it.todo("exports EmptyState component");
});

describe("TableSkeleton", () => {
  it.todo("exports TableSkeleton component");
});

describe("PageHeader", () => {
  it.todo("exports PageHeader component");
});

describe("SectionPanel", () => {
  it.todo("exports SectionPanel component");
});
