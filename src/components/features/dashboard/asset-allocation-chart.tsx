"use client";

import useSWR from "swr";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  ASSET_CLASS_LABELS,
  PARTICIPATION_LABELS,
} from "@/lib/constants";

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

const PARTICIPATION_HEX: Record<string, string> = {
  DIRECT_GP: "#0ea5e9",
  CO_INVEST_JV_PARTNERSHIP: "#14b8a6",
  LP_STAKE_SILENT_PARTNER: "#f59e0b",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const label =
    (ASSET_CLASS_LABELS as any)[d.name] ||
    (PARTICIPATION_LABELS as any)[d.name] ||
    d.name;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold text-gray-900 mb-1">{label}</div>
      <div className="text-gray-600">Total: {fmt(d.value)}</div>
      {d.equityValue > 0 && (
        <div className="text-blue-600">Equity: {fmt(d.equityValue)}</div>
      )}
      {d.debtValue > 0 && (
        <div className="text-orange-600">Debt: {fmt(d.debtValue)}</div>
      )}
    </div>
  );
}

export function AssetAllocationChart() {
  const { data, isLoading } = useSWR(
    "/api/dashboard/asset-allocation",
    fetcher
  );

  if (isLoading || !data)
    return <div className="text-xs text-gray-400">Loading chart...</div>;
  if (!data.outerRing?.length)
    return (
      <div className="text-xs text-gray-400">No active assets to chart.</div>
    );

  return (
    <div>
      <div className="flex justify-center">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            {/* Inner ring: participation structure */}
            <Pie
              data={data.innerRing}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={75}
              innerRadius={42}
              paddingAngle={2}
            >
              {data.innerRing.map((entry: any, i: number) => {
                const base = PARTICIPATION_HEX[entry.name] || "#9ca3af";
                const debtRatio = entry.debtValue / Math.max(entry.value, 1);
                const opacity = 1 - debtRatio * 0.4;
                return (
                  <Cell
                    key={i}
                    fill={base}
                    fillOpacity={opacity}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              })}
            </Pie>
            {/* Outer ring: asset class */}
            <Pie
              data={data.outerRing}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={130}
              innerRadius={90}
              paddingAngle={2}
              label={({ name, percent }: any) => {
                const label = (ASSET_CLASS_LABELS as any)[name] || name;
                return percent > 0.05
                  ? `${label} ${(percent * 100).toFixed(0)}%`
                  : "";
              }}
              labelLine={false}
            >
              {data.outerRing.map((entry: any, i: number) => {
                const base = ASSET_CLASS_HEX[entry.name] || "#9ca3af";
                const debtRatio = entry.debtValue / Math.max(entry.value, 1);
                const opacity = 1 - debtRatio * 0.4;
                return (
                  <Cell
                    key={i}
                    fill={base}
                    fillOpacity={opacity}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
        <div className="font-semibold text-gray-500 col-span-2 mb-0.5">
          Outer Ring — Asset Class
        </div>
        {data.outerRing.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: ASSET_CLASS_HEX[entry.name] || "#9ca3af",
              }}
            />
            <span className="text-gray-700">
              {(ASSET_CLASS_LABELS as any)[entry.name] || entry.name}
            </span>
          </div>
        ))}
        <div className="font-semibold text-gray-500 col-span-2 mt-1.5 mb-0.5">
          Inner Ring — Participation
        </div>
        {data.innerRing.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: PARTICIPATION_HEX[entry.name] || "#9ca3af",
              }}
            />
            <span className="text-gray-700">
              {(PARTICIPATION_LABELS as any)[entry.name] || entry.name}
            </span>
          </div>
        ))}
        <div className="font-semibold text-gray-500 col-span-2 mt-1.5 mb-0.5">
          Shading — Capital Instrument
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-700 flex-shrink-0" />
          <span className="text-gray-700">Full opacity = Equity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-400 flex-shrink-0" />
          <span className="text-gray-700">Lighter shade = Debt</span>
        </div>
      </div>
    </div>
  );
}
