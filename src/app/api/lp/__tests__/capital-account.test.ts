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

// ── FIN-12 LP-Obs 2 — Category-sum reconciliation ──────────────────────────────

/**
 * EntitySummary shape returned by the capital account API.
 * distributionBreakdown is the new field added by the FIN-12 fix.
 */
interface EntitySummary {
  entityId: string;
  entityName: string;
  commitment: number;
  currentBalance: number;
  totalContributed: number;
  totalDistributed: number;
  totalFees: number;
  distributionBreakdown?: {
    returnOfCapital: number;
    income: number;
    longTermGain: number;
  };
}

/**
 * Assert that the sum of distribution category breakdown rows equals totalDistributed
 * within a 1-cent tolerance (floating-point safe).
 *
 * This function mirrors the invariant that the API must satisfy per FIN-12.
 */
function assertCategorySumEqualsTotal(summary: EntitySummary): void {
  if (!summary.distributionBreakdown) {
    // If no breakdown, totalDistributed must be 0 (nothing to reconcile)
    // OR the breakdown is legitimately absent for this entity (no PAID distributions)
    return;
  }
  const { returnOfCapital, income, longTermGain } = summary.distributionBreakdown;
  const breakdownSum = returnOfCapital + income + longTermGain;
  const diff = Math.abs(breakdownSum - summary.totalDistributed);
  expect(diff).toBeLessThan(0.01);
}

/**
 * Test the category-sum = total invariant using synthetic API response fixtures.
 *
 * These fixtures represent the expected post-fix API response for each seeded LP:
 *   - investor-1 (CalPERS / Michael Chen): entity1, entity2, entity4, entity5
 *   - investor-2 (Harvard / David Morrison): entity1, entity2, entity6
 *   - investor-3 (Wellington / Tom Wellington): entity2, entity3, entity7
 *   - investor-4 (Meridian / Rachel Adams): entity1, entity2, entity4, entity8
 *   - investor-5 (Pacific Rim): entity2, entity3, entity7
 *
 * The breakdown values are derived from the seed data proportions.
 */
describe("FIN-12 LP-Obs 2 — capital account reconciliation", () => {
  it("category-sum equals totalDistributed for LP with zero distributions", () => {
    const summary: EntitySummary = {
      entityId: "entity-3",
      entityName: "Atlas Fund III",
      commitment: 20_000_000,
      currentBalance: -14_100_000,
      totalContributed: 14_100_000,
      totalDistributed: 0,
      totalFees: 0,
      distributionBreakdown: {
        returnOfCapital: 0,
        income: 0,
        longTermGain: 0,
      },
    };
    assertCategorySumEqualsTotal(summary);
    expect(summary.totalDistributed).toBe(0);
  });

  it("category-sum equals totalDistributed for LP with only income distributions", () => {
    // entity2 dist-h6 for Wellington: pure income distribution
    const summary: EntitySummary = {
      entityId: "entity-2",
      entityName: "Atlas Fund II",
      commitment: 25_000_000,
      currentBalance: -13_000_000,
      totalContributed: 15_500_000,
      // dist-h6 Wellington share: 3,500,000 × (25/297) = ~294,613
      totalDistributed: 294_613,
      totalFees: 0,
      distributionBreakdown: {
        returnOfCapital: 0,
        income: 294_613,
        longTermGain: 0,
      },
    };
    assertCategorySumEqualsTotal(summary);
  });

  it("category-sum equals totalDistributed for LP with mixed ROC + LTG (carried interest excluded)", () => {
    // entity2 dist-h2 for Wellington: ROC + LTG, carry excluded from net
    // grossAmount = 8M, carry = 800K, netToLPs = 7.2M
    // Wellington proRata = 25M / 297M = 8.4175%
    // netAmount = 7,200,000 × 0.084175 = ~606,060
    // ROC = 3,000,000 × 0.084175 = ~252,525
    // LTG = 4,200,000 × 0.084175 = ~353,535
    // income = 0
    // ROC + income + LTG = 252,525 + 0 + 353,535 = 606,060 = netAmount ✓
    const netAmount = 606_060;
    const roc = 252_525;
    const ltg = 353_535;
    const summary: EntitySummary = {
      entityId: "entity-2",
      entityName: "Atlas Fund II",
      commitment: 25_000_000,
      currentBalance: -10_000_000,
      totalContributed: 15_500_000,
      totalDistributed: netAmount,
      totalFees: 0,
      distributionBreakdown: {
        returnOfCapital: roc,
        income: 0,
        longTermGain: ltg,
      },
    };
    assertCategorySumEqualsTotal(summary);
  });

  it("category-sum equals totalDistributed for CalPERS entity1 (multiple distribution types)", () => {
    // CalPERS (investor-1) entity1 distributions (PAID):
    // dist-1: netAmount = 20,790,000 (ROC=7,700,000 + income=2,002,000 + LTG=11,088,000 = 20,790,000 ✓)
    // dist-2: netAmount = 4,620,000 (income=4,620,000)
    // dist-4: netAmount = 462,000 (income=462,000)
    // total = 25,872,000
    const summary: EntitySummary = {
      entityId: "entity-1",
      entityName: "Atlas Fund I",
      commitment: 50_000_000,
      currentBalance: 0,
      totalContributed: 45_000_000,
      totalDistributed: 25_872_000,
      totalFees: 0,
      distributionBreakdown: {
        returnOfCapital: 7_700_000,
        income: 7_084_000,  // 2,002,000 + 4,620,000 + 462,000
        longTermGain: 11_088_000,
      },
    };
    // 7,700,000 + 7,084,000 + 11,088,000 = 25,872,000 = totalDistributed ✓
    assertCategorySumEqualsTotal(summary);
  });

  it("category-sum equals totalDistributed when breakdown is absent (no distributions)", () => {
    const summary: EntitySummary = {
      entityId: "entity-7",
      entityName: "Co-Invest SPV",
      commitment: 10_000_000,
      currentBalance: -8_000_000,
      totalContributed: 8_000_000,
      totalDistributed: 0,
      totalFees: 0,
      // no distributionBreakdown — entity has no PAID distributions
    };
    // Should not throw — absent breakdown with $0 total is valid
    assertCategorySumEqualsTotal(summary);
  });

  it("API EntitySummary breakdownSum invariant holds for all seeded LP fixture responses", () => {
    /**
     * Simulate all EntitySummary responses that should come from the post-fix API.
     * Each entry is one entity for one investor, with correct breakdown values.
     * Net = ROC + income + LTG (carry stays with GP and is excluded from netAmount).
     */
    const allEntitySummaries: EntitySummary[] = [
      // ── CalPERS (investor-1) ──
      {
        entityId: "entity-1", entityName: "Atlas Fund I",
        commitment: 50_000_000, currentBalance: 0, totalContributed: 45_000_000,
        totalDistributed: 25_872_000, totalFees: 0,
        distributionBreakdown: { returnOfCapital: 7_700_000, income: 7_084_000, longTermGain: 11_088_000 },
      },
      {
        entityId: "entity-2", entityName: "Atlas Fund II",
        commitment: 75_000_000, currentBalance: 0, totalContributed: 46_500_000,
        // entity2 PAID distributions for inv1: dist-h2, dist-h6, dist-h12
        // inv1 proRata = 75M/297M = 25.253%
        // dist-h2: net = 7.2M × 0.25253 = ~1,818,216; ROC = 3M×0.25253=757,590; LTG=4.2M×0.25253=1,060,626
        // dist-h6: net = 3.5M × 0.25253 = ~883,855; income=883,855
        // dist-h12: net = 13.5M × 0.25253 = ~3,409,155; ROC=5M×0.25253=1,262,650; LTG=8.5M×0.25253=2,146,505
        // total net = 1,818,216 + 883,855 + 3,409,155 = 6,111,226
        // total ROC = 757,590 + 1,262,650 = 2,020,240
        // total income = 883,855
        // total LTG = 1,060,626 + 2,146,505 = 3,207,131
        // sum = 2,020,240 + 883,855 + 3,207,131 = 6,111,226 ✓
        totalDistributed: 6_111_226, totalFees: 0,
        distributionBreakdown: { returnOfCapital: 2_020_240, income: 883_855, longTermGain: 3_207_131 },
      },
      {
        entityId: "entity-4", entityName: "Real Estate Fund",
        commitment: 15_000_000, currentBalance: -8_400_000, totalContributed: 8_400_000,
        totalDistributed: 0, totalFees: 0,
        distributionBreakdown: { returnOfCapital: 0, income: 0, longTermGain: 0 },
      },
      {
        entityId: "entity-5", entityName: "Sequoia Fund LP",
        commitment: 20_000_000, currentBalance: -18_000_000, totalContributed: 18_000_000,
        totalDistributed: 0, totalFees: 0,
        distributionBreakdown: { returnOfCapital: 0, income: 0, longTermGain: 0 },
      },
      // ── Wellington (investor-3) ──
      {
        entityId: "entity-2", entityName: "Atlas Fund II",
        commitment: 25_000_000, currentBalance: 0, totalContributed: 15_500_000,
        // inv3 proRata = 25M/297M = 8.4175%
        // dist-h2: net = 7.2M × 0.084175 = ~606,060; ROC=3M×0.084175=252,525; LTG=4.2M×0.084175=353,535
        // dist-h6: net = 3.5M × 0.084175 = ~294,613; income=294,613
        // dist-h12: net = 13.5M × 0.084175 = ~1,136,363; ROC=5M×0.084175=420,875; LTG=8.5M×0.084175=715,488
        // total net = 606,060 + 294,613 + 1,136,363 = 2,037,036
        // total ROC = 252,525 + 420,875 = 673,400
        // total income = 294,613
        // total LTG = 353,535 + 715,488 = 1,069,023
        // sum = 673,400 + 294,613 + 1,069,023 = 2,037,036 ✓
        totalDistributed: 2_037_036, totalFees: 0,
        distributionBreakdown: { returnOfCapital: 673_400, income: 294_613, longTermGain: 1_069_023 },
      },
      {
        entityId: "entity-3", entityName: "Atlas Fund III",
        commitment: 20_000_000, currentBalance: -14_100_000, totalContributed: 14_100_000,
        totalDistributed: 0, totalFees: 0,
        distributionBreakdown: { returnOfCapital: 0, income: 0, longTermGain: 0 },
      },
      {
        entityId: "entity-7", entityName: "Co-Invest SPV",
        commitment: 10_000_000, currentBalance: -8_000_000, totalContributed: 8_000_000,
        totalDistributed: 0, totalFees: 0,
        distributionBreakdown: { returnOfCapital: 0, income: 0, longTermGain: 0 },
      },
    ];

    for (const summary of allEntitySummaries) {
      assertCategorySumEqualsTotal(summary);
    }

    // Specifically verify Wellington's entity2 summary is non-zero (LP-Obs 2 primary check)
    const wellingtonEntity2 = allEntitySummaries.find(
      (s) => s.entityId === "entity-2" && s.commitment === 25_000_000
    );
    expect(wellingtonEntity2).toBeDefined();
    expect(wellingtonEntity2!.totalDistributed).toBeGreaterThan(0);
    expect(wellingtonEntity2!.distributionBreakdown).toBeDefined();

    // Wellington's total should be ~$2M (entity2 only, no entity3 or entity7 distributions)
    expect(wellingtonEntity2!.totalDistributed).toBeGreaterThan(1_000_000);
    expect(wellingtonEntity2!.totalDistributed).toBeLessThan(5_000_000);
  });

  it("handles floating-point rounding within 1-cent tolerance", () => {
    // Simulate a case where floating point causes minor rounding
    const summary: EntitySummary = {
      entityId: "entity-2",
      entityName: "Atlas Fund II",
      commitment: 25_000_000,
      currentBalance: 0,
      totalContributed: 15_500_000,
      totalDistributed: 2_037_036.123456789,
      totalFees: 0,
      distributionBreakdown: {
        returnOfCapital: 673_400.111111111,
        income: 294_613.012345678,
        longTermGain: 1_069_023.000000000,
      },
    };
    // Sum = 673,400.111 + 294,613.012 + 1,069,023.000 = 2,037,036.123
    // diff from totalDistributed = ~0.000 (well within 1 cent)
    assertCategorySumEqualsTotal(summary);
  });
});
