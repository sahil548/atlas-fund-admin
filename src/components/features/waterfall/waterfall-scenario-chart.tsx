"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fmt } from "@/lib/utils";

interface ScenarioChartEntry {
  label: string;
  lpTotal: number;
  gpTotal: number;
}

interface Props {
  scenarios: ScenarioChartEntry[];
}

export function WaterfallScenarioChart({ scenarios }: Props) {
  const chartData = scenarios.map((s) => ({
    name: s.label,
    LP: s.lpTotal,
    GP: s.gpTotal,
  }));

  return (
    <div className="mt-4">
      <div className="text-xs font-semibold text-gray-700 mb-2">LP vs GP Split Comparison</div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => fmt(v)}
            width={72}
          />
          <Tooltip
            formatter={(value: any, name: any) => [fmt(Number(value) || 0), name === "LP" ? "LP Share" : "GP Share"]}
          />
          <Legend
            formatter={(value: any) => value === "LP" ? "LP Share" : "GP Share"}
          />
          <Bar dataKey="LP" stackId="a" fill="#3b82f6" name="LP" />
          <Bar dataKey="GP" stackId="a" fill="#fb923c" name="GP" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
