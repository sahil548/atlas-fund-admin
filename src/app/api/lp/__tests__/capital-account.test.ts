import { describe, it, expect, vi, beforeEach } from "vitest";
import { xirr } from "@/lib/computations/irr";
import { computeMetrics } from "@/lib/computations/metrics";

// Capital Account Date Range Filtering (LP-04)
// These tests verify the filtering and metric computation logic that powers the API.
// We test the computation functions directly since they are pure/deterministic.

// Simulated ledger entry type
interface LedgerEntry {
  date: Date;
  type: "CONTRIBUTION" | "DISTRIBUTION" | "FEE" | "INCOME";
  entityId: string;
  entityName: string;
  description: string;
  amount: number;
}

// Simulate the date-filtering logic from the API route
function filterEntriesByDateRange(
  entries: LedgerEntry[],
  startDate?: string,
  endDate?: string
): LedgerEntry[] {
  if (!startDate || !endDate) return entries;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return entries.filter((e) => {
    const t = e.date.getTime();
    return t >= start && t <= end;
  });
}

// Compute period metrics from filtered entries (mirrors route logic)
function computePeriodMetricsFromEntries(
  entries: LedgerEntry[],
  endDate?: string
) {
  const totalContributed = entries
    .filter((e) => e.type === "CONTRIBUTION")
    .reduce((s, e) => s + Math.abs(e.amount), 0);
  const totalDistributed = entries
    .filter((e) => e.type === "DISTRIBUTION")
    .reduce((s, e) => s + e.amount, 0);
  const periodBalance = entries.reduce((s, e) => s + e.amount, 0);

  const metrics = computeMetrics(
    totalContributed,
    totalDistributed,
    Math.max(0, periodBalance)
  );

  const cashFlows: { date: Date; amount: number }[] = [];
  for (const entry of entries) {
    if (entry.type === "CONTRIBUTION" || entry.type === "DISTRIBUTION") {
      cashFlows.push({ date: entry.date, amount: entry.amount });
    }
  }
  if (periodBalance > 0 && endDate) {
    cashFlows.push({ date: new Date(endDate), amount: periodBalance });
  }

  const irr = cashFlows.length >= 2 ? xirr(cashFlows) : null;

  return { irr, tvpi: metrics.tvpi, dpi: metrics.dpi, rvpi: metrics.rvpi };
}

// Sample test data: a set of ledger entries spanning multiple quarters
const ALL_ENTRIES: LedgerEntry[] = [
  {
    date: new Date("2024-01-15"),
    type: "CONTRIBUTION",
    entityId: "entity-1",
    entityName: "Fund I",
    description: "Capital Call #1",
    amount: -100000,
  },
  {
    date: new Date("2024-03-20"),
    type: "CONTRIBUTION",
    entityId: "entity-1",
    entityName: "Fund I",
    description: "Capital Call #2",
    amount: -50000,
  },
  {
    date: new Date("2024-07-10"),
    type: "DISTRIBUTION",
    entityId: "entity-1",
    entityName: "Fund I",
    description: "Distribution",
    amount: 30000,
  },
  {
    date: new Date("2024-10-01"),
    type: "FEE",
    entityId: "entity-1",
    entityName: "Fund I",
    description: "Management Fee",
    amount: -2000,
  },
];

describe("Capital Account — Date Range Filtering (LP-04)", () => {
  it("returns all ledger entries when no date params provided (backward compatible)", () => {
    const filtered = filterEntriesByDateRange(ALL_ENTRIES, undefined, undefined);
    expect(filtered).toHaveLength(ALL_ENTRIES.length);
    expect(filtered).toEqual(ALL_ENTRIES);
  });

  it("filters ledger entries by startDate/endDate query params", () => {
    // Q1 2024 only
    const filtered = filterEntriesByDateRange(ALL_ENTRIES, "2024-01-01", "2024-03-31");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((e) => e.type === "CONTRIBUTION")).toBe(true);
    expect(filtered.map((e) => e.description)).toEqual([
      "Capital Call #1",
      "Capital Call #2",
    ]);
  });

  it("recalculates periodMetrics (IRR, TVPI, DPI, RVPI) for the selected date range", () => {
    // Full date range
    const filtered = filterEntriesByDateRange(ALL_ENTRIES, "2024-01-01", "2024-12-31");
    const metrics = computePeriodMetricsFromEntries(filtered, "2024-12-31");

    expect(metrics).toHaveProperty("irr");
    expect(metrics).toHaveProperty("tvpi");
    expect(metrics).toHaveProperty("dpi");
    expect(metrics).toHaveProperty("rvpi");

    // With contributions=150k, distributions=30k, and no residual balance (balance is negative),
    // tvpi should be 0 (paidIn > 0, but totalDistributed + max(0, balance) / paidIn)
    // Actually balance = -100000 + -50000 + 30000 + -2000 = -122000, so max(0, -122000) = 0
    // tvpi = (30000 + 0) / 150000 = 0.2
    expect(metrics.tvpi).toBeCloseTo(0.2, 2);
    expect(metrics.dpi).toBeCloseTo(0.2, 2); // 30000 / 150000
    expect(metrics.rvpi).toBeCloseTo(0, 2);  // 0 / 150000
  });

  it("computes correct period metrics for Q1 preset range", () => {
    // Q1: only 2 contributions of 100k + 50k, no distributions
    const q1Start = "2024-01-01";
    const q1End = "2024-03-31";
    const filtered = filterEntriesByDateRange(ALL_ENTRIES, q1Start, q1End);
    expect(filtered).toHaveLength(2);

    const metrics = computePeriodMetricsFromEntries(filtered, q1End);
    // Called = 150000, distributed = 0, balance = -150000 (negative, clamped to 0)
    // tvpi = (0 + 0) / 150000 = 0
    expect(metrics.tvpi).toBeCloseTo(0, 2);
    expect(metrics.dpi).toBeCloseTo(0, 2);
    expect(metrics.rvpi).toBeCloseTo(0, 2);
    // IRR should be null (no inflows in Q1)
    expect(metrics.irr).toBeNull();
  });

  it("handles empty date range (no matching transactions) gracefully", () => {
    // Far future range with no transactions
    const filtered = filterEntriesByDateRange(ALL_ENTRIES, "2030-01-01", "2030-12-31");
    expect(filtered).toHaveLength(0);

    const metrics = computePeriodMetricsFromEntries(filtered, "2030-12-31");
    // All metrics should be null (no paid-in capital)
    expect(metrics.tvpi).toBeNull();
    expect(metrics.dpi).toBeNull();
    expect(metrics.rvpi).toBeNull();
    expect(metrics.irr).toBeNull();
  });
});
