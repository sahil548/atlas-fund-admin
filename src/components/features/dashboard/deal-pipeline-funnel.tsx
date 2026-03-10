"use client";

import Link from "next/link";
import useSWR from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { fmt } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface StageConfig {
  stage: string;
  label: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  borderLight: string;
  borderDark: string;
}

const STAGE_CONFIGS: StageConfig[] = [
  {
    stage: "SCREENING",
    label: "Screening",
    bgLight: "bg-blue-100",
    bgDark: "dark:bg-blue-900/40",
    textLight: "text-blue-800",
    textDark: "dark:text-blue-300",
    borderLight: "border-blue-200",
    borderDark: "dark:border-blue-700",
  },
  {
    stage: "DUE_DILIGENCE",
    label: "Due Diligence",
    bgLight: "bg-indigo-100",
    bgDark: "dark:bg-indigo-900/40",
    textLight: "text-indigo-800",
    textDark: "dark:text-indigo-300",
    borderLight: "border-indigo-200",
    borderDark: "dark:border-indigo-700",
  },
  {
    stage: "IC_REVIEW",
    label: "IC Review",
    bgLight: "bg-purple-100",
    bgDark: "dark:bg-purple-900/40",
    textLight: "text-purple-800",
    textDark: "dark:text-purple-300",
    borderLight: "border-purple-200",
    borderDark: "dark:border-purple-700",
  },
  {
    stage: "CLOSING",
    label: "Closing",
    bgLight: "bg-emerald-100",
    bgDark: "dark:bg-emerald-900/40",
    textLight: "text-emerald-800",
    textDark: "dark:text-emerald-300",
    borderLight: "border-emerald-200",
    borderDark: "dark:border-emerald-700",
  },
];

export function DealPipelineFunnel() {
  const { firmId } = useFirm();

  const { data, isLoading } = useSWR(
    `/api/dashboard/pipeline-summary?firmId=${firmId}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32 mb-3" />
        <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  const stages: any[] = data?.stages ?? [];

  // Map API data to config — find count/value for each configured stage
  const stageData = STAGE_CONFIGS.map((config) => {
    const apiStage = stages.find((s: any) => s.stage === config.stage);
    return {
      ...config,
      count: apiStage?.count ?? 0,
      totalValue: apiStage?.totalValue ?? 0,
    };
  });

  const totalCount = stageData.reduce((sum, s) => sum + s.count, 0);
  const allEmpty = totalCount === 0;

  // Compute proportional widths — minimum 20% so labels are always readable
  const MIN_PCT = 20;
  const computeWidth = (count: number) => {
    if (allEmpty) return 25; // equal distribution when all zero
    if (totalCount === 0) return 25;
    const raw = (count / totalCount) * 100;
    return Math.max(raw, MIN_PCT);
  };

  // Normalize so they sum to 100%
  const rawWidths = stageData.map((s) => computeWidth(s.count));
  const rawSum = rawWidths.reduce((a, b) => a + b, 0);
  const widths = rawWidths.map((w) => (w / rawSum) * 100);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Deal Pipeline
        </h3>
      </div>

      {/* Funnel */}
      <div className="px-5 py-4">
        {allEmpty ? (
          <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            No active deals in pipeline
          </div>
        ) : (
          <div className="flex items-stretch gap-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {stageData.map((stage, i) => (
              <div
                key={stage.stage}
                className="flex items-stretch"
                style={{ width: `${widths[i]}%` }}
              >
                {/* Stage segment */}
                <Link
                  href={`/deals?stage=${stage.stage}`}
                  className={`
                    flex flex-col items-center justify-center px-2 py-3 w-full
                    ${stage.bgLight} ${stage.bgDark}
                    ${stage.textLight} ${stage.textDark}
                    hover:brightness-95 transition-all
                  `}
                >
                  <div className="text-[10px] font-medium truncate w-full text-center">
                    {stage.label}
                  </div>
                  <div className="text-lg font-bold leading-tight">
                    {stage.count}
                  </div>
                  {stage.totalValue > 0 && (
                    <div className="text-[10px] opacity-80">
                      {fmt(stage.totalValue)}
                    </div>
                  )}
                </Link>

                {/* Chevron connector between stages (not on last) */}
                {i < stageData.length - 1 && (
                  <div
                    className={`
                      flex-shrink-0 flex items-center justify-center w-4
                      ${stage.bgLight} ${stage.bgDark}
                      ${stage.textLight} ${stage.textDark}
                    `}
                  >
                    <svg
                      viewBox="0 0 8 24"
                      fill="currentColor"
                      className="h-full w-3 opacity-50"
                    >
                      <path d="M0 0 L8 12 L0 24 Z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
