"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fmt } from "@/lib/utils";

interface ValuationPoint {
  valuationDate: string;
  fairValue: number;
  notes?: string;
}

interface Props {
  valuations: ValuationPoint[];
}

export function ValuationHistoryChart({ valuations }: Props) {
  // Guard: need 2+ valuations with valid data
  const valid = valuations.filter(
    (v) => v.valuationDate != null && v.fairValue != null,
  );
  if (valid.length < 2) return null;

  // Sort ascending, format dates as "MMM 'YY"
  const sorted = [...valid].sort(
    (a, b) =>
      new Date(a.valuationDate).getTime() - new Date(b.valuationDate).getTime(),
  );

  const data = sorted.map((v) => ({
    date: new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(
      new Date(v.valuationDate),
    ),
    value: v.fairValue,
    fullDate: v.valuationDate,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Fair Value History</h3>
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
            formatter={(v: any) => [fmt(Number(v) || 0), "Fair Value"]}
            labelFormatter={(label: any) => `Date: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
