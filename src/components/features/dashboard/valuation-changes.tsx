"use client";

import useSWR from "swr";
import Link from "next/link";
import { fmt, cn } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface ValuationChange {
  assetId: string;
  name: string;
  currentValue: number;
  previousValue: number;
  delta: number;
  pctChange: number;
  entityName: string | null;
}

export function ValuationChanges() {
  const { data, isLoading } = useSWR<{ changes: ValuationChange[] }>(
    "/api/dashboard/valuation-changes",
    fetcher
  );

  if (isLoading || !data) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-36 mb-2" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const changes = data.changes ?? [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Valuation Changes
        </h3>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
          Latest mark-to-mark movements
        </p>
      </div>

      <div className="p-4">
        {changes.length === 0 ? (
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
            No valuation changes to show
          </div>
        ) : (
          <div className="space-y-1.5">
            {changes.map((c) => {
              const isUp = c.delta > 0;
              return (
                <Link
                  key={c.assetId}
                  href={`/assets/${c.assetId}`}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  {/* Direction arrow */}
                  <span
                    className={cn(
                      "text-sm font-bold flex-shrink-0",
                      isUp ? "text-emerald-500" : "text-red-500"
                    )}
                  >
                    {isUp ? "↑" : "↓"}
                  </span>

                  {/* Name + entity */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                      {c.name}
                    </div>
                    {c.entityName && (
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                        {c.entityName}
                      </div>
                    )}
                  </div>

                  {/* Delta + values */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className={cn(
                        "text-xs font-semibold",
                        isUp
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {isUp ? "+" : ""}
                      {(c.pctChange * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      {fmt(c.previousValue)} → {fmt(c.currentValue)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
