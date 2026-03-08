import { describe, it, expect } from "vitest";
import { computeMetrics, computeMOIC } from "../metrics";

// ─── FIN-04: TVPI / DPI / RVPI ──────────────────────────────────────────────

describe("computeMetrics — TVPI/DPI/RVPI computation (FIN-04)", () => {
  // TVPI = (distributed + NAV) / paidIn
  it("computes TVPI as (distributed + NAV) / paidIn", () => {
    const result = computeMetrics(1_000_000, 400_000, 800_000);
    // (400K + 800K) / 1000K = 1.2
    expect(result.tvpi).toBeCloseTo(1.2, 4);
  });

  // DPI = distributed / paidIn
  it("computes DPI as distributed / paidIn", () => {
    const result = computeMetrics(1_000_000, 400_000, 800_000);
    // 400K / 1000K = 0.4
    expect(result.dpi).toBeCloseTo(0.4, 4);
  });

  // RVPI = NAV / paidIn
  it("computes RVPI as currentNAV / paidIn", () => {
    const result = computeMetrics(1_000_000, 400_000, 800_000);
    // 800K / 1000K = 0.8
    expect(result.rvpi).toBeCloseTo(0.8, 4);
  });

  // Identity: TVPI = DPI + RVPI
  it("satisfies the TVPI = DPI + RVPI identity", () => {
    const result = computeMetrics(2_000_000, 500_000, 1_200_000);
    // (500K + 1200K) / 2000K = 0.85
    expect(result.tvpi).not.toBeNull();
    expect(result.dpi).not.toBeNull();
    expect(result.rvpi).not.toBeNull();
    expect(result.tvpi!).toBeCloseTo(result.dpi! + result.rvpi!, 6);
  });

  // Zero paidIn (no capital called yet) => all three must be null, not crash
  it("returns null for TVPI, DPI, and RVPI when paidIn is zero", () => {
    const result = computeMetrics(0, 0, 500_000);
    expect(result.tvpi).toBeNull();
    expect(result.dpi).toBeNull();
    expect(result.rvpi).toBeNull();
  });

  // Distributions only (NAV has gone to zero on full exit)
  it("computes DPI > 1 when total distributions exceed paidIn (profitable full exit)", () => {
    const result = computeMetrics(1_000_000, 2_500_000, 0);
    // DPI = 2500K / 1000K = 2.5
    expect(result.dpi).toBeCloseTo(2.5, 4);
    // RVPI = 0 / 1000K = 0
    expect(result.rvpi).toBeCloseTo(0, 4);
    // TVPI = 2500K / 1000K = 2.5
    expect(result.tvpi).toBeCloseTo(2.5, 4);
  });

  // No distributions yet (early-stage fund — DPI should be 0, not null)
  it("returns DPI of 0 when no distributions have been paid", () => {
    const result = computeMetrics(1_000_000, 0, 1_200_000);
    expect(result.dpi).toBeCloseTo(0, 4);
  });
});

// ─── FIN-05: MOIC computation ───────────────────────────────────────────────

describe("computeMetrics — MOIC computation via costBasis and fairValue (FIN-05)", () => {
  // MOIC = fairValue / costBasis
  it("computes MOIC as fairValue / costBasis when both are provided", () => {
    const result = computeMetrics(1_000_000, 400_000, 800_000, 500_000, 1_250_000);
    // 1250K / 500K = 2.5
    expect(result.moic).toBeCloseTo(2.5, 4);
  });

  it("returns null MOIC when costBasis is not provided", () => {
    const result = computeMetrics(1_000_000, 400_000, 800_000);
    expect(result.moic).toBeNull();
  });

  it("returns null MOIC when costBasis is zero (avoid divide-by-zero)", () => {
    const result = computeMetrics(1_000_000, 400_000, 800_000, 0, 500_000);
    expect(result.moic).toBeNull();
  });

  it("returns null MOIC when costBasis is null", () => {
    const result = computeMetrics(1_000_000, 400_000, 800_000, null, 500_000);
    expect(result.moic).toBeNull();
  });

  it("returns null MOIC when fairValue is null", () => {
    const result = computeMetrics(1_000_000, 400_000, 800_000, 500_000, null);
    expect(result.moic).toBeNull();
  });

  it("computes MOIC of 1.0 when fairValue equals costBasis (no gain, no loss)", () => {
    const result = computeMetrics(1_000_000, 0, 1_000_000, 800_000, 800_000);
    expect(result.moic).toBeCloseTo(1.0, 4);
  });

  it("computes MOIC less than 1.0 when fairValue is below costBasis (loss scenario)", () => {
    const result = computeMetrics(1_000_000, 0, 400_000, 1_000_000, 600_000);
    // 600K / 1000K = 0.6
    expect(result.moic).toBeCloseTo(0.6, 4);
  });
});

// ─── computeMOIC — standalone helper ────────────────────────────────────────

describe("computeMOIC — standalone MOIC helper (FIN-05)", () => {
  it("computes MOIC as fairValue / costBasis", () => {
    expect(computeMOIC(500_000, 1_500_000)).toBeCloseTo(3.0, 4);
  });

  it("returns null when costBasis is zero", () => {
    expect(computeMOIC(0, 500_000)).toBeNull();
  });

  it("returns null when costBasis is negative", () => {
    expect(computeMOIC(-100_000, 500_000)).toBeNull();
  });

  it("computes MOIC of 1.0 for break-even scenario", () => {
    expect(computeMOIC(250_000, 250_000)).toBeCloseTo(1.0, 4);
  });
});
