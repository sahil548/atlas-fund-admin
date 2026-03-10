import { describe, it, expect } from "vitest";

describe("Capital Account — Date Range Filtering (LP-04)", () => {
  it.todo("returns all ledger entries when no date params provided (backward compatible)");
  it.todo("filters ledger entries by startDate/endDate query params");
  it.todo("recalculates periodMetrics (IRR, TVPI, DPI, RVPI) for the selected date range");
  it.todo("computes correct period metrics for Q1 preset range");
  it.todo("handles empty date range (no matching transactions) gracefully");
});
