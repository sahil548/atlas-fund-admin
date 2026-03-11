"use client";

import { useState } from "react";
import { SectionPanel } from "@/components/ui/section-panel";
import { fmt } from "@/lib/utils";

interface AssetAmount {
  assetName: string;
  amount: number;
}

interface PeriodData {
  period: string; // "2026-03"
  total: number;
  byAsset: Record<string, AssetAmount>;
}

interface EntityPeriodBreakdownProps {
  periodBreakdown: PeriodData[];
}

type ViewMode = "monthly" | "quarterly";

function getQuarter(period: string): string {
  // period = "2026-03" -> "Q1 2026"
  const [year, month] = period.split("-");
  const m = parseInt(month, 10);
  const q = Math.ceil(m / 3);
  return `Q${q} ${year}`;
}

function aggregateToQuarterly(periods: PeriodData[]): PeriodData[] {
  const quarterMap: Record<string, PeriodData> = {};

  for (const p of periods) {
    const qKey = getQuarter(p.period);
    if (!quarterMap[qKey]) {
      quarterMap[qKey] = { period: qKey, total: 0, byAsset: {} };
    }
    quarterMap[qKey].total += p.total;

    for (const [assetKey, assetData] of Object.entries(p.byAsset)) {
      if (!quarterMap[qKey].byAsset[assetKey]) {
        quarterMap[qKey].byAsset[assetKey] = { assetName: assetData.assetName, amount: 0 };
      }
      quarterMap[qKey].byAsset[assetKey].amount += assetData.amount;
    }
  }

  // Sort quarterly data most-recent first
  return Object.values(quarterMap).sort((a, b) => {
    // Compare by period label, e.g. "Q1 2026" vs "Q4 2025"
    // Extract year and quarter for comparison
    const parseQ = (s: string) => {
      const [q, y] = s.split(" ");
      return parseInt(y, 10) * 10 + parseInt(q.replace("Q", ""), 10);
    };
    return parseQ(b.period) - parseQ(a.period);
  });
}

export function EntityPeriodBreakdown({ periodBreakdown }: EntityPeriodBreakdownProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

  if (!periodBreakdown || periodBreakdown.length === 0) {
    return (
      <SectionPanel title="Income by Period">
        <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
          No income data recorded yet
        </div>
      </SectionPanel>
    );
  }

  const displayData =
    viewMode === "monthly" ? periodBreakdown : aggregateToQuarterly(periodBreakdown);

  function formatPeriodLabel(period: string): string {
    if (viewMode === "quarterly") return period; // Already formatted as "Q1 2026"
    // "2026-03" -> "Mar 2026"
    const [year, month] = period.split("-");
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  const headerRight = (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
      <button
        onClick={() => setViewMode("monthly")}
        className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
          viewMode === "monthly"
            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        }`}
      >
        Monthly
      </button>
      <button
        onClick={() => setViewMode("quarterly")}
        className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
          viewMode === "quarterly"
            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        }`}
      >
        Quarterly
      </button>
    </div>
  );

  return (
    <SectionPanel title="Income by Period" headerRight={headerRight} noPadding>
      <div className="overflow-hidden rounded-b-xl">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">
                Period
              </th>
              <th className="text-right px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-300">
                Total Income
              </th>
              <th className="w-8 px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {displayData.map((row) => (
              <>
                <tr
                  key={row.period}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() =>
                    setExpandedPeriod(expandedPeriod === row.period ? null : row.period)
                  }
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                    {formatPeriodLabel(row.period)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-gray-100">
                    {fmt(row.total)}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <svg
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform inline-block ${
                        expandedPeriod === row.period ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </td>
                </tr>

                {/* Expanded asset breakdown */}
                {expandedPeriod === row.period && (
                  <tr key={`${row.period}-detail`}>
                    <td colSpan={3} className="px-0 py-0">
                      <div className="bg-gray-50 dark:bg-gray-800 border-t border-b border-gray-100 dark:border-gray-700">
                        <div className="px-6 py-2">
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-semibold mb-2 tracking-wide">
                            By Asset
                          </div>
                          <div className="space-y-1.5">
                            {Object.entries(row.byAsset).map(([key, asset]) => {
                              const pct =
                                row.total > 0
                                  ? ((asset.amount / row.total) * 100).toFixed(1)
                                  : "0.0";
                              return (
                                <div
                                  key={key}
                                  className="flex items-center justify-between gap-4"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                                      {asset.assetName}
                                    </span>
                                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden min-w-[40px]">
                                      <div
                                        className="h-1.5 bg-indigo-400 dark:bg-indigo-500 rounded-full"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 w-10 text-right flex-shrink-0">
                                      {pct}%
                                    </span>
                                  </div>
                                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100 flex-shrink-0">
                                    {fmt(asset.amount)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </SectionPanel>
  );
}
