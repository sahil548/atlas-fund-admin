"use client";

import useSWR from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { fmt } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface FundRow {
  entityId: string;
  entityName: string;
  targetSize: number;
  totalCommitted: number;
  hardCommits: number;
  softCommits: number;
  pipeline: number;
  pctClosed: number;
}

interface FundraisingData {
  funds: FundRow[];
  aggregate: {
    totalTarget: number;
    totalCommitted: number;
    totalHardCommits: number;
    totalSoftCommits: number;
    totalPipeline: number;
  };
}

export function FundraisingTracker() {
  const { firmId } = useFirm();
  const { data, isLoading } = useSWR<FundraisingData>(
    `/api/dashboard/fundraising-summary?firmId=${firmId}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 h-24 animate-pulse" />
    );
  }

  if (!data || data.funds.length === 0) {
    return null; // Don't render if no fundraising data
  }

  const { funds, aggregate } = data;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Fundraising</h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Fund close progress</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
            <span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-0.5 align-middle" />
              Committed
            </span>
            <span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-0.5 align-middle" />
              Soft Commit
            </span>
            <span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-300 mr-0.5 align-middle" />
              Pipeline
            </span>
          </div>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {funds.map((fund) => {
            const committedPct = fund.targetSize > 0
              ? Math.min(100, (fund.totalCommitted / fund.targetSize) * 100)
              : 0;
            const softPct = fund.targetSize > 0
              ? Math.min(100 - committedPct, (fund.softCommits / fund.targetSize) * 100)
              : 0;
            const pipelinePct = fund.targetSize > 0
              ? Math.min(100 - committedPct - softPct, (fund.pipeline / fund.targetSize) * 100)
              : 0;

            return (
              <div key={fund.entityId}>
                <div className="flex items-center justify-between mb-1">
                  <a
                    href={`/entities/${fund.entityId}`}
                    className="text-xs font-medium text-gray-800 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 truncate max-w-[60%]"
                  >
                    {fund.entityName}
                  </a>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                    {fmt(fund.targetSize)} target
                  </span>
                </div>

                {/* Stacked bar */}
                <div className="relative h-3.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  {/* Pipeline (blue, widest, behind everything) */}
                  <div
                    className="absolute left-0 top-0 h-full bg-blue-200 dark:bg-blue-800 rounded-full transition-all"
                    style={{ width: `${committedPct + softPct + pipelinePct}%` }}
                  />
                  {/* Soft commits (amber, behind committed) */}
                  <div
                    className="absolute left-0 top-0 h-full bg-amber-400 dark:bg-amber-500 rounded-full transition-all"
                    style={{ width: `${committedPct + softPct}%` }}
                  />
                  {/* Committed (green, front) */}
                  <div
                    className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${committedPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {fmt(fund.totalCommitted)} committed
                  </span>
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    {fund.pctClosed.toFixed(0)}% closed
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Aggregate footer */}
        {funds.length > 1 && (
          <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-[10px] text-gray-500 dark:text-gray-400">
            <span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{fmt(aggregate.totalTarget)}</span> target
            </span>
            <span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{fmt(aggregate.totalCommitted)}</span> committed
            </span>
            {aggregate.totalSoftCommits > 0 && (
              <span>
                <span className="font-medium text-amber-600 dark:text-amber-400">{fmt(aggregate.totalSoftCommits)}</span> soft
              </span>
            )}
            {aggregate.totalPipeline > 0 && (
              <span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{fmt(aggregate.totalPipeline)}</span> pipeline
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
