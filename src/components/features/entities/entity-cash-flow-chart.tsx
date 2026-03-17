"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { fmt } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  capitalCalls: any[];
  distributions: any[];
}

function toQuarter(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} '${String(d.getFullYear()).slice(2)}`;
}

export function EntityCashFlowChart({ capitalCalls, distributions }: Props) {
  const data = useMemo(() => {
    const quarterMap = new Map<string, { calls: number; dists: number; sortKey: number }>();

    for (const c of capitalCalls || []) {
      if (!c.callDate) continue;
      const q = toQuarter(c.callDate);
      const existing = quarterMap.get(q) || { calls: 0, dists: 0, sortKey: new Date(c.callDate).getTime() };
      existing.calls += c.amount || 0;
      quarterMap.set(q, existing);
    }

    for (const d of distributions || []) {
      if (!d.distributionDate) continue;
      const q = toQuarter(d.distributionDate);
      const existing = quarterMap.get(q) || { calls: 0, dists: 0, sortKey: new Date(d.distributionDate).getTime() };
      existing.dists += d.grossAmount || 0;
      quarterMap.set(q, existing);
    }

    const sorted = [...quarterMap.entries()].sort((a, b) => a[1].sortKey - b[1].sortKey);

    let cumCalls = 0;
    let cumDists = 0;
    return sorted.map(([label, { calls, dists }]) => {
      cumCalls += calls;
      cumDists += dists;
      return { label, cumCalls, cumDists };
    });
  }, [capitalCalls, distributions]);

  if (data.length < 2) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cumulative Cash Flow</h3>
        {data.length > 0 && (
          <div className="flex gap-3 text-right">
            <div>
              <div className="text-[9px] uppercase text-gray-400">Called</div>
              <div className="text-xs font-semibold text-red-500">{fmt(data[data.length - 1].cumCalls)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase text-gray-400">Distributed</div>
              <div className="text-xs font-semibold text-emerald-500">{fmt(data[data.length - 1].cumDists)}</div>
            </div>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 12, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => fmt(v)}
            width={56}
            domain={[0, "auto"]}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", backgroundColor: "#fff" }}
            formatter={(value: any, name: any) => [
              fmt(Number(value) || 0),
              name === "cumCalls" ? "Total Called" : "Total Distributed",
            ]}
          />
          <Area type="monotone" dataKey="cumCalls" stroke="#ef4444" fill="#ef444420" strokeWidth={2} />
          <Area type="monotone" dataKey="cumDists" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
