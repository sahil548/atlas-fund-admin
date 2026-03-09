"use client";

import { Badge } from "@/components/ui/badge";
import { fmt, cn, formatDate } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  asset: any;
}

export function EquityManagementPanel({ asset: a }: Props) {
  const eq = a.equityDetails;

  // Most recent valuation (valuations ordered by valuationDate desc in API)
  const latestValuation = a.valuations?.[0] ?? null;
  const lastValuationDate = latestValuation?.valuationDate ?? null;
  const lastValuationAmount = latestValuation?.fairValue ?? null;

  // Days since last valuation
  const daysSinceValuation = lastValuationDate
    ? Math.floor(
        (Date.now() - new Date(lastValuationDate).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const isStale = daysSinceValuation !== null && daysSinceValuation > 180;

  return (
    <div className="space-y-4">
      {/* Stale data warning */}
      {isStale && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
          <span className="text-amber-500 text-base mt-0.5">&#9888;</span>
          <div>
            <div className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Valuation Data May Be Stale
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Last valuation was {daysSinceValuation} days ago (
              {lastValuationDate ? formatDate(lastValuationDate) : "unknown"}). Consider
              updating to reflect current market conditions.
            </div>
          </div>
        </div>
      )}

      {/* Valuation & Company Info */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Valuation & Milestone Tracking
        </h3>

        {/* Company/equity info row */}
        {(eq?.instrument || eq?.ownership) && (
          <div className="flex items-center gap-2 mb-3">
            {eq.instrument && (
              <Badge color="indigo">{eq.instrument}</Badge>
            )}
            {eq.ownership && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Ownership: {eq.ownership}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">
              Last Valuation
            </div>
            <div className="text-base font-bold text-gray-900 dark:text-gray-100">
              {lastValuationAmount != null ? fmt(lastValuationAmount) : "---"}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">
              Valuation Date
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {lastValuationDate ? formatDate(lastValuationDate) : "---"}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">
              Days Since Valued
            </div>
            <div
              className={cn(
                "text-base font-bold",
                daysSinceValuation === null
                  ? "text-gray-400"
                  : daysSinceValuation > 180
                  ? "text-red-600 dark:text-red-400"
                  : daysSinceValuation > 90
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-700 dark:text-emerald-400",
              )}
            >
              {daysSinceValuation !== null ? `${daysSinceValuation}d` : "---"}
            </div>
          </div>
        </div>

        {/* Operating metrics */}
        {(eq?.revenue || eq?.ebitda || eq?.growth) && (
          <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
            <h4 className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Operating Metrics</h4>
            <div className="grid grid-cols-3 gap-3">
              {eq.revenue && (
                <div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Revenue</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{eq.revenue}</div>
                </div>
              )}
              {eq.ebitda && (
                <div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">EBITDA</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{eq.ebitda}</div>
                </div>
              )}
              {eq.growth && (
                <div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Growth</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{eq.growth}</div>
                </div>
              )}
              {eq.employees && (
                <div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1">Employees</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{eq.employees.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Valuation method from latest valuation */}
        {latestValuation?.method && (
          <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            Valuation method: {latestValuation.method.replace(/_/g, " ")}
            {latestValuation.notes && (
              <span className="ml-2 text-gray-300 dark:text-gray-600">· {latestValuation.notes}</span>
            )}
          </div>
        )}
      </div>

      {/* Key Dates */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Key Dates</h3>
        <div className="space-y-2">
          {a.entryDate && (
            <div className="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Entry Date</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatDate(a.entryDate)}
              </span>
            </div>
          )}
          {lastValuationDate && (
            <div className="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Last Valuation Date</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatDate(lastValuationDate)}
              </span>
            </div>
          )}
          {a.nextReview && (
            <div className="flex justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Next Review Date</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatDate(a.nextReview)}
              </span>
            </div>
          )}
        </div>

        {/* Board seat placeholder */}
        {a.hasBoardSeat && (
          <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
            <div className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-3 py-2">
              <span className="font-medium">Board Seat Held</span>
              <span className="text-indigo-300">|</span>
              <span>Board meeting schedule not yet configured</span>
            </div>
          </div>
        )}
      </div>

      {/* Valuation history summary */}
      {a.valuations?.length > 1 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Valuation History
          </h3>
          <div className="space-y-2">
            {a.valuations.slice(0, 5).map((v: any, i: number) => (
              <div
                key={v.id}
                className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 dark:text-gray-500">
                    {v.valuationDate ? formatDate(v.valuationDate) : "---"}
                  </span>
                  {v.method && <Badge color="gray">{v.method.replace(/_/g, " ")}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {fmt(v.fairValue)}
                  </span>
                  {i > 0 && a.valuations[i - 1]?.fairValue != null && (
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        v.fairValue > a.valuations[i - 1].fairValue
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {v.fairValue > a.valuations[i - 1].fairValue ? "+" : ""}
                      {(
                        ((v.fairValue - a.valuations[i - 1].fairValue) /
                          a.valuations[i - 1].fairValue) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
