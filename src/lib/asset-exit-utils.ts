/**
 * Asset exit utility functions (Phase 14)
 * Pure functions for exit MOIC, hold period, gain/loss calculations.
 */

export interface ExitMetrics {
  moic: number;
  gainLoss: number;
  holdPeriodDays: number;
}

/**
 * Calculate exit metrics from asset data.
 * @param costBasis - Original investment cost
 * @param exitProceeds - Amount received at exit
 * @param entryDate - Date asset was acquired (null if unknown)
 * @param exitDate - Date asset was exited
 */
export function calculateExitMetrics(
  costBasis: number,
  exitProceeds: number,
  entryDate: Date | null,
  exitDate: Date,
): ExitMetrics {
  const moic = costBasis > 0 ? exitProceeds / costBasis : 0;
  const gainLoss = exitProceeds - costBasis;
  const holdPeriodDays =
    entryDate !== null
      ? Math.floor((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  return { moic, gainLoss, holdPeriodDays };
}

/**
 * Returns the standard set of closing tasks auto-created when an asset is exited.
 */
export function getExitClosingTasks(): string[] {
  return [
    "File final tax documents",
    "Distribute exit proceeds to LPs",
    "Update cap table and ownership records",
    "Archive deal and asset files",
    "Send exit notice to LPs",
  ];
}
