"use client";

import { SectionPanel } from "@/components/ui/section-panel";
import { fmt, pct } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface EntityFinancialSummaryCardProps {
  metricsData: any;
}

function MetricValue({
  value,
  isNull,
}: {
  value: string;
  isNull: boolean;
}) {
  if (isNull) {
    return <span className="text-gray-400 dark:text-gray-500">--</span>;
  }
  return <span>{value}</span>;
}

function formatMultiple(v: number | null | undefined): { display: string; isNull: boolean } {
  if (v == null) return { display: "--", isNull: true };
  return { display: `${v.toFixed(2)}x`, isNull: false };
}

function formatPercent(v: number | null | undefined): { display: string; isNull: boolean } {
  if (v == null) return { display: "--", isNull: true };
  return { display: pct(v), isNull: false };
}

function formatDollar(v: number | null | undefined): { display: string; isNull: boolean } {
  if (v == null) return { display: "--", isNull: true };
  return { display: fmt(v), isNull: false };
}

export function EntityFinancialSummaryCard({ metricsData }: EntityFinancialSummaryCardProps) {
  const summary = metricsData?.summary;
  const realized = metricsData?.realized;
  const unrealized = metricsData?.unrealized;

  const realizedMetrics = [
    {
      label: "Net IRR",
      ...formatPercent(realized?.netIrr),
    },
    {
      label: "TVPI",
      ...formatMultiple(realized?.tvpi),
    },
    {
      label: "DPI",
      ...formatMultiple(realized?.dpi),
    },
    {
      label: "RVPI",
      ...formatMultiple(realized?.rvpi),
    },
  ];

  const unrealizedMetrics = [
    {
      label: "Gross IRR",
      ...formatPercent(unrealized?.grossIrr),
    },
    {
      label: "Portfolio MOIC",
      ...formatMultiple(unrealized?.portfolioMoic),
    },
  ];

  const summaryMetrics = [
    {
      label: "Total Called",
      ...formatDollar(summary?.totalCalled),
    },
    {
      label: "Total Distributed",
      ...formatDollar(summary?.totalDistributed),
    },
    {
      label: "Unrealized Value",
      ...formatDollar(summary?.unrealizedValue),
    },
    {
      label: "Gross IRR",
      ...formatPercent(summary?.grossIrr),
    },
    {
      label: "Net IRR",
      ...formatPercent(summary?.netIrr),
    },
    {
      label: "TVPI",
      ...formatMultiple(summary?.tvpi),
    },
    {
      label: "DPI",
      ...formatMultiple(summary?.dpi),
    },
    {
      label: "RVPI",
      ...formatMultiple(summary?.rvpi),
    },
  ];

  return (
    <SectionPanel title="Financial Summary">
      {/* Dual metric view: Realized vs Unrealized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Realized Returns */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
          <div className="mb-3">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Realized Returns
            </div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              From capital flows
            </div>
          </div>
          <div className="space-y-2.5">
            {realizedMetrics.map((m) => (
              <div key={m.label} className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">{m.label}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <MetricValue value={m.display} isNull={m.isNull} />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Unrealized Returns */}
        <div className="bg-indigo-50 dark:bg-indigo-950 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800">
          <div className="mb-3">
            <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              Unrealized Returns
            </div>
            <div className="text-[10px] text-indigo-400 dark:text-indigo-500 mt-0.5">
              From current valuations
            </div>
          </div>
          <div className="space-y-2.5">
            {unrealizedMetrics.map((m) => (
              <div key={m.label} className="flex items-center justify-between">
                <span className="text-xs text-indigo-600 dark:text-indigo-400">{m.label}</span>
                <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                  <MetricValue value={m.display} isNull={m.isNull} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary metrics grid — all 8 key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
        {summaryMetrics.map((m) => (
          <div
            key={m.label}
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 p-3"
          >
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide">
              {m.label}
            </div>
            <div className="text-base font-bold mt-1 text-gray-900 dark:text-gray-100">
              <MetricValue value={m.display} isNull={m.isNull} />
            </div>
          </div>
        ))}
      </div>
    </SectionPanel>
  );
}
