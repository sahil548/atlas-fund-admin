import { describe, it, expect } from "vitest";
import {
  computeManagementFee,
  computeCarriedInterest,
  calculateFees,
  type FeeConfig,
  type FeeInputs,
} from "./fee-engine";

const baseInputs: FeeInputs = {
  totalCommitments: 10_000_000,
  totalCalled: 7_500_000,
  entityNAV: 8_000_000,
  fundExpenses: 50_000,
  waterfallGPAllocation: 500_000,
};

describe("computeManagementFee", () => {
  it("management fee on committed capital: commitment * rate * periodFraction", () => {
    const config: FeeConfig = {
      managementFeeRate: 0.02,
      feeBasis: "COMMITTED_CAPITAL",
      periodFraction: 1,  // annual
    };
    // $10M * 2% * 1yr = $200,000
    expect(computeManagementFee(config, baseInputs)).toBeCloseTo(200_000, 0);
  });

  it("management fee on invested capital: calledAmount * rate * periodFraction", () => {
    const config: FeeConfig = {
      managementFeeRate: 0.02,
      feeBasis: "INVESTED_CAPITAL",
      periodFraction: 1,
    };
    // $7.5M * 2% * 1yr = $150,000
    expect(computeManagementFee(config, baseInputs)).toBeCloseTo(150_000, 0);
  });

  it("management fee on NAV basis: entityNAV * rate * periodFraction", () => {
    const config: FeeConfig = {
      managementFeeRate: 0.02,
      feeBasis: "NAV",
      periodFraction: 1,
    };
    // $8M * 2% * 1yr = $160,000
    expect(computeManagementFee(config, baseInputs)).toBeCloseTo(160_000, 0);
  });

  it("quarterly fee (periodFraction=0.25) on committed capital", () => {
    const config: FeeConfig = {
      managementFeeRate: 0.02,
      feeBasis: "COMMITTED_CAPITAL",
      periodFraction: 0.25,
    };
    // $10M * 2% * 0.25 = $50,000
    expect(computeManagementFee(config, baseInputs)).toBeCloseTo(50_000, 0);
  });

  it("zero commitment returns zero fee on committed capital basis", () => {
    const config: FeeConfig = {
      managementFeeRate: 0.02,
      feeBasis: "COMMITTED_CAPITAL",
      periodFraction: 1,
    };
    const zeroInputs: FeeInputs = { ...baseInputs, totalCommitments: 0 };
    expect(computeManagementFee(config, zeroInputs)).toBe(0);
  });

  it("zero called amount returns zero fee on invested capital basis", () => {
    const config: FeeConfig = {
      managementFeeRate: 0.02,
      feeBasis: "INVESTED_CAPITAL",
      periodFraction: 1,
    };
    const zeroInputs: FeeInputs = { ...baseInputs, totalCalled: 0 };
    expect(computeManagementFee(config, zeroInputs)).toBe(0);
  });
});

describe("computeCarriedInterest", () => {
  it("returns the GP allocation from waterfall results", () => {
    expect(computeCarriedInterest(500_000)).toBe(500_000);
  });

  it("returns zero when GP allocation is zero", () => {
    expect(computeCarriedInterest(0)).toBe(0);
  });
});

describe("calculateFees", () => {
  it("returns FeeResult with managementFee, fundExpenses, carriedInterest, totalFees", () => {
    const config: FeeConfig = {
      managementFeeRate: 0.02,
      feeBasis: "COMMITTED_CAPITAL",
      periodFraction: 1,
    };
    const result = calculateFees(config, baseInputs);
    expect(result.managementFee).toBeCloseTo(200_000, 0);
    expect(result.fundExpenses).toBe(50_000);
    expect(result.carriedInterest).toBe(500_000);
    expect(result.totalFees).toBeCloseTo(200_000 + 50_000 + 500_000, 0);
  });

  it("feeBreakdown contains feeBasis, basisAmount, rate, periodFraction", () => {
    const config: FeeConfig = {
      managementFeeRate: 0.02,
      feeBasis: "NAV",
      periodFraction: 0.25,
    };
    const result = calculateFees(config, baseInputs);
    expect(result.feeBreakdown.feeBasis).toBe("NAV");
    expect(result.feeBreakdown.basisAmount).toBe(8_000_000);
    expect(result.feeBreakdown.rate).toBe(0.02);
    expect(result.feeBreakdown.periodFraction).toBe(0.25);
  });

  it("totalFees = managementFee + fundExpenses + carriedInterest", () => {
    const config: FeeConfig = {
      managementFeeRate: 0.015,
      feeBasis: "INVESTED_CAPITAL",
      periodFraction: 0.5,
    };
    const result = calculateFees(config, baseInputs);
    expect(result.totalFees).toBeCloseTo(
      result.managementFee + result.fundExpenses + result.carriedInterest,
      2
    );
  });
});
