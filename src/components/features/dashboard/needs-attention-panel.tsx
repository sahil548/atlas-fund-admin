"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { CheckCircle } from "lucide-react";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface AlertItem {
  id: string;
  type: string;
  severity: "high" | "medium";
  title: string;
  description?: string;
  linkPath: string;
  entityName?: string;
  date?: string;
}

const MAX_VISIBLE = 10;

export function NeedsAttentionPanel() {
  const { firmId } = useFirm();
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading } = useSWR(
    `/api/dashboard/alerts?firmId=${firmId}`,
    fetcher
  );

  const alerts: AlertItem[] = data?.alerts ?? [];

  // Group by severity — high first, then medium
  const sorted = [
    ...alerts.filter((a) => a.severity === "high"),
    ...alerts.filter((a) => a.severity === "medium"),
  ];

  const visibleAlerts = showAll ? sorted : sorted.slice(0, MAX_VISIBLE);
  const hasMore = sorted.length > MAX_VISIBLE;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-36 mb-3" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Needs Attention
          </h3>
          {alerts.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[10px] font-bold">
              {alerts.length}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      {alerts.length === 0 ? (
        <div className="flex items-center gap-2 px-5 py-4 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>All clear — no items need attention</span>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {visibleAlerts.map((alert, idx) => (
            <div
              key={`${alert.type}-${alert.id}-${idx}`}
              className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              {/* Severity dot */}
              <span
                className={`flex-shrink-0 w-2 h-2 rounded-full ${
                  alert.severity === "high"
                    ? "bg-red-500"
                    : "bg-amber-400"
                }`}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <Link
                  href={alert.linkPath}
                  className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block"
                >
                  {alert.title}
                </Link>
                {alert.entityName && (
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {alert.entityName}
                  </div>
                )}
              </div>

              {/* Date */}
              {alert.date && (
                <div className="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                  {new Date(alert.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Show all link */}
          {hasMore && (
            <div className="px-5 py-2.5 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
              >
                {showAll
                  ? "Show fewer"
                  : `Show all ${sorted.length} items`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
