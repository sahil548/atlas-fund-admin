"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { fmt } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface NavSnapshot {
  periodDate: string;
  economicNAV: number;
  costBasisNAV: number;
}

interface Props {
  navHistory: NavSnapshot[];
}

export function EntityNavTrendChart({ navHistory }: Props) {
  const valid = navHistory.filter(
    (v) => v.periodDate != null && v.economicNAV != null,
  );
  if (valid.length < 2) return null;

  const sorted = [...valid].sort(
    (a, b) => new Date(a.periodDate).getTime() - new Date(b.periodDate).getTime(),
  );

  const data = sorted.map((v) => ({
    date: new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(
      new Date(v.periodDate),
    ),
    economic: v.economicNAV,
    costBasis: v.costBasisNAV,
  }));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">NAV Trend</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => fmt(v)}
            width={64}
          />
          <Tooltip
            formatter={(v: any, name: any) => [
              fmt(Number(v) || 0),
              name === "economic" ? "Economic NAV" : "Cost Basis NAV",
            ]}
            labelFormatter={(label: any) => `Period: ${label}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 10 }}
            formatter={(value: string) =>
              value === "economic" ? "Economic NAV" : "Cost Basis NAV"
            }
          />
          <Line
            type="monotone"
            dataKey="economic"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="costBasis"
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={{ r: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
