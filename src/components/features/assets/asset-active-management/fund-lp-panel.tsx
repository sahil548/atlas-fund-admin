"use client";

import { Badge } from "@/components/ui/badge";
import { fmt, pct, cn, formatDate } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  asset: any;
}

// Parse a numeric string to number (AssetFundLPDetails fields are stored as strings)
function parseNum(val: string | number | null | undefined): number | null {
  if (val == null) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

export function FundLPPanel({ asset: a }: Props) {
  const lp = a.fundLPDetails;

  const totalCommitment = parseNum(lp?.commitment) ?? 0;
  const calledAmount = parseNum(lp?.calledAmount) ?? 0;
  const uncalledAmount =
    parseNum(lp?.uncalledAmount) ?? Math.max(0, totalCommitment - calledAmount);
  const distributions = parseNum(lp?.distributions) ?? 0;

  const calledPct = totalCommitment > 0 ? (calledAmount / totalCommitment) * 100 : 0;
  const uncalledPct = totalCommitment > 0 ? (uncalledAmount / totalCommitment) * 100 : 0;

  // Internal figures from asset
  const internalFairValue = a.fairValue;
  const internalMoic = a.moic;
  const internalIrr = a.irr;

  // GP reported figures (stored as strings in schema)
  const gpNavNum = parseNum(lp?.gpNav);
  const gpIrrNum = parseNum(lp?.gpIrr);
  const gpTvpiNum = parseNum(lp?.gpTvpi);

  function compareColor(internal: number | null | undefined, gp: number | null | undefined) {
    if (internal == null || gp == null) return "gray";
    if (internal > gp) return "green";
    if (internal < gp) return "red";
    return "gray";
  }

  function compareLabel(internal: number | null | undefined, gp: number | null | undefined): string {
    if (internal == null || gp == null) return "No Data";
    if (internal > gp) return "Internal Higher";
    if (internal < gp) return "GP Higher";
    return "Equal";
  }

  return (
    <div className="space-y-4">
      {/* GP Reporting Tracker */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">GP Reporting Tracker</h3>
          {lp?.gpName && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{lp.gpName}</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">GP NAV</div>
            <div className="text-base font-bold text-gray-900 dark:text-gray-100">
              {gpNavNum != null ? fmt(gpNavNum) : lp?.gpNav ?? "---"}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">GP IRR</div>
            <div className="text-base font-bold text-gray-900 dark:text-gray-100">
              {lp?.gpIrr ?? "---"}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">GP TVPI</div>
            <div className="text-base font-bold text-gray-900 dark:text-gray-100">
              {lp?.gpTvpi ?? "---"}
            </div>
          </div>
        </div>
        {lp?.strategy && (
          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Strategy: {lp.strategy}
            {lp.vintage && <span> · Vintage {lp.vintage}</span>}
          </div>
        )}
        {lp?.navDate && (
          <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            NAV as of: {lp.navDate}
          </div>
        )}
        {a.nextReview && (
          <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            Next GP report expected: {formatDate(a.nextReview)}
          </div>
        )}
      </div>

      {/* Internal vs GP Comparison */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Internal vs GP Comparison
        </h3>
        <div className="space-y-3">
          {/* NAV comparison */}
          <div className="grid grid-cols-3 gap-2 text-xs items-center">
            <div>
              <div className="text-gray-500 dark:text-gray-400 mb-0.5">Internal Fair Value</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {internalFairValue != null ? fmt(internalFairValue) : "---"}
              </div>
            </div>
            <div className="text-center">
              <Badge color={compareColor(internalFairValue, gpNavNum)}>
                {compareLabel(internalFairValue, gpNavNum)}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-gray-500 dark:text-gray-400 mb-0.5">GP NAV</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {gpNavNum != null ? fmt(gpNavNum) : lp?.gpNav ?? "---"}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-50 dark:border-gray-800" />
          {/* IRR comparison */}
          <div className="grid grid-cols-3 gap-2 text-xs items-center">
            <div>
              <div className="text-gray-500 dark:text-gray-400 mb-0.5">Internal IRR</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {internalIrr != null ? pct(internalIrr) : "---"}
              </div>
            </div>
            <div className="text-center">
              <Badge color={compareColor(internalIrr, gpIrrNum != null ? gpIrrNum / 100 : null)}>
                {compareLabel(internalIrr, gpIrrNum != null ? gpIrrNum / 100 : null)}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-gray-500 dark:text-gray-400 mb-0.5">GP IRR</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {lp?.gpIrr ?? "---"}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-50 dark:border-gray-800" />
          {/* MOIC vs TVPI */}
          <div className="grid grid-cols-3 gap-2 text-xs items-center">
            <div>
              <div className="text-gray-500 dark:text-gray-400 mb-0.5">Internal MOIC</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {internalMoic != null ? `${internalMoic.toFixed(2)}x` : "---"}
              </div>
            </div>
            <div className="text-center">
              <Badge color={compareColor(internalMoic, gpTvpiNum)}>
                {compareLabel(internalMoic, gpTvpiNum)}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-gray-500 dark:text-gray-400 mb-0.5">GP TVPI</div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {lp?.gpTvpi ?? "---"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Commitment Lifecycle */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Commitment Lifecycle
        </h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Total Commitment</div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {totalCommitment > 0 ? fmt(totalCommitment) : lp?.commitment ?? "---"}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Called</div>
            <div className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
              {calledAmount > 0 ? fmt(calledAmount) : lp?.calledAmount ?? "---"}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Dry Powder</div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {uncalledAmount > 0
                ? fmt(uncalledAmount)
                : lp?.uncalledAmount ?? "---"}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Distributions</div>
            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {distributions > 0 ? fmt(distributions) : lp?.distributions ?? "---"}
            </div>
          </div>
        </div>
        {/* Visual progress bar */}
        {totalCommitment > 0 && (
          <div>
            <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-1">
              <span>Called ({calledPct.toFixed(0)}%)</span>
              <span>Uncalled ({uncalledPct.toFixed(0)}%)</span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-indigo-500 dark:bg-indigo-600 rounded-l-full transition-all"
                style={{ width: `${Math.min(calledPct, 100)}%` }}
              />
              <div
                className="h-full bg-amber-300 dark:bg-amber-600"
                style={{ width: `${Math.min(uncalledPct, 100 - calledPct)}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-indigo-500 dark:bg-indigo-600 rounded-sm" />
                Called capital
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-amber-300 dark:bg-amber-600 rounded-sm" />
                Uncalled (dry powder)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
