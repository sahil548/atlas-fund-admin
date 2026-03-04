/**
 * Fund performance metrics calculations.
 */

export interface FundMetrics {
  tvpi: number | null;  // Total Value to Paid-In
  dpi: number | null;   // Distributions to Paid-In
  rvpi: number | null;  // Residual Value to Paid-In
  moic: number | null;  // Multiple on Invested Capital
}

/**
 * Compute standard fund performance metrics.
 *
 * @param totalCalled Total capital called (paid-in by investor)
 * @param totalDistributed Total distributions received by investor
 * @param currentNAV Current net asset value (residual value)
 * @param costBasis Optional — original cost basis (for MOIC)
 * @param fairValue Optional — current fair value (for MOIC)
 */
export function computeMetrics(
  totalCalled: number,
  totalDistributed: number,
  currentNAV: number,
  costBasis?: number | null,
  fairValue?: number | null,
): FundMetrics {
  const paidIn = totalCalled;

  const tvpi = paidIn > 0 ? (totalDistributed + currentNAV) / paidIn : null;
  const dpi = paidIn > 0 ? totalDistributed / paidIn : null;
  const rvpi = paidIn > 0 ? currentNAV / paidIn : null;
  const moic =
    costBasis && costBasis > 0 && fairValue != null
      ? fairValue / costBasis
      : null;

  return { tvpi, dpi, rvpi, moic };
}

/**
 * Compute MOIC for a single asset.
 */
export function computeMOIC(
  costBasis: number,
  fairValue: number,
): number | null {
  if (costBasis <= 0) return null;
  return fairValue / costBasis;
}
