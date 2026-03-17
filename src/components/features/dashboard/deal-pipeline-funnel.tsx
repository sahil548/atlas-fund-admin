"use client";

import Link from "next/link";
import useSWR from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const STAGES = [
  { stage: "SCREENING", label: "Screening", bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-700" },
  { stage: "DUE_DILIGENCE", label: "Due Diligence", bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-700" },
  { stage: "IC_REVIEW", label: "IC Review", bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-700" },
  { stage: "CLOSING", label: "Closing", bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-700" },
];

export function DealPipelineFunnel() {
  const { firmId } = useFirm();
  const { data, isLoading } = useSWR(
    `/api/dashboard/pipeline-summary?firmId=${firmId}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Pipeline</span>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-7 w-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const stages: any[] = data?.stages ?? [];
  const totalDeals = stages.reduce((s: number, st: any) => s + (st.count ?? 0), 0);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mr-1">
        Pipeline
      </span>
      {STAGES.map((config) => {
        const apiStage = stages.find((s: any) => s.stage === config.stage);
        const count = apiStage?.count ?? 0;
        return (
          <Link
            key={config.stage}
            href={`/deals?stage=${config.stage}`}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:brightness-95",
              config.bg, config.text, config.border
            )}
          >
            <span>{config.label}</span>
            <span className="font-bold">{count}</span>
          </Link>
        );
      })}
      <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">
        {totalDeals} active
      </span>
    </div>
  );
}
