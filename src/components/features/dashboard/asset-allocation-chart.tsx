"use client";

import useSWR from "swr";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { ASSET_CLASS_LABELS } from "@/lib/constants";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

const ASSET_CLASS_HEX: Record<string, string> = {
  REAL_ESTATE: "#22c55e",
  PUBLIC_SECURITIES: "#3b82f6",
  OPERATING_BUSINESS: "#a855f7",
  INFRASTRUCTURE: "#f97316",
  DIVERSIFIED: "#6366f1",
  NON_CORRELATED: "#ef4444",
  COMMODITIES: "#eab308",
  CASH_AND_EQUIVALENTS: "#9ca3af",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

interface ChartEntry {
  name: string;
  value: number;
  _total?: number;
}

interface TooltipPayload {
  payload: ChartEntry;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const total: number = d._total ?? 1;
  const label = ASSET_CLASS_LABELS[d.name] || d.name;
  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0";
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{label}</div>
      <div className="text-gray-600 dark:text-gray-400">{fmt(d.value)}</div>
      <div className="text-gray-500 dark:text-gray-500 mt-0.5">{pct}% of portfolio</div>
    </div>
  );
}

function renderLabel({ name, percent }: { name?: string; percent?: number }) {
  if (!name || !percent || percent <= 0.05) return "";
  const label = ASSET_CLASS_LABELS[name] || name;
  return `${label} ${(percent * 100).toFixed(0)}%`;
}

export function AssetAllocationChart() {
  const { data, isLoading } = useSWR(
    "/api/dashboard/asset-allocation",
    fetcher
  );

  if (isLoading || !data)
    return <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-xs text-gray-400 dark:text-gray-500">Loading chart...</div>;
  if (!data.outerRing?.length)
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-xs text-gray-400 dark:text-gray-500">No active assets to chart.</div>
    );

  const total: number = data.outerRing.reduce((sum: number, d: ChartEntry) => sum + d.value, 0);

  // Inject total into each item so tooltip can compute percentage
  const chartData: ChartEntry[] = data.outerRing.map((d: ChartEntry) => ({ ...d, _total: total }));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Asset Allocation</h3>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">By fair value across all entities</p>
      </div>

      <div className="relative flex justify-center">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={110}
              innerRadius={60}
              paddingAngle={2}
              label={renderLabel as (props: unknown) => React.ReactNode}
              labelLine={false}
            >
              {chartData.map((entry: ChartEntry, i: number) => (
                <Cell
                  key={i}
                  fill={ASSET_CLASS_HEX[entry.name] || "#9ca3af"}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">Total</span>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{fmt(total)}</span>
        </div>
      </div>

      {/* Simplified legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {data.outerRing.map((entry: ChartEntry) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: ASSET_CLASS_HEX[entry.name] || "#9ca3af" }}
            />
            <span className="text-[10px] text-gray-700 dark:text-gray-300">
              {ASSET_CLASS_LABELS[entry.name] || entry.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
