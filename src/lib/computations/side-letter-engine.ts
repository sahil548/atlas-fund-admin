/**
 * Side letter computation engine.
 * Applies structured side letter rules to fee calculations and detects MFN gaps.
 */

import { prisma } from "@/lib/prisma";
import type { FeeResult } from "./fee-engine";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SideLetterAdjustment {
  ruleType: string;
  description: string;
  value?: number;
}

export interface AppliedSideLetterResult {
  /** Standard management fee before any side letter adjustments */
  standardFee: number;
  /** Amount of fee discount applied (positive = reduction) */
  feeDiscount: number;
  /** Net management fee after discount */
  netFee: number;
  /** Standard carry rate (decimal, e.g. 0.20 for 20%) */
  standardCarry: number;
  /** Override carry rate from CARRY_OVERRIDE rule (decimal), null if no override */
  carryOverride: number | null;
  /** Net carry rate after override (same as carryOverride if set, else standardCarry) */
  netCarry: number;
  /** Whether investor has MFN rights */
  hasMFN: boolean;
  /** Whether investor has co-invest rights */
  hasCoInvest: boolean;
  /** Free-text custom provisions */
  customProvisions: string[];
  /** All adjustments as line items for display */
  adjustments: SideLetterAdjustment[];
}

export interface AdjustedFeeResult {
  /** Standard management fee from fee engine */
  standardFee: number;
  /** Discount amount (positive number = reduction) */
  feeDiscount: number;
  /** Net management fee after discount */
  netFee: number;
  /** Standard carry from waterfall */
  standardCarry: number;
  /** Override carry value if CARRY_OVERRIDE rule exists */
  carryOverride: number | null;
  /** Net carry amount */
  netCarry: number;
  /** Structured list of adjustments applied */
  adjustments: SideLetterAdjustment[];
}

export interface MFNGap {
  investorId: string;
  investorName: string;
  /** This investor's FEE_DISCOUNT value (%) */
  currentFeeDiscount: number | null;
  /** Best FEE_DISCOUNT across all side letters in entity (%) */
  bestFeeDiscount: number | null;
  /** This investor's CARRY_OVERRIDE value (%) */
  currentCarryOverride: number | null;
  /** Best CARRY_OVERRIDE across all side letters in entity (lowest carry = best for LP) */
  bestCarryOverride: number | null;
  hasGap: boolean;
}

// ── applySideLetterRules ───────────────────────────────────────────────────────

/**
 * Apply side letter rules for a given investor+entity pair to a standard fee amount.
 *
 * Queries active SideLetterRule records and computes adjustments as separate line items.
 */
export async function applySideLetterRules(
  investorId: string,
  entityId: string,
  standardFee: number,
  standardCarry: number
): Promise<AppliedSideLetterResult> {
  // Find the side letter for this investor+entity pair
  const sideLetter = await prisma.sideLetter.findFirst({
    where: { investorId, entityId },
    include: {
      rules: { where: { isActive: true } },
    },
  });

  const rules = sideLetter?.rules ?? [];

  let feeDiscountPct = 0;
  let carryOverridePct: number | null = null;
  let hasMFN = false;
  let hasCoInvest = false;
  const customProvisions: string[] = [];
  const adjustments: SideLetterAdjustment[] = [];

  for (const rule of rules) {
    switch (rule.ruleType) {
      case "FEE_DISCOUNT":
        if (rule.value != null) {
          feeDiscountPct = Math.max(feeDiscountPct, rule.value); // take highest discount
          adjustments.push({
            ruleType: "FEE_DISCOUNT",
            description: `Fee discount: ${rule.value}%`,
            value: rule.value,
          });
        }
        break;

      case "CARRY_OVERRIDE":
        if (rule.value != null) {
          carryOverridePct = rule.value;
          adjustments.push({
            ruleType: "CARRY_OVERRIDE",
            description: `Carry rate override: ${rule.value}%`,
            value: rule.value,
          });
        }
        break;

      case "MFN":
        hasMFN = true;
        adjustments.push({
          ruleType: "MFN",
          description: "Most Favored Nation (MFN) rights",
        });
        break;

      case "CO_INVEST_RIGHTS":
        hasCoInvest = true;
        adjustments.push({
          ruleType: "CO_INVEST_RIGHTS",
          description: "Co-investment rights",
        });
        break;

      case "CUSTOM":
        if (rule.description) {
          customProvisions.push(rule.description);
          adjustments.push({
            ruleType: "CUSTOM",
            description: rule.description,
          });
        }
        break;
    }
  }

  const feeDiscount = standardFee * (feeDiscountPct / 100);
  const netFee = standardFee - feeDiscount;

  // carryOverridePct is the new carry percentage (e.g. 15 means 15%)
  // standardCarry is already expressed as a decimal (e.g. 0.20 for 20%)
  const netCarry =
    carryOverridePct != null ? carryOverridePct / 100 : standardCarry;

  return {
    standardFee,
    feeDiscount,
    netFee,
    standardCarry,
    carryOverride: carryOverridePct != null ? carryOverridePct / 100 : null,
    netCarry,
    hasMFN,
    hasCoInvest,
    customProvisions,
    adjustments,
  };
}

// ── integrateSideLetterWithFeeCalc ────────────────────────────────────────────

/**
 * Takes the output of the existing fee engine and applies side letter adjustments.
 * Returns structured line items so the UI can show: standard fee, discount, net amount.
 */
export async function integrateSideLetterWithFeeCalc(
  investorId: string,
  entityId: string,
  feeResult: FeeResult
): Promise<AdjustedFeeResult> {
  const standardFee = feeResult.managementFee;
  // FeeResult does not expose carry rate directly — use carriedInterest as the base carry amount
  const standardCarry = feeResult.carriedInterest;

  const applied = await applySideLetterRules(
    investorId,
    entityId,
    standardFee,
    standardCarry
  );

  return {
    standardFee: applied.standardFee,
    feeDiscount: applied.feeDiscount,
    netFee: applied.netFee,
    standardCarry: applied.standardCarry,
    carryOverride: applied.carryOverride,
    netCarry: applied.netCarry,
    adjustments: applied.adjustments,
  };
}

// ── detectMFNGaps ─────────────────────────────────────────────────────────────

/**
 * Find all side letters with MFN rule for a given entity.
 * For each MFN holder, compare their FEE_DISCOUNT and CARRY_OVERRIDE against
 * the best terms across ALL side letters for that entity.
 *
 * Best terms = highest fee discount, lowest carry override.
 */
export async function detectMFNGaps(entityId: string): Promise<MFNGap[]> {
  // Load all side letters for this entity (with investor info and active rules)
  const allSideLetters = await prisma.sideLetter.findMany({
    where: { entityId },
    include: {
      investor: { select: { id: true, name: true } },
      rules: { where: { isActive: true } },
    },
  });

  if (allSideLetters.length === 0) return [];

  // Compute entity-wide best terms across all side letters
  let bestFeeDiscount: number | null = null;
  let bestCarryOverride: number | null = null; // lowest is best for LP

  for (const sl of allSideLetters) {
    for (const rule of sl.rules) {
      if (rule.ruleType === "FEE_DISCOUNT" && rule.value != null) {
        if (bestFeeDiscount === null || rule.value > bestFeeDiscount) {
          bestFeeDiscount = rule.value;
        }
      }
      if (rule.ruleType === "CARRY_OVERRIDE" && rule.value != null) {
        if (bestCarryOverride === null || rule.value < bestCarryOverride) {
          bestCarryOverride = rule.value;
        }
      }
    }
  }

  // Find MFN holders and compare their terms to entity best
  const gaps: MFNGap[] = [];

  for (const sl of allSideLetters) {
    const hasMFN = sl.rules.some((r) => r.ruleType === "MFN");
    if (!hasMFN) continue;

    const feeDiscountRule = sl.rules.find(
      (r) => r.ruleType === "FEE_DISCOUNT" && r.value != null
    );
    const carryOverrideRule = sl.rules.find(
      (r) => r.ruleType === "CARRY_OVERRIDE" && r.value != null
    );

    const currentFeeDiscount = feeDiscountRule?.value ?? null;
    const currentCarryOverride = carryOverrideRule?.value ?? null;

    // Gap exists if:
    // - Their fee discount is less than entity best (they're missing out on a better deal)
    // - Or their carry override is higher than entity best (they have a worse carry rate)
    const feeGap =
      bestFeeDiscount !== null &&
      (currentFeeDiscount === null || currentFeeDiscount < bestFeeDiscount);

    const carryGap =
      bestCarryOverride !== null &&
      (currentCarryOverride === null ||
        currentCarryOverride > bestCarryOverride);

    gaps.push({
      investorId: sl.investorId,
      investorName: sl.investor.name,
      currentFeeDiscount,
      bestFeeDiscount,
      currentCarryOverride,
      bestCarryOverride,
      hasGap: feeGap || carryGap,
    });
  }

  return gaps;
}
