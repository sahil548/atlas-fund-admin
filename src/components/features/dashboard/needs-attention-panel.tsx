"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [expanded, setExpanded] = useState(false);
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

  if (isLoading) return null;

  // All clear — show compact green ribbon
  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
        <span className="text-xs text-emerald-700 dark:text-emerald-400">All clear — no items need attention</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
      {/* Clickable header ribbon */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Needs Attention
          </span>
          <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[10px] font-bold">
            {alerts.length}
          </span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            {alerts.length === 1
              ? "1 item needs attention"
              : `${alerts.length} items need attention`}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Expanded alert list */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {visibleAlerts.map((alert, idx) => (
            <div
              key={`${alert.type}-${alert.id}-${idx}`}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              {/* Severity dot */}
              <span
                className={cn(
                  "flex-shrink-0 w-2 h-2 rounded-full",
                  alert.severity === "high" ? "bg-red-500" : "bg-amber-400",
                )}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <Link
                  href={alert.linkPath}
                  className="text-xs font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block"
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
                    timeZone: "UTC",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Show all link */}
          {hasMore && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
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
