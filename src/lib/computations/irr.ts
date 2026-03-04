/**
 * XIRR calculation using Newton-Raphson method.
 * Finds the annualized internal rate of return for irregular cash flows.
 */

interface CashFlow {
  date: Date;
  amount: number; // negative = outflow (capital call), positive = inflow (distribution/NAV)
}

/**
 * Compute XIRR — the annualized internal rate of return for a series of
 * cash flows that occur at irregular intervals.
 *
 * @param cashFlows Array of {date, amount}. Negative = money out, positive = money in.
 * @param guess Initial guess for rate (default 0.1 = 10%)
 * @param maxIterations Maximum Newton-Raphson iterations (default 100)
 * @param tolerance Convergence tolerance (default 1e-7)
 * @returns Annual IRR as a decimal (0.15 = 15%), or null if no convergence
 */
export function xirr(
  cashFlows: CashFlow[],
  guess: number = 0.1,
  maxIterations: number = 100,
  tolerance: number = 1e-7
): number | null {
  if (cashFlows.length < 2) return null;

  // Need at least one negative and one positive cash flow
  const hasNegative = cashFlows.some((cf) => cf.amount < 0);
  const hasPositive = cashFlows.some((cf) => cf.amount > 0);
  if (!hasNegative || !hasPositive) return null;

  // Sort by date
  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const d0 = sorted[0].date.getTime();
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

  // NPV function: sum of amount_i / (1 + rate)^(years_i)
  function npv(rate: number): number {
    return sorted.reduce((sum, cf) => {
      const years = (cf.date.getTime() - d0) / MS_PER_YEAR;
      return sum + cf.amount / Math.pow(1 + rate, years);
    }, 0);
  }

  // Derivative of NPV with respect to rate
  function dnpv(rate: number): number {
    return sorted.reduce((sum, cf) => {
      const years = (cf.date.getTime() - d0) / MS_PER_YEAR;
      return sum - years * cf.amount / Math.pow(1 + rate, years + 1);
    }, 0);
  }

  // Newton-Raphson iteration
  let rate = guess;
  for (let i = 0; i < maxIterations; i++) {
    const f = npv(rate);
    const df = dnpv(rate);
    if (Math.abs(df) < 1e-10) {
      // Derivative too small — try a different starting point
      rate = rate + 0.1;
      continue;
    }
    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < tolerance) {
      // Sanity check: rate should be reasonable (-0.99 to 10.0 = -99% to 1000%)
      if (newRate > -0.99 && newRate < 10.0) {
        return newRate;
      }
      return null;
    }
    rate = newRate;
    // Guard against divergence
    if (rate < -0.99) rate = -0.5;
    if (rate > 10.0) rate = 5.0;
  }

  return null; // Did not converge
}
