"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { cn, fmt } from "@/lib/utils";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface MetricPoint {
  period: string;
  irr: number | null;
  tvpi: number | null;
  dpi: number | null;
  rvpi: number | null;
  nav: number | null;
}

interface PerformanceChartsProps {
  investorId: string;
}

function formatMultiple(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toFixed(2)}x`;
}

function formatIRR(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export function PerformanceCharts({ investorId }: PerformanceChartsProps) {
  const [granularity, setGranularity] = useState<"quarterly" | "monthly">("quarterly");

  const { data, isLoading } = useSWR<MetricPoint[]>(
    `/api/lp/${investorId}/metrics-history?granularity=${granularity}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold dark:text-gray-100 mb-3">Performance History</h3>
        <div className="text-sm text-gray-400 dark:text-gray-500">Loading performance history...</div>
      </div>
    );
  }

  const hasData = data && data.length > 0;

  // Transform IRR to percentage for display on chart
  const chartData = hasData
    ? data.map((d) => ({
        ...d,
        irrPct: d.irr != null ? d.irr * 100 : null,
      }))
    : [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold dark:text-gray-100">Performance History</h3>
        <div className="flex gap-1">
          {(["quarterly", "monthly"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                granularity === g
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {g === "quarterly" ? "Quarterly" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
          <div className="font-medium text-gray-500 dark:text-gray-400 mb-1">No performance history yet</div>
          <div className="text-xs max-w-sm mx-auto">
            Performance charts will appear once metrics are computed over multiple periods. Each time
            you visit this page, a data point is recorded.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 1: Return Metrics */}
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Return Metrics
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}x`}
                  yAxisId="multiple"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  orientation="right"
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  yAxisId="irr"
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => {
                    const v = typeof value === "number" ? value : null;
                    if (name === "IRR") return [formatIRR(v != null ? v / 100 : null), name];
                    return [formatMultiple(v), name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  yAxisId="irr"
                  type="monotone"
                  dataKey="irrPct"
                  name="IRR"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
                <Line
                  yAxisId="multiple"
                  type="monotone"
                  dataKey="tvpi"
                  name="TVPI"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
                <Line
                  yAxisId="multiple"
                  type="monotone"
                  dataKey="dpi"
                  name="DPI"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
                <Line
                  yAxisId="multiple"
                  type="monotone"
                  dataKey="rvpi"
                  name="RVPI"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Panel 2: NAV Over Time */}
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              NAV Over Time
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => fmt(v)}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [
                    typeof value === "number" ? fmt(value) : "—",
                    "NAV",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="nav"
                  name="NAV"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#navGradient)"
                  dot={{ r: 3 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
