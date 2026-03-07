import { describe, it, expect } from "vitest";
import { computeWaterfall, type WaterfallTierInput, type WaterfallConfig } from "./waterfall";

// Standard 4-tier European waterfall configuration
function buildStandardTiers(): WaterfallTierInput[] {
  return [
    {
      tierOrder: 1,
      name: "Return of Capital",
      splitLP: 100,
      splitGP: 0,
      hurdleRate: null,
      appliesTo: "Capital",
    },
    {
      tierOrder: 2,
      name: "Preferred Return",
      splitLP: 100,
      splitGP: 0,
      hurdleRate: 8,
      appliesTo: null,
    },
    {
      tierOrder: 3,
      name: "GP Catch-Up",
      splitLP: 0,
      splitGP: 100,
      hurdleRate: null,
      appliesTo: null,
    },
    {
      tierOrder: 4,
      name: "Carried Interest",
      splitLP: 80,
      splitGP: 20,
      hurdleRate: null,
      appliesTo: null,
    },
  ];
}

describe("computeWaterfall — waterfall distribution engine", () => {
  // ─── Standard 4-tier European waterfall ──────────────────────────────────
  // $10M distributable, $8M contributed, 8% hurdle, 2 years outstanding
  describe("standard 4-tier European waterfall ($10M distributable, $8M contributed, 2yr)", () => {
    let result: ReturnType<typeof computeWaterfall>;

    result = computeWaterfall(
      buildStandardTiers(),
      10_000_000, // distributableAmount
      8_000_000,  // totalContributed
      0,          // totalDistributedPrior
      2,          // yearsOutstanding
    );

    it("Tier 1 (Return of Capital) allocates $8M to LP, $0 to GP", () => {
      const tier1 = result.tiers.find((t) => t.tierOrder === 1)!;
      expect(tier1.allocatedLP).toBeCloseTo(8_000_000, 0);
      expect(tier1.allocatedGP).toBeCloseTo(0, 0);
      expect(tier1.totalAllocated).toBeCloseTo(8_000_000, 0);
    });

    it("Tier 2 (Preferred Return) allocates $1.28M to LP (8% * $8M * 2yr)", () => {
      const tier2 = result.tiers.find((t) => t.tierOrder === 2)!;
      // $8M * 0.08 * 2 = $1,280,000
      expect(tier2.allocatedLP).toBeCloseTo(1_280_000, 0);
      expect(tier2.allocatedGP).toBeCloseTo(0, 0);
    });

    it("Tier 3 (GP Catch-Up) captures remaining after ROC and Pref", () => {
      const tier3 = result.tiers.find((t) => t.tierOrder === 3)!;
      // Remaining after Tier 1 + 2 = $10M - $8M - $1.28M = $720,000
      // GP catch-up limited to remaining = $720,000
      expect(tier3.allocatedGP).toBeCloseTo(720_000, 0);
      expect(tier3.allocatedLP).toBeCloseTo(0, 0);
    });

    it("Tier 4 (Carried Interest) receives nothing (exhausted by catch-up)", () => {
      const tier4 = result.tiers.find((t) => t.tierOrder === 4)!;
      expect(tier4.totalAllocated).toBeCloseTo(0, 0);
    });

    it("totalLP + totalGP equals distributableAmount (no money created or lost)", () => {
      expect(result.totalLP + result.totalGP).toBeCloseTo(result.distributableAmount, 0);
    });

    it("totalLP is approximately $9.28M", () => {
      // ROC ($8M) + Pref ($1.28M) = $9.28M
      expect(result.totalLP).toBeCloseTo(9_280_000, 0);
    });

    it("totalGP is approximately $720K", () => {
      // Catch-up from remaining $720K
      expect(result.totalGP).toBeCloseTo(720_000, 0);
    });
  });

  // ─── Configurable carry % ────────────────────────────────────────────────
  describe("configurable carry % (30% carry)", () => {
    it("30% carry gives GP 30% of profits, not 20%", () => {
      // $20M distributable, $5M contributed, 2yr
      // After ROC ($5M) + Pref ($800K) = $5.8M, remaining = $14.2M
      // With 30% carry: GP catch-up = 30% of total profits
      // Total profits = distributable - ROC = $20M - $5M = $15M
      // GP target = $15M * 0.30 = $4.5M; but we already need to check against what LP got in pref
      const result = computeWaterfall(
        buildStandardTiers(),
        20_000_000,
        5_000_000,
        0,
        2,
        { carryPercent: 0.30 }
      );

      // totalLP + totalGP must equal distributableAmount
      expect(result.totalLP + result.totalGP).toBeCloseTo(20_000_000, 0);

      // GP should get more than with 20% carry
      const result20 = computeWaterfall(buildStandardTiers(), 20_000_000, 5_000_000, 0, 2);
      expect(result.totalGP).toBeGreaterThan(result20.totalGP);
    });

    it("backward compatibility: no config defaults to 20% carry", () => {
      const result = computeWaterfall(buildStandardTiers(), 20_000_000, 5_000_000, 0, 2);
      const resultExplicit = computeWaterfall(buildStandardTiers(), 20_000_000, 5_000_000, 0, 2, { carryPercent: 0.20 });
      expect(result.totalGP).toBeCloseTo(resultExplicit.totalGP, 0);
    });
  });

  // ─── Simple vs compound preferred return ─────────────────────────────────
  describe("preferred return: simple vs compound", () => {
    it("simple pref: 8% * contributed * years = pref amount", () => {
      const result = computeWaterfall(
        buildStandardTiers(),
        20_000_000,
        8_000_000,
        0,
        3,
        { prefReturnCompounding: "SIMPLE" }
      );
      const tier2 = result.tiers.find((t) => t.tierOrder === 2)!;
      // $8M * 0.08 * 3 = $1,920,000
      expect(tier2.allocatedLP).toBeCloseTo(1_920_000, 0);
    });

    it("compound pref: contributed * (1.08^years - 1) = pref amount", () => {
      const result = computeWaterfall(
        buildStandardTiers(),
        20_000_000,
        8_000_000,
        0,
        3,
        { prefReturnCompounding: "COMPOUND" }
      );
      const tier2 = result.tiers.find((t) => t.tierOrder === 2)!;
      // $8M * (1.08^3 - 1) = $8M * 0.259712 = ~$2,077,696
      expect(tier2.allocatedLP).toBeCloseTo(8_000_000 * (Math.pow(1.08, 3) - 1), 0);
    });

    it("compound pref is greater than simple pref for the same period", () => {
      const simple = computeWaterfall(buildStandardTiers(), 20_000_000, 8_000_000, 0, 3, { prefReturnCompounding: "SIMPLE" });
      const compound = computeWaterfall(buildStandardTiers(), 20_000_000, 8_000_000, 0, 3, { prefReturnCompounding: "COMPOUND" });
      const tier2Simple = simple.tiers.find((t) => t.tierOrder === 2)!;
      const tier2Compound = compound.tiers.find((t) => t.tierOrder === 2)!;
      expect(tier2Compound.allocatedLP).toBeGreaterThan(tier2Simple.allocatedLP);
    });

    it("totalLP + totalGP invariant holds with compound pref", () => {
      const result = computeWaterfall(buildStandardTiers(), 20_000_000, 8_000_000, 0, 3, { prefReturnCompounding: "COMPOUND" });
      expect(result.totalLP + result.totalGP).toBeCloseTo(20_000_000, 0);
    });
  });

  // ─── Pref offset by prior distributions ──────────────────────────────────
  describe("pref return offset by prior distributions", () => {
    it("prior distributions reduce required pref amount", () => {
      // $5M already distributed, 8% * $8M * 2yr = $1.28M pref needed
      // But with $5M prior, the pref is fully satisfied already
      const result = computeWaterfall(
        buildStandardTiers(),
        20_000_000,
        8_000_000,
        5_000_000,  // totalDistributedPrior
        2,
        { prefReturnOffsetByDistributions: true }
      );
      const tier2 = result.tiers.find((t) => t.tierOrder === 2)!;
      // Pref = $1.28M, but prior dists ($5M) already exceed it → $0 pref needed
      expect(tier2.allocatedLP).toBeCloseTo(0, 0);
    });

    it("partial offset: partially reduces required pref amount", () => {
      // Pref = $1.28M, prior dist = $0.5M → remaining pref = $0.78M
      const result = computeWaterfall(
        buildStandardTiers(),
        20_000_000,
        8_000_000,
        500_000,    // totalDistributedPrior
        2,
        { prefReturnOffsetByDistributions: true }
      );
      const tier2 = result.tiers.find((t) => t.tierOrder === 2)!;
      // Remaining pref = $1.28M - $0.5M = $0.78M
      expect(tier2.allocatedLP).toBeCloseTo(780_000, 0);
    });

    it("no offset when prefReturnOffsetByDistributions is false (default)", () => {
      const result = computeWaterfall(
        buildStandardTiers(),
        20_000_000,
        8_000_000,
        5_000_000,
        2
      );
      const tier2 = result.tiers.find((t) => t.tierOrder === 2)!;
      // Without offset, pref = $8M * 0.08 * 2 = $1.28M (prior dists don't reduce it)
      expect(tier2.allocatedLP).toBeCloseTo(1_280_000, 0);
    });

    it("invariant holds with pref offset", () => {
      const result = computeWaterfall(buildStandardTiers(), 20_000_000, 8_000_000, 500_000, 2, { prefReturnOffsetByDistributions: true });
      expect(result.totalLP + result.totalGP).toBeCloseTo(20_000_000, 0);
    });
  });

  // ─── GP Co-invest ─────────────────────────────────────────────────────────
  describe("GP co-invest", () => {
    it("GP co-invest: GP gets LP treatment for ROC + pref on co-invest portion", () => {
      // GP has 10% co-invest: out of $10M LP allocation, GP gets 10% treated as LP
      const result = computeWaterfall(
        buildStandardTiers(),
        20_000_000,
        8_000_000,
        0,
        2,
        { gpCoInvestPercent: 0.10 }
      );
      // gpCoInvestAllocation should be set
      expect(result.gpCoInvestAllocation).toBeGreaterThan(0);
      // totalLP + totalGP invariant must hold
      expect(result.totalLP + result.totalGP).toBeCloseTo(20_000_000, 0);
    });

    it("no GP co-invest when gpCoInvestPercent is not set", () => {
      const result = computeWaterfall(buildStandardTiers(), 20_000_000, 8_000_000, 0, 2);
      expect(result.gpCoInvestAllocation).toBe(0);
    });
  });

  // ─── Clawback liability ────────────────────────────────────────────────────
  describe("clawback liability", () => {
    it("clawbackLiability is present in result (may be 0)", () => {
      const result = computeWaterfall(buildStandardTiers(), 10_000_000, 8_000_000, 0, 2);
      expect(typeof result.clawbackLiability).toBe("number");
      expect(result.clawbackLiability).toBeGreaterThanOrEqual(0);
    });

    it("zero clawback when GP has not received more than entitled", () => {
      // Normal waterfall — GP gets exactly what they're entitled to
      const result = computeWaterfall(buildStandardTiers(), 10_000_000, 8_000_000, 0, 2);
      expect(result.clawbackLiability).toBeCloseTo(0, 0);
    });
  });

  // ─── Per-investor breakdown ───────────────────────────────────────────────
  describe("per-investor breakdown", () => {
    it("per-investor breakdown allocates proportionally to pro-rata shares", () => {
      const investorShares = [
        { investorId: "inv-1", investorName: "Investor A", proRataShare: 0.6 },
        { investorId: "inv-2", investorName: "Investor B", proRataShare: 0.4 },
      ];
      const result = computeWaterfall(
        buildStandardTiers(),
        10_000_000,
        8_000_000,
        0,
        2,
        {},
        investorShares
      );
      expect(result.perInvestorBreakdown).toBeDefined();
      expect(result.perInvestorBreakdown).toHaveLength(2);
      const inv1 = result.perInvestorBreakdown!.find((b) => b.investorId === "inv-1")!;
      const inv2 = result.perInvestorBreakdown!.find((b) => b.investorId === "inv-2")!;
      // Inv1 gets 60% of LP allocation, Inv2 gets 40%
      expect(inv1.lpAllocation).toBeCloseTo(result.totalLP * 0.6, 0);
      expect(inv2.lpAllocation).toBeCloseTo(result.totalLP * 0.4, 0);
    });

    it("no per-investor breakdown when no investor shares provided", () => {
      const result = computeWaterfall(buildStandardTiers(), 10_000_000, 8_000_000, 0, 2);
      expect(result.perInvestorBreakdown).toBeUndefined();
    });
  });

  // ─── Underfunded scenario ─────────────────────────────────────────────────
  // $5M distributable but $8M contributed — only partial ROC, nothing to later tiers
  describe("underfunded scenario ($5M distributable, $8M contributed)", () => {
    it("all proceeds go to ROC, nothing reaches later tiers", () => {
      const result = computeWaterfall(
        buildStandardTiers(),
        5_000_000,  // distributableAmount
        8_000_000,  // totalContributed
        0,          // totalDistributedPrior
        2,          // yearsOutstanding
      );

      const tier1 = result.tiers.find((t) => t.tierOrder === 1)!;
      expect(tier1.allocatedLP).toBeCloseTo(5_000_000, 0);

      const tier2 = result.tiers.find((t) => t.tierOrder === 2)!;
      expect(tier2.totalAllocated).toBeCloseTo(0, 0);

      const tier3 = result.tiers.find((t) => t.tierOrder === 3)!;
      expect(tier3.totalAllocated).toBeCloseTo(0, 0);

      const tier4 = result.tiers.find((t) => t.tierOrder === 4)!;
      expect(tier4.totalAllocated).toBeCloseTo(0, 0);

      // totalLP + totalGP must still equal distributableAmount
      expect(result.totalLP + result.totalGP).toBeCloseTo(5_000_000, 0);
    });
  });

  // ─── No tiers ─────────────────────────────────────────────────────────────
  it("returns zero allocations when no tiers are defined", () => {
    const result = computeWaterfall([], 10_000_000, 8_000_000);
    expect(result.totalLP).toBe(0);
    expect(result.totalGP).toBe(0);
    expect(result.tiers).toHaveLength(0);
  });

  // ─── Large surplus scenario ───────────────────────────────────────────────
  // $20M distributable, $5M contributed — large surplus flows through all tiers
  describe("large surplus scenario ($20M distributable, $5M contributed, 2yr)", () => {
    it("flows through all tiers when surplus is large", () => {
      const result = computeWaterfall(
        buildStandardTiers(),
        20_000_000, // distributableAmount
        5_000_000,  // totalContributed
        0,          // totalDistributedPrior
        2,          // yearsOutstanding
      );

      // Tier 1: ROC = $5M (all contributed capital)
      const tier1 = result.tiers.find((t) => t.tierOrder === 1)!;
      expect(tier1.allocatedLP).toBeCloseTo(5_000_000, 0);

      // Tier 2: Pref = $5M * 0.08 * 2 = $800K
      const tier2 = result.tiers.find((t) => t.tierOrder === 2)!;
      expect(tier2.allocatedLP).toBeCloseTo(800_000, 0);

      // Tier 4 (after catch-up) should also have allocation since there's surplus
      const tier4 = result.tiers.find((t) => t.tierOrder === 4)!;
      expect(tier4.totalAllocated).toBeGreaterThan(0);

      // totalLP + totalGP must equal distributableAmount
      expect(result.totalLP + result.totalGP).toBeCloseTo(20_000_000, 0);
    });

    it("totalLP + totalGP always equals distributableAmount in large surplus", () => {
      const result = computeWaterfall(
        buildStandardTiers(),
        20_000_000,
        5_000_000,
        0,
        2,
      );
      expect(result.totalLP + result.totalGP).toBeCloseTo(result.distributableAmount, 0);
    });
  });

  // ─── Zero distributable ───────────────────────────────────────────────────
  it("returns zero allocations when distributableAmount is zero", () => {
    const result = computeWaterfall(buildStandardTiers(), 0, 8_000_000);
    expect(result.totalLP).toBe(0);
    expect(result.totalGP).toBe(0);
    result.tiers.forEach((t) => {
      expect(t.totalAllocated).toBe(0);
    });
  });

  // ─── Simple 2-tier: 80/20 split with no hurdle ──────────────────────────
  it("splits correctly on a simple 2-tier 80/20 structure", () => {
    const tiers: WaterfallTierInput[] = [
      { tierOrder: 1, name: "Return of Capital", splitLP: 100, splitGP: 0, appliesTo: "Capital" },
      { tierOrder: 2, name: "Profit Split",      splitLP: 80,  splitGP: 20, appliesTo: null },
    ];
    // $10M distributable, $6M contributed
    const result = computeWaterfall(tiers, 10_000_000, 6_000_000, 0, 1);

    const tier1 = result.tiers.find((t) => t.tierOrder === 1)!;
    expect(tier1.allocatedLP).toBeCloseTo(6_000_000, 0);

    const tier2 = result.tiers.find((t) => t.tierOrder === 2)!;
    const surplus = 10_000_000 - 6_000_000; // $4M
    expect(tier2.allocatedLP).toBeCloseTo(surplus * 0.80, 0);
    expect(tier2.allocatedGP).toBeCloseTo(surplus * 0.20, 0);

    expect(result.totalLP + result.totalGP).toBeCloseTo(10_000_000, 0);
  });
});
