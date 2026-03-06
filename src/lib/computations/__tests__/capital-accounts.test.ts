import { describe, it, expect } from "vitest";
import { computeCapitalAccount, proRataShare } from "../capital-accounts";

describe("computeCapitalAccount — capital account roll-forward", () => {
  // ─── Basic roll-forward ──────────────────────────────────────────────────
  // beginning 100K + contributions 50K + income 10K + gains 20K
  //   - distributions 30K - fees 5K = ending 145K
  it("produces correct ending balance for a standard period", () => {
    const result = computeCapitalAccount(
      100_000, // beginningBalance
       50_000, // contributions
       10_000, // incomeAllocations
       20_000, // capitalAllocations
       30_000, // distributions
        5_000, // fees
    );
    expect(result.endingBalance).toBeCloseTo(145_000, 2);
  });

  it("returns correct component values in result object", () => {
    const result = computeCapitalAccount(100_000, 50_000, 10_000, 20_000, 30_000, 5_000);
    expect(result.beginningBalance).toBe(100_000);
    expect(result.contributions).toBe(50_000);
    expect(result.incomeAllocations).toBe(10_000);
    expect(result.capitalAllocations).toBe(20_000);
    expect(result.distributions).toBe(30_000);  // stored as absolute value
    expect(result.fees).toBe(5_000);            // stored as absolute value
  });

  // ─── Zero beginning balance ──────────────────────────────────────────────
  it("handles zero beginning balance with only contributions", () => {
    const result = computeCapitalAccount(0, 500_000, 0, 0, 0, 0);
    expect(result.endingBalance).toBeCloseTo(500_000, 2);
  });

  // ─── Negative inputs for distributions and fees ──────────────────────────
  it("converts negative distributions to absolute values (Math.abs)", () => {
    // passing -30K as distributions should be same as +30K
    const resultPositive = computeCapitalAccount(100_000, 0, 0, 0,  30_000, 0);
    const resultNegative = computeCapitalAccount(100_000, 0, 0, 0, -30_000, 0);
    expect(resultPositive.endingBalance).toBeCloseTo(resultNegative.endingBalance, 2);
    expect(resultNegative.endingBalance).toBeCloseTo(70_000, 2);
  });

  it("converts negative fees to absolute values (Math.abs)", () => {
    const resultPositive = computeCapitalAccount(100_000, 0, 0, 0, 0,  5_000);
    const resultNegative = computeCapitalAccount(100_000, 0, 0, 0, 0, -5_000);
    expect(resultPositive.endingBalance).toBeCloseTo(resultNegative.endingBalance, 2);
    expect(resultNegative.endingBalance).toBeCloseTo(95_000, 2);
  });

  it("stores distributions as absolute value in result", () => {
    const result = computeCapitalAccount(100_000, 0, 0, 0, -30_000, 0);
    expect(result.distributions).toBe(30_000); // Math.abs applied
  });

  it("stores fees as absolute value in result", () => {
    const result = computeCapitalAccount(100_000, 0, 0, 0, 0, -5_000);
    expect(result.fees).toBe(5_000); // Math.abs applied
  });

  // ─── All-zero scenario ────────────────────────────────────────────────────
  it("returns zero ending balance when all inputs are zero", () => {
    const result = computeCapitalAccount(0, 0, 0, 0, 0, 0);
    expect(result.endingBalance).toBe(0);
  });

  // ─── Income and capital gains ─────────────────────────────────────────────
  it("income and capital allocations add to ending balance", () => {
    const result = computeCapitalAccount(100_000, 0, 25_000, 40_000, 0, 0);
    expect(result.endingBalance).toBeCloseTo(165_000, 2);
  });

  // ─── Fund lifecycle: full period ──────────────────────────────────────────
  it("computes correct balance over a realistic LP capital account period", () => {
    // Q1 capital account for LP with $1M commitment
    // Beginning: $800K
    // Capital call in Q1: $50K
    // Pro-rata income allocation: $15K
    // Pro-rata unrealized gain: $30K
    // Distribution: $20K
    // Management fee: $2.5K
    const result = computeCapitalAccount(
      800_000,  // beginningBalance
       50_000,  // contributions (capital call)
       15_000,  // incomeAllocations
       30_000,  // capitalAllocations (unrealized gains)
       20_000,  // distributions
        2_500,  // fees (management fee)
    );
    // 800K + 50K + 15K + 30K - 20K - 2.5K = 872.5K
    expect(result.endingBalance).toBeCloseTo(872_500, 2);
  });
});

describe("proRataShare — pro-rata share calculation", () => {
  it("returns 0.25 for $250K commitment in a $1M entity", () => {
    expect(proRataShare(250_000, 1_000_000)).toBeCloseTo(0.25, 4);
  });

  it("returns 0.30 for $300K commitment in a $1M entity", () => {
    expect(proRataShare(300_000, 1_000_000)).toBeCloseTo(0.30, 4);
  });

  it("returns 1.0 when investor IS the entire entity", () => {
    expect(proRataShare(500_000, 500_000)).toBeCloseTo(1.0, 4);
  });

  it("returns 0 when total entity commitments are zero (no division by zero)", () => {
    expect(proRataShare(100_000, 0)).toBe(0);
  });

  it("returns 0 when investor commitment is zero", () => {
    expect(proRataShare(0, 1_000_000)).toBeCloseTo(0, 4);
  });

  it("returns correct share for small fractional commitments", () => {
    // $50K of $2.5M = 2%
    expect(proRataShare(50_000, 2_500_000)).toBeCloseTo(0.02, 4);
  });
});
