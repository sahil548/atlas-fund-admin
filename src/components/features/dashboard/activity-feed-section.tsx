"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useFirm } from "@/components/providers/firm-provider";
import { cn } from "@/lib/utils";
import type { ActivityItem, ActivityType } from "@/lib/activity-feed-helpers";

// ── Fetcher ────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

// ── Activity type configuration ────────────────────────────────

interface TypeChip {
  label: string;
  value: ActivityType | "ALL";
  icon: string;
  color: string;
}

const TYPE_CHIPS: TypeChip[] = [
  { label: "All", value: "ALL", icon: "★", color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
  { label: "Deals", value: "DEAL_ACTIVITY", icon: "D", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  { label: "Capital Calls", value: "CAPITAL_CALL", icon: "$", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" },
  { label: "Distributions", value: "DISTRIBUTION", icon: "→", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  { label: "Meetings", value: "MEETING", icon: "M", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  { label: "Tasks", value: "TASK", icon: "T", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  { label: "Documents", value: "DOCUMENT", icon: "F", color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
  { label: "Entity Changes", value: "ENTITY_CHANGE", icon: "E", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
];

const ICON_CONFIG: Record<ActivityType, { icon: string; color: string }> = {
  DEAL_ACTIVITY: { icon: "D", color: "bg-blue-100 text-blue-700" },
  CAPITAL_CALL:  { icon: "$", color: "bg-indigo-100 text-indigo-700" },
  DISTRIBUTION:  { icon: "→", color: "bg-emerald-100 text-emerald-700" },
  MEETING:       { icon: "M", color: "bg-purple-100 text-purple-700" },
  TASK:          { icon: "T", color: "bg-amber-100 text-amber-700" },
  DOCUMENT:      { icon: "F", color: "bg-gray-100 text-gray-600" },
  ENTITY_CHANGE: { icon: "E", color: "bg-orange-100 text-orange-700" },
};

// ── Relative time ──────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(dateStr),
  );
}

// ── Skeleton ────────────────────────────────────────────────────

function ActivitySkeleton() {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-12" />
        </div>
      ))}
    </div>
  );
}

// ── ActivityFeedSection ────────────────────────────────────────

const PAGE_SIZE = 20;

export function ActivityFeedSection() {
  const { firmId } = useFirm();

  // Filter state
  const [activeTypes, setActiveTypes] = useState<Set<ActivityType>>(new Set());
  const [filterEntityId, setFilterEntityId] = useState<string>("");

  // Pagination state — accumulated items across multiple loads
  const [offset, setOffset] = useState(0);
  const [allItems, setAllItems] = useState<ActivityItem[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);

  // Build query URL
  const typesParam = [...activeTypes].join(",");
  const activityKey =
    `/api/activity?firmId=${firmId}` +
    `&entityId=${filterEntityId}` +
    `&types=${typesParam}` +
    `&limit=${PAGE_SIZE}` +
    `&offset=${offset}`;

  // Entities dropdown
  const { data: entitiesData } = useSWR<{ data: { id: string; name: string }[] }>(
    `/api/entities?firmId=${firmId}`,
    fetcher,
  );

  // Activity feed
  const { data: activityData, isLoading } = useSWR<{
    items: ActivityItem[];
    total: number;
    hasMore: boolean;
  }>(activityKey, fetcher, {
    onSuccess(data) {
      if (offset === 0) {
        // Reset on filter change
        setAllItems(data.items);
      } else {
        // Append on load-more
        setAllItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const newItems = data.items.filter((i) => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      }
      setLoadedOnce(true);
    },
  });

  // ── Type chip toggle ─────────────────────────────────────────

  const handleTypeToggle = useCallback(
    (value: ActivityType | "ALL") => {
      setOffset(0);
      setLoadedOnce(false);
      if (value === "ALL") {
        setActiveTypes(new Set());
      } else {
        setActiveTypes((prev) => {
          const next = new Set(prev);
          if (next.has(value)) {
            next.delete(value);
          } else {
            next.add(value);
          }
          return next;
        });
      }
    },
    [],
  );

  // ── Entity dropdown ──────────────────────────────────────────

  const handleEntityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterEntityId(e.target.value);
    setOffset(0);
    setLoadedOnce(false);
  }, []);

  // ── Load more ────────────────────────────────────────────────

  const handleLoadMore = useCallback(() => {
    setOffset((prev) => prev + PAGE_SIZE);
  }, []);

  const hasMore = activityData?.hasMore ?? false;
  const displayItems = loadedOnce ? allItems : activityData?.items ?? [];

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Activity Feed
        </h3>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
          Firm-wide activity stream — last 30 days
        </p>
      </div>

      {/* Filter bar */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-50 dark:border-gray-800">
        {/* Type chip toggles + entity dropdown in one row */}
        <div className="flex flex-wrap items-center gap-2">
          {TYPE_CHIPS.map((chip) => {
            const isAll = chip.value === "ALL";
            const isActive = isAll
              ? activeTypes.size === 0
              : activeTypes.has(chip.value as ActivityType);

            return (
              <button
                key={chip.value}
                onClick={() => handleTypeToggle(chip.value)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                  isActive
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-700"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
                )}
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold",
                    isActive ? chip.color : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
                  )}
                >
                  {chip.icon}
                </span>
                {chip.label}
              </button>
            );
          })}

          {/* Entity dropdown — right-aligned via ml-auto */}
          <select
            value={filterEntityId}
            onChange={handleEntityChange}
            className="ml-auto text-[11px] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          >
            <option value="">All Entities</option>
            {entitiesData?.data?.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity list */}
      {isLoading && !loadedOnce ? (
        <ActivitySkeleton />
      ) : displayItems.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-gray-400 dark:text-gray-600">
          No activity to show
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {displayItems.map((activity) => {
            const config = ICON_CONFIG[activity.type] ?? {
              icon: "?",
              color: "bg-gray-100 text-gray-600",
            };

            return (
              <div key={activity.id} className="flex items-start gap-3 px-4 py-3">
                {/* Type icon */}
                <div
                  className={cn(
                    "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                    config.color,
                  )}
                >
                  {config.icon}
                </div>

                {/* Description + entity name */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                    {activity.description}
                  </p>
                  {activity.entityName && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                      {activity.entityName}
                    </p>
                  )}
                </div>

                {/* Time + view link */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {timeAgo(activity.date)}
                  </span>
                  <Link
                    href={activity.linkPath}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200"
                  >
                    View
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="px-4 py-3 border-t border-gray-50 dark:border-gray-800">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="w-full text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 font-medium py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Load 20 more"}
          </button>
        </div>
      )}
    </div>
  );
}
