"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fmt, cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface CumData {
  label: string;
  cumCalls: number;
  cumDists: number;
  cumNet: number;
  // raw quarter index for filtering
  qIndex: number;
}

type RangePreset = "1Y" | "3Y" | "5Y" | "ALL";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function CashFlowTrend() {
  const [range, setRange] = useState<RangePreset>("ALL");

  const { data, isLoading } = useSWR<{ cumulative: CumData[] }>(
    "/api/dashboard/cash-flow-trend",
    fetcher
  );

  // Filter cumulative data based on range
  const { filtered, latest } = useMemo(() => {
    const cum = data?.cumulative ?? [];
    if (cum.length === 0) return { filtered: [], latest: null };

    const total = cum.length;
    let startIdx = 0;

    if (range === "1Y") startIdx = Math.max(0, total - 4);
    else if (range === "3Y") startIdx = Math.max(0, total - 12);
    else if (range === "5Y") startIdx = Math.max(0, total - 20);
    // ALL: startIdx = 0

    const sliced = cum.slice(startIdx);
    return {
      filtered: sliced,
      latest: sliced.length > 0 ? sliced[sliced.length - 1] : null,
    };
  }, [data, range]);

  if (isLoading || !data) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-40 mb-2" />
        <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    );
  }

  const hasData = filtered.some((m) => m.cumCalls > 0 || m.cumDists > 0);
  const delta = latest ? latest.cumCalls - latest.cumDists : 0;

  const presets: RangePreset[] = ["1Y", "3Y", "5Y", "ALL"];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Cumulative Cash Flow
          </h3>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
            Calls vs distributions by quarter
          </p>
        </div>
        {latest && (
          <div className="flex gap-3 text-right">
            <div>
              <div className="text-[9px] uppercase text-gray-400">Called</div>
              <div className="text-xs font-semibold text-red-500">{fmt(latest.cumCalls)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase text-gray-400">Returned</div>
              <div className="text-xs font-semibold text-emerald-500">{fmt(latest.cumDists)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase text-gray-400">Net Out</div>
              <div className="text-xs font-semibold text-indigo-500">{fmt(delta)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Range presets */}
      <div className="flex gap-1 mb-2">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => setRange(p)}
            className={cn(
              "px-2 py-0.5 text-[10px] font-medium rounded",
              range === p
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            )}
          >
            {p === "ALL" ? "All" : p}
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-10">
          No cash flow data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <ComposedChart data={filtered} margin={{ top: 4, right: 8, bottom: 12, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              interval={Math.max(0, Math.floor(filtered.length / 7) - 1)}
              angle={-30}
              dy={4}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => fmt(v)}
              width={50}
              domain={[0, "auto"]}
            />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                backgroundColor: "#fff",
              }}
              formatter={(value: any, name: any) => [
                fmt(Number(value) || 0),
                name === "cumCalls"
                  ? "Total Called"
                  : "Total Distributed",
              ]}
              labelStyle={{ fontSize: 11, fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="cumCalls"
              stroke="#ef4444"
              fill="#ef444420"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="cumDists"
              stroke="#10b981"
              fill="#10b98120"
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
