/**
 * Capital account computation engine.
 * Computes period-by-period capital account statements from ledger data.
 */

export interface CapitalAccountResult {
  beginningBalance: number;
  contributions: number;
  incomeAllocations: number;
  capitalAllocations: number;
  distributions: number;
  fees: number;
  endingBalance: number;
}

/**
 * Compute a single capital account period using roll-forward logic.
 *
 * Formula:
 *   endingBalance = beginningBalance
 *     + contributions (capital calls funded in period)
 *     + incomeAllocations (pro-rata share of income events)
 *     + capitalAllocations (unrealized/realized gains from valuations)
 *     - distributions (pro-rata distributions in period)
 *     - fees (pro-rata management fees + expenses + carry)
 */
export function computeCapitalAccount(
  beginningBalance: number,
  contributions: number,
  incomeAllocations: number,
  capitalAllocations: number,
  distributions: number,
  fees: number,
): CapitalAccountResult {
  const endingBalance =
    beginningBalance +
    contributions +
    incomeAllocations +
    capitalAllocations -
    Math.abs(distributions) -
    Math.abs(fees);

  return {
    beginningBalance,
    contributions,
    incomeAllocations,
    capitalAllocations,
    distributions: Math.abs(distributions),
    fees: Math.abs(fees),
    endingBalance,
  };
}

/**
 * Compute pro-rata share for an investor in an entity.
 * Used to allocate income, gains, fees proportionally.
 *
 * @param investorCommitment The investor's commitment amount to this entity
 * @param totalEntityCommitments Sum of all investor commitments to this entity
 * @returns Percentage as a decimal (e.g., 0.30 = 30%)
 */
export function proRataShare(
  investorCommitment: number,
  totalEntityCommitments: number,
): number {
  if (totalEntityCommitments <= 0) return 0;
  return investorCommitment / totalEntityCommitments;
}
