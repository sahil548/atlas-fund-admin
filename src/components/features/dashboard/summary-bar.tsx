"use client";

import useSWR from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { fmt, pct } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

export function SummaryBar() {
  const { firmId } = useFirm();

  const { data: stats, isLoading: statsLoading } = useSWR(
    `/api/dashboard/stats?firmId=${firmId}`,
    fetcher
  );
  const { data: entityCards, isLoading: cardsLoading } = useSWR(
    `/api/dashboard/entity-cards?firmId=${firmId}`,
    fetcher
  );

  const isLoading = statsLoading || cardsLoading;

  // Compute aggregate dry powder from entity cards
  const dryPowder: number = Array.isArray(entityCards)
    ? entityCards.reduce((sum: number, e: any) => sum + (e.dryPowder ?? 0), 0)
    : 0;

  const totalNAV: number = stats?.totalNAV ?? 0;
  const irr: number | null =
    stats?.performanceMetrics?.weightedIRR ?? null;
  const tvpi: number | null = stats?.performanceMetrics?.tvpi ?? null;
  const dpi: number | null = stats?.performanceMetrics?.dpi ?? null;
  // Compute deployed % from entity cards
  const totalCommitted: number = Array.isArray(entityCards)
    ? entityCards.reduce((sum: number, e: any) => sum + (e.totalCommitted ?? 0), 0)
    : 0;
  const totalDeployed: number = Array.isArray(entityCards)
    ? entityCards.reduce((sum: number, e: any) => sum + (e.capitalDeployed ?? 0), 0)
    : 0;
  const deployedPct = totalCommitted > 0 ? totalDeployed / totalCommitted : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2.5 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-1 space-y-2">
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16" />
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20" />
          </div>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: "Total NAV",
      value: fmt(totalNAV),
      colorClass: "text-gray-900 dark:text-gray-100",
    },
    {
      label: "Portfolio IRR",
      value: irr != null ? pct(irr) : "N/A",
      colorClass:
        irr == null
          ? "text-gray-400"
          : irr >= 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
    },
    {
      label: "TVPI",
      value: tvpi != null ? `${tvpi.toFixed(2)}x` : "N/A",
      colorClass:
        tvpi == null ? "text-gray-400" : "text-gray-900 dark:text-gray-100",
    },
    {
      label: "DPI",
      value: dpi != null ? `${dpi.toFixed(2)}x` : "N/A",
      colorClass:
        dpi == null ? "text-gray-400" : "text-gray-900 dark:text-gray-100",
    },
    {
      label: "Deployed",
      value: pct(deployedPct),
      colorClass: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Dry Powder",
      value: fmt(dryPowder),
      colorClass: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2.5 gap-4">
      {metrics.map((metric, i) => (
        <div key={i} className="flex-1 min-w-0">
          <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">
            {metric.label}
          </div>
          <div className={`text-lg font-bold truncate ${metric.colorClass}`}>
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
}
