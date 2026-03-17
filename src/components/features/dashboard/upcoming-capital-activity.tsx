"use client";

import useSWR from "swr";
import Link from "next/link";
import { fmt, formatDate, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface UpcomingItem {
  type: "call" | "distribution";
  id: string;
  label: string;
  entityName: string;
  amount: number;
  date: string;
  status: string;
  daysUntil: number;
}

function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyColor(days: number): string {
  if (days < 0) return "text-red-600 dark:text-red-400";
  if (days <= 7) return "text-amber-600 dark:text-amber-400";
  if (days <= 14) return "text-yellow-600 dark:text-yellow-400";
  return "text-gray-500 dark:text-gray-400";
}

function urgencyLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days}d`;
}

export function UpcomingCapitalActivity() {
  const { data: callsData, isLoading: callsLoading } = useSWR("/api/capital-calls", fetcher);
  const { data: distsData, isLoading: distsLoading } = useSWR("/api/distributions", fetcher);

  const isLoading = callsLoading || distsLoading;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 h-full">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-40 mb-2" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const calls: any[] = Array.isArray(callsData) ? callsData : [];
  const dists: any[] = Array.isArray(distsData) ? distsData : [];

  // Pending/upcoming capital calls (not yet fully funded)
  const pendingCalls: UpcomingItem[] = calls
    .filter((c: any) => ["DRAFT", "ISSUED", "PARTIALLY_FUNDED"].includes(c.status))
    .map((c: any) => ({
      type: "call" as const,
      id: c.id,
      label: c.callNumber || "Capital Call",
      entityName: c.entity?.name ?? "Unknown",
      amount: c.amount,
      date: c.dueDate,
      status: c.status,
      daysUntil: getDaysUntil(c.dueDate),
    }));

  // Pending distributions
  const pendingDists: UpcomingItem[] = dists
    .filter((d: any) => ["DRAFT", "APPROVED"].includes(d.status))
    .map((d: any) => ({
      type: "distribution" as const,
      id: d.id,
      label: "Distribution",
      entityName: d.entity?.name ?? "Unknown",
      amount: d.grossAmount,
      date: d.distributionDate,
      status: d.status,
      daysUntil: getDaysUntil(d.distributionDate),
    }));

  // Combine and sort: overdue first, then by soonest
  const items = [...pendingCalls, ...pendingDists].sort((a, b) => a.daysUntil - b.daysUntil);

  const totalCallsPending = pendingCalls.reduce((s, c) => s + c.amount, 0);
  const totalDistsPending = pendingDists.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex flex-col">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Upcoming Capital Activity
        </h3>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
          Pending calls &amp; distributions
        </p>
      </div>

      {/* Summary row */}
      <div className="flex gap-3 mb-2">
        <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          <div className="text-[10px] text-red-600 dark:text-red-400 font-medium">Calls Due</div>
          <div className="text-sm font-bold text-red-700 dark:text-red-300">
            {totalCallsPending > 0 ? fmt(totalCallsPending) : "—"}
          </div>
          <div className="text-[10px] text-red-500 dark:text-red-400">
            {pendingCalls.length} pending
          </div>
        </div>
        <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Distributions</div>
          <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {totalDistsPending > 0 ? fmt(totalDistsPending) : "—"}
          </div>
          <div className="text-[10px] text-emerald-500 dark:text-emerald-400">
            {pendingDists.length} pending
          </div>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {items.length === 0 ? (
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
            No pending capital activity
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={
                item.type === "call"
                  ? `/transactions/capital-calls/${item.id}`
                  : `/transactions/distributions/${item.id}`
              }
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
            >
              {/* Type indicator */}
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  item.type === "call"
                    ? "bg-red-500"
                    : "bg-emerald-500"
                )}
              />
              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.entityName}
                  </span>
                  <Badge color={item.type === "call" ? "red" : "green"}>
                    {item.type === "call" ? "Call" : "Dist"}
                  </Badge>
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  {item.label} · {formatDate(item.date)}
                </div>
              </div>
              {/* Amount */}
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {fmt(item.amount)}
                </div>
                <div className={cn("text-[10px] font-medium", urgencyColor(item.daysUntil))}>
                  {urgencyLabel(item.daysUntil)}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
