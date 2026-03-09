"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt, pct, formatDate, cn } from "@/lib/utils";
import {
  ASSET_CLASS_LABELS,
  CAPITAL_INSTRUMENT_LABELS,
  PARTICIPATION_LABELS,
} from "@/lib/constants";
import { REManagementPanel } from "./asset-active-management/re-management-panel";
import { FundLPPanel } from "./asset-active-management/fund-lp-panel";
import { CreditManagementPanel } from "./asset-active-management/credit-management-panel";
import { EquityManagementPanel } from "./asset-active-management/equity-management-panel";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  asset: any;
}

// Type-aware review suggestions
const reviewSuggestions: Record<string, string[]> = {
  REAL_ESTATE: [
    "Check lease expirations and renewal status",
    "Review market comp update",
    "Verify tenant payment status",
    "Update NOI and cap rate",
  ],
  CREDIT: [
    "Verify covenant compliance status",
    "Review payment history",
    "Check maturity timeline and refinance options",
    "Update interest rate if reset occurred",
  ],
  EQUITY: [
    "Review latest company financials",
    "Check valuation against last round",
    "Prepare for board meeting if applicable",
    "Update milestone progress",
  ],
  VENTURE: [
    "Review latest company financials",
    "Check valuation against last round",
    "Prepare for board meeting if applicable",
    "Update milestone progress",
  ],
};

function computeNextReview(reviewFrequency: string | null | undefined): Date {
  const now = new Date();
  switch (reviewFrequency) {
    case "semi_annual":
      now.setMonth(now.getMonth() + 6);
      break;
    case "annual":
      now.setFullYear(now.getFullYear() + 1);
      break;
    case "quarterly":
    default:
      now.setMonth(now.getMonth() + 3);
      break;
  }
  return now;
}

export function AssetOverviewTab({ asset: a }: Props) {
  const [markingReview, setMarkingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const ur = a.fairValue - a.costBasis;
  const isExited = a.status === "EXITED";

  // Determine if review is due or overdue (within 7 days or past)
  const reviewDaysRemaining = a.nextReview
    ? Math.floor(
        (new Date(a.nextReview).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
    : null;
  const isReviewDue = reviewDaysRemaining !== null && reviewDaysRemaining <= 7;
  const suggestions = reviewSuggestions[a.assetClass] ?? [];

  async function handleMarkReviewed() {
    setMarkingReview(true);
    setReviewMessage(null);
    try {
      const nextReview = computeNextReview(a.reviewFrequency);
      const res = await fetch(`/api/assets/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextReview: nextReview.toISOString(),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        const msg = typeof d.error === "string" ? d.error : "Failed to log review";
        setReviewMessage(`Error: ${msg}`);
      } else {
        setReviewMessage(
          `Review logged — next review scheduled for ${nextReview.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}`,
        );
        // Revalidate SWR cache for this asset
        mutate(`/api/assets/${a.id}`);
      }
    } catch {
      setReviewMessage("Error: Failed to log review");
    } finally {
      setMarkingReview(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ─── Main Content (left 2/3) ─── */}
      <div className="lg:col-span-2 space-y-4">
        {/* Exit Performance Card — shown when exited */}
        {isExited && a.exitDate && a.exitProceeds != null && (
          <div
            className={cn(
              "rounded-xl border p-5",
              (a.exitProceeds - a.costBasis) >= 0
                ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800"
                : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Exit Performance</h3>
              <Badge color="gray">EXITED</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="text-center">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Entry Date</div>
                <div className="text-sm font-semibold dark:text-gray-100">
                  {a.entryDate ? formatDate(a.entryDate) : "---"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Exit Date</div>
                <div className="text-sm font-semibold dark:text-gray-100">{formatDate(a.exitDate)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Total Invested</div>
                <div className="text-sm font-semibold dark:text-gray-100">{fmt(a.costBasis)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Exit Proceeds</div>
                <div className="text-sm font-semibold dark:text-gray-100">{fmt(a.exitProceeds)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Final MOIC</div>
                <div
                  className={cn(
                    "text-xl font-bold",
                    (a.exitProceeds - a.costBasis) >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                  )}
                >
                  {a.moic ? `${a.moic.toFixed(2)}x` : "---"}
                </div>
              </div>
            </div>
            {a.irr != null && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-4 text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  Final IRR:{" "}
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{pct(a.irr)}</span>
                </span>
                {a.entryDate && (
                  <span className="text-gray-500 dark:text-gray-400">
                    Hold period:{" "}
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {Math.floor(
                        (new Date(a.exitDate).getTime() -
                          new Date(a.entryDate).getTime()) /
                          (1000 * 60 * 60 * 24),
                      )}{" "}
                      days
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Key Metrics Row */}
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Cost Basis</div>
            <div className="text-base font-bold text-gray-900 dark:text-gray-100">{fmt(a.costBasis)}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Fair Value</div>
            <div className="text-base font-bold text-gray-900 dark:text-gray-100">{fmt(a.fairValue)}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Unrealized</div>
            <div className={cn("text-base font-bold", ur >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
              {ur >= 0 ? "+" : ""}{fmt(ur)}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">MOIC</div>
            <div className={cn("text-base font-bold", (a.moic || 0) >= 2 ? "text-emerald-700 dark:text-emerald-400" : "text-gray-900 dark:text-gray-100")}>
              {(a.moic || 0).toFixed(2)}x
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Gross IRR</div>
            <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">
              {a.irr ? pct(a.irr) : "---"}
            </div>
          </div>
        </div>

        {/* Type-Specific Management Panel */}
        {a.assetClass === "REAL_ESTATE" && <REManagementPanel asset={a} />}
        {a.assetClass === "CREDIT" && <CreditManagementPanel asset={a} />}
        {a.participationStructure === "LP_POSITION" && <FundLPPanel asset={a} />}
        {(a.assetClass === "EQUITY" || a.assetClass === "VENTURE") &&
          a.participationStructure !== "LP_POSITION" && (
            <EquityManagementPanel asset={a} />
          )}

        {/* Ownership section (only if values exist) */}
        {(a.ownershipPercent != null || a.shareCount != null) && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold mb-3 dark:text-gray-100">Ownership</h3>
            <div className="grid grid-cols-2 gap-4">
              {a.ownershipPercent != null && (
                <div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Ownership %</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {pct(a.ownershipPercent / 100)}
                  </div>
                </div>
              )}
              {a.shareCount != null && (
                <div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Share Count</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {a.shareCount.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Entity Allocations */}
        {a.entityAllocations?.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold mb-3 dark:text-gray-100">Vehicle Allocations</h3>
            <div className="space-y-2">
              {a.entityAllocations.map(
                (ea: {
                  entity: { id: string; name: string; type: string };
                  allocationPercent: number;
                  costBasis: number | null;
                }) => (
                  <div
                    key={ea.entity.id}
                    className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium dark:text-gray-100">{ea.entity.name}</span>
                      <Badge color="gray">{ea.entity.type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">{ea.allocationPercent}%</span>
                      {ea.costBasis != null && (
                        <span className="font-medium dark:text-gray-200">{fmt(ea.costBasis)}</span>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* AI Deal Intelligence */}
        {a.sourceDeal?.screeningResult && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold dark:text-gray-100">AI Deal Intelligence</h3>
              {a.sourceDeal.screeningResult.score != null && (
                <Badge color="indigo">
                  Score: {a.sourceDeal.screeningResult.score}/100
                </Badge>
              )}
            </div>
            {a.sourceDeal.screeningResult.summary && (
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {a.sourceDeal.screeningResult.summary.length > 400
                  ? a.sourceDeal.screeningResult.summary.slice(0, 400) + "..."
                  : a.sourceDeal.screeningResult.summary}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ─── Sidebar (right 1/3) ─── */}
      <div className="space-y-4">
        {/* Key Dates */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold mb-3 dark:text-gray-100">Key Dates</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Entry Date</span>
              <span className="font-medium dark:text-gray-200">
                {a.entryDate ? formatDate(a.entryDate) : "---"}
              </span>
            </div>
            {a.exitDate && (
              <div className="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Exit Date</span>
                <span className="font-medium dark:text-gray-200">{formatDate(a.exitDate)}</span>
              </div>
            )}
            {a.nextReview && (
              <div className="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Next Review</span>
                <span
                  className={cn(
                    "font-medium",
                    reviewDaysRemaining !== null && reviewDaysRemaining <= 0
                      ? "text-red-600 dark:text-red-400"
                      : reviewDaysRemaining !== null && reviewDaysRemaining <= 7
                      ? "text-amber-600 dark:text-amber-400"
                      : "dark:text-gray-200",
                  )}
                >
                  {formatDate(a.nextReview)}
                </span>
              </div>
            )}
            {a.creditDetails?.maturity && (
              <div className="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Maturity</span>
                <span className="font-medium dark:text-gray-200">{a.creditDetails.maturity}</span>
              </div>
            )}
          </div>
        </div>

        {/* Review Schedule + Mark Reviewed */}
        {a.reviewFrequency && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold mb-3 dark:text-gray-100">Review Schedule</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge color="indigo">{a.reviewFrequency}</Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">review frequency</span>
              </div>
              {a.nextReview && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {(() => {
                    if (reviewDaysRemaining === null) return null;
                    if (reviewDaysRemaining < 0) return `${Math.abs(reviewDaysRemaining)} days overdue`;
                    if (reviewDaysRemaining === 0) return "Due today";
                    return `${reviewDaysRemaining} days until next review`;
                  })()}
                </div>
              )}

              {/* Mark Reviewed button — only for ACTIVE assets */}
              {a.status === "ACTIVE" && (
                <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleMarkReviewed}
                    disabled={markingReview}
                    className="w-full"
                  >
                    {markingReview ? "Logging review..." : "Mark Reviewed"}
                  </Button>
                  {reviewMessage && (
                    <div
                      className={cn(
                        "mt-2 text-xs rounded-lg px-3 py-2",
                        reviewMessage.startsWith("Error")
                          ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                          : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
                      )}
                    >
                      {reviewMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Type-aware review suggestions — shown only when review is due */}
        {isReviewDue && suggestions.length > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 p-5">
            <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-3">
              Review Checklist
            </h3>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-indigo-700 dark:text-indigo-300">
                  <span className="mt-0.5 flex-shrink-0 w-3.5 h-3.5 rounded border border-indigo-300 dark:border-indigo-600" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-indigo-400 dark:text-indigo-500">
              {reviewDaysRemaining !== null && reviewDaysRemaining <= 0
                ? `Review overdue by ${Math.abs(reviewDaysRemaining)} days`
                : `Review due in ${reviewDaysRemaining} day${reviewDaysRemaining !== 1 ? "s" : ""}`}
            </div>
          </div>
        )}

        {/* Notes */}
        {a.notes && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold mb-3 dark:text-gray-100">Notes</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {a.notes}
            </p>
          </div>
        )}

        {/* Asset Details */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold mb-3 dark:text-gray-100">Asset Details</h3>
          <div className="space-y-2">
            {a.sector && (
              <div className="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Sector</span>
                <span className="font-medium dark:text-gray-200">{a.sector}</span>
              </div>
            )}
            {a.assetClass && (
              <div className="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Asset Class</span>
                <span className="font-medium dark:text-gray-200">
                  {ASSET_CLASS_LABELS[a.assetClass] || a.assetClass}
                </span>
              </div>
            )}
            {a.capitalInstrument && (
              <div className="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Instrument</span>
                <span className="font-medium dark:text-gray-200">
                  {CAPITAL_INSTRUMENT_LABELS[a.capitalInstrument] || a.capitalInstrument}
                </span>
              </div>
            )}
            {a.participationStructure && (
              <div className="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Participation</span>
                <span className="font-medium dark:text-gray-200">
                  {PARTICIPATION_LABELS[a.participationStructure] || a.participationStructure}
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Board Seat</span>
              <span className="font-medium dark:text-gray-200">{a.hasBoardSeat ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
