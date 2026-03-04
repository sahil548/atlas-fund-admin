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

export interface WaterfallResult {
  tiers: WaterfallTierResult[];
  totalLP: number;
  totalGP: number;
  distributableAmount: number;
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
 */
export function computeWaterfall(
  tiers: WaterfallTierInput[],
  distributableAmount: number,
  totalContributed: number,
  totalDistributedPrior: number = 0,
  yearsOutstanding: number = 1,
): WaterfallResult {
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

    // Preferred Return: cap at hurdle rate * contributed * years
    if (tier.hurdleRate && tier.hurdleRate > 0 && tier.splitLP === 100 && tier.splitGP === 0) {
      const prefAmount = totalContributed * (tier.hurdleRate / 100) * yearsOutstanding;
      tierAmount = Math.min(remaining, prefAmount);
    }

    // GP Catch-Up: 100% to GP until GP reaches target share
    if (tier.splitGP === 100 && tier.splitLP === 0) {
      // Standard: GP catches up to 20% of total profits distributed so far
      const totalProfitsSoFar = distributableAmount - remaining;
      const gpTargetPct = 0.20; // standard 20% carry
      const gpTarget = (totalProfitsSoFar + remaining) * gpTargetPct;
      const gpNeeded = Math.max(0, gpTarget - totalGP);
      tierAmount = Math.min(remaining, gpNeeded);
    }

    const lpShare = tierAmount * (tier.splitLP / 100);
    const gpShare = tierAmount * (tier.splitGP / 100);

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

  return {
    tiers: results,
    totalLP,
    totalGP,
    distributableAmount,
  };
}
