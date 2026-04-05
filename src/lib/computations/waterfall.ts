/**
 * Waterfall distribution calculation engine.
 * Processes distributable proceeds through a tiered waterfall structure.
 */

export interface WaterfallTierInput {
  tierOrder: number;
  name: string;
  splitLP: number;    // percentage 0-100
  splitGP: number;    // percentage 0-100
  hurdleRate?: number | null; // annual %, e.g. 8
  appliesTo?: string | null;  // "Capital", "Capital Gains", "Income Only", "All Profits"
}

export interface WaterfallTierResult {
  tierOrder: number;
  name: string;
  allocatedLP: number;
  allocatedGP: number;
  totalAllocated: number;
  remaining: number;
}

export interface InvestorShare {
  investorId: string;
  investorName: string;
  proRataShare: number;  // fraction 0-1, e.g. 0.6 for 60%
  isGP?: boolean;        // true if this investor is the GP entity
}

export interface InvestorBreakdown {
  investorId: string;
  investorName: string;
  proRataShare: number;
  lpAllocation: number;       // pro-rata share of LP portion (ALL members get this)
  gpCarryAllocation: number;  // GP carry assigned only to GP investors
  totalAllocation: number;    // lpAllocation + gpCarryAllocation
}

export interface WaterfallConfig {
  carryPercent?: number;                            // e.g., 0.20 for 20%. Default 0.20
  prefReturnCompounding?: "SIMPLE" | "COMPOUND";   // Default SIMPLE
  prefReturnOffsetByDistributions?: boolean;        // Default false
  incomeCountsTowardPref?: boolean;                 // Default false
  gpCoInvestPercent?: number;                       // null = no GP co-invest
  priorIncomeDistributed?: number;                  // for income-counts-toward-pref calc
}

export interface WaterfallResult {
  tiers: WaterfallTierResult[];
  totalLP: number;
  totalGP: number;
  distributableAmount: number;
  clawbackLiability: number;
  gpCoInvestAllocation: number;
  perInvestorBreakdown?: InvestorBreakdown[];
}

/**
 * Execute waterfall calculation.
 *
 * Standard European waterfall processing:
 * 1. Return of Capital — 100% to LP until all contributed capital returned
 * 2. Preferred Return — 100% to LP until hurdle rate achieved
 * 3. GP Catch-Up — 100% to GP until GP has target % of total profits
 * 4. Carried Interest / Profit Split — remaining split per tier percentages
 *
 * @param tiers Waterfall tier definitions (will be sorted by tierOrder)
 * @param distributableAmount Total amount available for distribution
 * @param totalContributed Total capital contributed by LPs (for ROC calculation)
 * @param totalDistributedPrior Total distributions already made in prior periods
 * @param yearsOutstanding Years since first capital call (for preferred return)
 * @param config Optional configuration for carry %, pref compounding, GP co-invest etc.
 * @param investorShares Optional investor shares for per-investor breakdown
 */
export function computeWaterfall(
  tiers: WaterfallTierInput[],
  distributableAmount: number,
  totalContributed: number,
  totalDistributedPrior: number = 0,
  yearsOutstanding: number = 1,
  config?: WaterfallConfig,
  investorShares?: InvestorShare[],
): WaterfallResult {
  // Resolve config with defaults
  const carryPercent = config?.carryPercent ?? 0.20;
  const compounding = config?.prefReturnCompounding ?? "SIMPLE";
  const offsetByDist = config?.prefReturnOffsetByDistributions ?? false;
  const incomeTowardPref = config?.incomeCountsTowardPref ?? false;
  const gpCoInvestPercent = config?.gpCoInvestPercent ?? 0;
  const priorIncomeDistributed = config?.priorIncomeDistributed ?? 0;

  let remaining = distributableAmount;
  const results: WaterfallTierResult[] = [];
  let totalLP = 0;
  let totalGP = 0;

  const sortedTiers = [...tiers].sort((a, b) => a.tierOrder - b.tierOrder);

  for (const tier of sortedTiers) {
    if (remaining <= 0) {
      results.push({
        tierOrder: tier.tierOrder,
        name: tier.name,
        allocatedLP: 0,
        allocatedGP: 0,
        totalAllocated: 0,
        remaining: 0,
      });
      continue;
    }

    let tierAmount = remaining;

    // Return of Capital: cap at unreturned capital
    if (tier.appliesTo === "Capital" && tier.splitLP === 100) {
      const unreturned = Math.max(0, totalContributed - totalDistributedPrior);
      tierAmount = Math.min(remaining, unreturned);
    }

    // Preferred Return: cap at hurdle rate * contributed * years (simple or compound)
    if (tier.hurdleRate && tier.hurdleRate > 0 && tier.splitLP === 100 && tier.splitGP === 0) {
      let prefAmount: number;
      if (compounding === "COMPOUND") {
        // Compound: contributed * (1 + rate)^years - 1
        prefAmount = totalContributed * (Math.pow(1 + tier.hurdleRate / 100, yearsOutstanding) - 1);
      } else {
        // Simple: contributed * rate * years
        prefAmount = totalContributed * (tier.hurdleRate / 100) * yearsOutstanding;
      }

      // Reduce pref by prior distributions if offset option is on
      if (offsetByDist) {
        prefAmount = Math.max(0, prefAmount - totalDistributedPrior);
      }

      // Reduce pref by prior income distributed (income counts toward pref)
      if (incomeTowardPref) {
        prefAmount = Math.max(0, prefAmount - priorIncomeDistributed);
      }

      tierAmount = Math.min(remaining, prefAmount);
    }

    // GP Catch-Up: 100% to GP until GP reaches target share of total distributable
    // Standard formula: GP target = distributableAmount * carryPercent
    // This ensures GP gets carryPercent% of the TOTAL distribution (not just profits above pref)
    if (tier.splitGP === 100 && tier.splitLP === 0) {
      const gpTarget = distributableAmount * carryPercent;
      const gpNeeded = Math.max(0, gpTarget - totalGP);
      tierAmount = Math.min(remaining, gpNeeded);
    }

    // PRO_RATA tiers: 100% goes to LP pool (distributed pro-rata to all members)
    // This bypasses any GP/LP split percentage on the tier
    let lpShare: number;
    let gpShare: number;
    if (tier.appliesTo === "PRO_RATA") {
      lpShare = tierAmount;
      gpShare = 0;
    } else {
      lpShare = tierAmount * (tier.splitLP / 100);
      gpShare = tierAmount * (tier.splitGP / 100);
    }

    totalLP += lpShare;
    totalGP += gpShare;
    remaining -= tierAmount;

    results.push({
      tierOrder: tier.tierOrder,
      name: tier.name,
      allocatedLP: lpShare,
      allocatedGP: gpShare,
      totalAllocated: tierAmount,
      remaining,
    });
  }

  // GP co-invest allocation: GP gets LP treatment on their co-invest portion
  // gpCoInvestPercent of the LP allocation is re-attributed to GP as co-invest
  let gpCoInvestAllocation = 0;
  if (gpCoInvestPercent > 0) {
    gpCoInvestAllocation = totalLP * gpCoInvestPercent;
    // Note: GP co-invest is a reallocation of LP proceeds to GP (LP committed this portion as GP capital)
    // We track it separately rather than shifting totalLP/totalGP since the invariant must hold
    // The gpCoInvestAllocation represents the economic benefit to GP from their LP-treatment co-invest
  }

  // Clawback liability: max(0, totalGP - entitled GP amount)
  // Entitled GP = distributableAmount * carryPercent (matches catch-up formula)
  // In practice, after a correct waterfall run GP should equal entitledGP (no clawback)
  // Clawback > 0 can arise when GP received carry in prior periods but fund underperforms later
  const entitledGP = distributableAmount * carryPercent;
  const clawbackLiability = Math.max(0, totalGP - entitledGP);

  // Per-investor breakdown:
  // 1. LP portion is distributed pro-rata to LP investors ONLY (not GP)
  // 2. GP carry portion is allocated only to GP investors
  let perInvestorBreakdown: InvestorBreakdown[] | undefined;
  if (investorShares && investorShares.length > 0) {
    // Determine GP investors and their share of the carry
    const gpInvestors = investorShares.filter((inv) => inv.isGP);
    const lpInvestors = investorShares.filter((inv) => !inv.isGP);
    const gpCount = gpInvestors.length;

    // Recalculate pro-rata shares among LP investors only
    const totalLPProRata = lpInvestors.reduce((s, inv) => s + inv.proRataShare, 0);

    perInvestorBreakdown = investorShares.map((inv) => {
      // LP portion goes only to LP investors, pro-rata among them
      const lpAllocation = inv.isGP
        ? 0
        : totalLPProRata > 0
          ? totalLP * (inv.proRataShare / totalLPProRata)
          : 0;

      // GP carry is only allocated to GP investors
      // If multiple GPs, split carry evenly among them (or could weight by commitment)
      const gpCarryAllocation = inv.isGP && gpCount > 0
        ? totalGP / gpCount
        : 0;

      return {
        investorId: inv.investorId,
        investorName: inv.investorName,
        proRataShare: inv.proRataShare,
        lpAllocation,
        gpCarryAllocation,
        totalAllocation: lpAllocation + gpCarryAllocation,
      };
    });
  }

  return {
    tiers: results,
    totalLP,
    totalGP,
    distributableAmount,
    clawbackLiability,
    gpCoInvestAllocation,
    perInvestorBreakdown,
  };
}
