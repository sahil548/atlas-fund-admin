"use client";

import useSWR from "swr";
import Link from "next/link";
import { useFirm } from "@/components/providers/firm-provider";
import { fmt, cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const BAR_COLORS = [
  "bg-indigo-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
];

export function ConcentrationRisk() {
  const { firmId } = useFirm();
  const { data: stats, isLoading } = useSWR(
    `/api/dashboard/stats?firmId=${firmId}`,
    fetcher
  );

  if (isLoading || !stats) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32 mb-2" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const topAssets: any[] = Array.isArray(stats.topAssets) ? stats.topAssets : [];
  const totalNAV: number = stats.totalNAV || stats.totalFV || 1;
  const topFiveTotal = topAssets.reduce((s: number, a: any) => s + (a.fairValue ?? 0), 0);
  const concentrationPct = totalNAV > 0 ? (topFiveTotal / totalNAV) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Top Holdings
          </h3>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
            Concentration by fair value
          </p>
        </div>
        <div className="text-right">
          <div className={cn(
            "text-sm font-bold",
            concentrationPct > 80 ? "text-red-600 dark:text-red-400" :
            concentrationPct > 60 ? "text-amber-600 dark:text-amber-400" :
            "text-gray-900 dark:text-gray-100"
          )}>
            {concentrationPct.toFixed(0)}%
          </div>
          <div className="text-[10px] text-gray-400">of NAV</div>
        </div>
      </div>

      {topAssets.length === 0 ? (
        <div className="text-xs text-gray-400 text-center py-4">No assets</div>
      ) : (
        <div className="space-y-2">
          {topAssets.map((asset: any, i: number) => {
            const pctOfNav = totalNAV > 0 ? (asset.fairValue / totalNAV) * 100 : 0;
            return (
              <Link
                key={asset.id}
                href={`/assets/${asset.id}`}
                className="block group"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {asset.name}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {fmt(asset.fairValue)}
                    </span>
                    <span className={cn(
                      "text-[10px] font-semibold min-w-[32px] text-right",
                      pctOfNav > 25 ? "text-red-600 dark:text-red-400" :
                      pctOfNav > 15 ? "text-amber-600 dark:text-amber-400" :
                      "text-gray-600 dark:text-gray-300"
                    )}>
                      {pctOfNav.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", BAR_COLORS[i % BAR_COLORS.length])}
                    style={{ width: `${Math.min(pctOfNav, 100)}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
