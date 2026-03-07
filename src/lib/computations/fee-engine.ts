/**
 * Fee calculation engine.
 * Computes management fees and carried interest for fund entities.
 */

export interface FeeConfig {
  managementFeeRate: number;  // annual rate as decimal, e.g., 0.02 for 2%
  feeBasis: "COMMITTED_CAPITAL" | "INVESTED_CAPITAL" | "NAV";
  periodFraction: number;     // fraction of year, e.g., 0.25 for quarterly
}

export interface FeeInputs {
  totalCommitments: number;    // total committed capital (for COMMITTED_CAPITAL basis)
  totalCalled: number;         // invested/called capital (for INVESTED_CAPITAL basis)
  entityNAV: number;           // entity net asset value (for NAV basis)
  fundExpenses: number;        // manual entry per user decision
  waterfallGPAllocation: number; // from waterfall calculation for carried interest
}

export interface FeeResult {
  managementFee: number;
  fundExpenses: number;
  carriedInterest: number;
  totalFees: number;
  feeBreakdown: {
    feeBasis: string;
    basisAmount: number;
    rate: number;
    periodFraction: number;
  };
}

/**
 * Compute management fee based on the configured fee basis.
 *
 * COMMITTED_CAPITAL: totalCommitments * rate * periodFraction
 * INVESTED_CAPITAL:  totalCalled * rate * periodFraction
 * NAV:               entityNAV * rate * periodFraction
 */
export function computeManagementFee(config: FeeConfig, inputs: FeeInputs): number {
  let basisAmount: number;
  switch (config.feeBasis) {
    case "COMMITTED_CAPITAL":
      basisAmount = inputs.totalCommitments;
      break;
    case "INVESTED_CAPITAL":
      basisAmount = inputs.totalCalled;
      break;
    case "NAV":
      basisAmount = inputs.entityNAV;
      break;
    default:
      basisAmount = inputs.totalCommitments;
  }
  return basisAmount * config.managementFeeRate * config.periodFraction;
}

/**
 * Compute carried interest — simply returns the GP carry allocation from waterfall results.
 * The actual calculation happens in the waterfall engine.
 */
export function computeCarriedInterest(waterfallGPAllocation: number): number {
  return waterfallGPAllocation;
}

/**
 * Orchestrate full fee calculation: management fee + expenses + carry.
 */
export function calculateFees(config: FeeConfig, inputs: FeeInputs): FeeResult {
  const managementFee = computeManagementFee(config, inputs);
  const carriedInterest = computeCarriedInterest(inputs.waterfallGPAllocation);
  const totalFees = managementFee + inputs.fundExpenses + carriedInterest;

  // Determine basis amount for breakdown
  let basisAmount: number;
  switch (config.feeBasis) {
    case "COMMITTED_CAPITAL":
      basisAmount = inputs.totalCommitments;
      break;
    case "INVESTED_CAPITAL":
      basisAmount = inputs.totalCalled;
      break;
    case "NAV":
      basisAmount = inputs.entityNAV;
      break;
    default:
      basisAmount = inputs.totalCommitments;
  }

  return {
    managementFee,
    fundExpenses: inputs.fundExpenses,
    carriedInterest,
    totalFees,
    feeBreakdown: {
      feeBasis: config.feeBasis,
      basisAmount,
      rate: config.managementFeeRate,
      periodFraction: config.periodFraction,
    },
  };
}
