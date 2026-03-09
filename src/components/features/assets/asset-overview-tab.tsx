"use client";

import { Badge } from "@/components/ui/badge";
import { fmt, pct, formatDate, cn } from "@/lib/utils";
import {
  ASSET_CLASS_LABELS,
  CAPITAL_INSTRUMENT_LABELS,
  PARTICIPATION_LABELS,
} from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  asset: any;
}

export function AssetOverviewTab({ asset: a }: Props) {
  const ur = a.fairValue - a.costBasis;
  const isExited = a.status === "EXITED";

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
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200",
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Exit Performance</h3>
              <Badge color="gray">EXITED</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="text-center">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Entry Date</div>
                <div className="text-sm font-semibold">
                  {a.entryDate ? formatDate(a.entryDate) : "---"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Exit Date</div>
                <div className="text-sm font-semibold">{formatDate(a.exitDate)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Total Invested</div>
                <div className="text-sm font-semibold">{fmt(a.costBasis)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Exit Proceeds</div>
                <div className="text-sm font-semibold">{fmt(a.exitProceeds)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Final MOIC</div>
                <div
                  className={cn(
                    "text-xl font-bold",
                    (a.exitProceeds - a.costBasis) >= 0 ? "text-emerald-700" : "text-red-600",
                  )}
                >
                  {a.moic ? `${a.moic.toFixed(2)}x` : "---"}
                </div>
              </div>
            </div>
            {a.irr != null && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex gap-4 text-xs">
                <span className="text-gray-500">
                  Final IRR:{" "}
                  <span className="font-semibold text-gray-800">{pct(a.irr)}</span>
                </span>
                {a.entryDate && (
                  <span className="text-gray-500">
                    Hold period:{" "}
                    <span className="font-semibold text-gray-800">
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
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-[10px] text-gray-500 uppercase">Cost Basis</div>
            <div className="text-base font-bold text-gray-900">{fmt(a.costBasis)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-[10px] text-gray-500 uppercase">Fair Value</div>
            <div className="text-base font-bold text-gray-900">{fmt(a.fairValue)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-[10px] text-gray-500 uppercase">Unrealized</div>
            <div className={cn("text-base font-bold", ur >= 0 ? "text-emerald-700" : "text-red-600")}>
              {ur >= 0 ? "+" : ""}{fmt(ur)}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-[10px] text-gray-500 uppercase">MOIC</div>
            <div className={cn("text-base font-bold", (a.moic || 0) >= 2 ? "text-emerald-700" : "text-gray-900")}>
              {(a.moic || 0).toFixed(2)}x
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <div className="text-[10px] text-gray-500 uppercase">Gross IRR</div>
            <div className="text-base font-bold text-emerald-700">
              {a.irr ? pct(a.irr) : "---"}
            </div>
          </div>
        </div>

        {/* Ownership section (only if values exist) */}
        {(a.ownershipPercent != null || a.shareCount != null) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-3">Ownership</h3>
            <div className="grid grid-cols-2 gap-4">
              {a.ownershipPercent != null && (
                <div>
                  <div className="text-[10px] text-gray-500 uppercase mb-1">Ownership %</div>
                  <div className="text-lg font-bold text-gray-900">
                    {pct(a.ownershipPercent / 100)}
                  </div>
                </div>
              )}
              {a.shareCount != null && (
                <div>
                  <div className="text-[10px] text-gray-500 uppercase mb-1">Share Count</div>
                  <div className="text-lg font-bold text-gray-900">
                    {a.shareCount.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Entity Allocations */}
        {a.entityAllocations?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-3">Vehicle Allocations</h3>
            <div className="space-y-2">
              {a.entityAllocations.map(
                (ea: {
                  entity: { id: string; name: string; type: string };
                  allocationPercent: number;
                  costBasis: number | null;
                }) => (
                  <div
                    key={ea.entity.id}
                    className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{ea.entity.name}</span>
                      <Badge color="gray">{ea.entity.type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500">{ea.allocationPercent}%</span>
                      {ea.costBasis != null && (
                        <span className="font-medium">{fmt(ea.costBasis)}</span>
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
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold">AI Deal Intelligence</h3>
              {a.sourceDeal.screeningResult.score != null && (
                <Badge color="indigo">
                  Score: {a.sourceDeal.screeningResult.score}/100
                </Badge>
              )}
            </div>
            {a.sourceDeal.screeningResult.summary && (
              <p className="text-sm text-gray-700 leading-relaxed">
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
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Key Dates</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs py-1.5 border-b border-gray-50">
              <span className="text-gray-500">Entry Date</span>
              <span className="font-medium">
                {a.entryDate ? formatDate(a.entryDate) : "---"}
              </span>
            </div>
            {a.exitDate && (
              <div className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Exit Date</span>
                <span className="font-medium">{formatDate(a.exitDate)}</span>
              </div>
            )}
            {a.nextReview && (
              <div className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Next Review</span>
                <span className="font-medium">{formatDate(a.nextReview)}</span>
              </div>
            )}
            {a.creditDetails?.maturity && (
              <div className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Maturity</span>
                <span className="font-medium">{a.creditDetails.maturity}</span>
              </div>
            )}
          </div>
        </div>

        {/* Review Schedule */}
        {a.reviewFrequency && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-3">Review Schedule</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge color="indigo">{a.reviewFrequency}</Badge>
                <span className="text-xs text-gray-500">review frequency</span>
              </div>
              {a.nextReview && (
                <div className="text-xs text-gray-500 mt-2">
                  {(() => {
                    const days = Math.floor(
                      (new Date(a.nextReview).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24),
                    );
                    if (days < 0) return `${Math.abs(days)} days overdue`;
                    if (days === 0) return "Due today";
                    return `${days} days until next review`;
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {a.notes && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-3">Notes</h3>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
              {a.notes}
            </p>
          </div>
        )}

        {/* Asset Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold mb-3">Asset Details</h3>
          <div className="space-y-2">
            {a.sector && (
              <div className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Sector</span>
                <span className="font-medium">{a.sector}</span>
              </div>
            )}
            {a.assetClass && (
              <div className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Asset Class</span>
                <span className="font-medium">
                  {ASSET_CLASS_LABELS[a.assetClass] || a.assetClass}
                </span>
              </div>
            )}
            {a.capitalInstrument && (
              <div className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Instrument</span>
                <span className="font-medium">
                  {CAPITAL_INSTRUMENT_LABELS[a.capitalInstrument] || a.capitalInstrument}
                </span>
              </div>
            )}
            {a.participationStructure && (
              <div className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Participation</span>
                <span className="font-medium">
                  {PARTICIPATION_LABELS[a.participationStructure] || a.participationStructure}
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs py-1.5 border-b border-gray-50">
              <span className="text-gray-500">Board Seat</span>
              <span className="font-medium">{a.hasBoardSeat ? "Yes" : "No"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
