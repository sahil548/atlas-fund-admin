"use client";

import useSWR from "swr";
import { useFirm } from "@/components/providers/firm-provider";
import { StatCard } from "@/components/ui/stat-card";
import { fmt } from "@/lib/utils";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

const STAGE_COLORS: Record<string, string> = {
  SCREENING: "#9ca3af",
  DUE_DILIGENCE: "#3b82f6",
  IC_REVIEW: "#f59e0b",
  CLOSING: "#10b981",
};

const STAGE_LABELS: Record<string, string> = {
  SCREENING: "Screening",
  DUE_DILIGENCE: "Due Diligence",
  IC_REVIEW: "IC Review",
  CLOSING: "Closing",
};

const FUNNEL_COLORS = ["#9ca3af", "#3b82f6", "#f59e0b", "#10b981", "#6366f1"];

function formatValue(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  if (value > 0) return `$${value.toLocaleString()}`;
  return "$0";
}

export default function AnalyticsPage() {
  const { firmId } = useFirm();
  const { data, isLoading } = useSWR(
    `/api/analytics/pipeline?firmId=${firmId}`,
    fetcher
  );

  if (isLoading || !data)
    return <div className="text-sm text-gray-400">Loading...</div>;

  const {
    pipelineValueByStage,
    timeInStage,
    dealVelocity,
    conversionRates,
    throughput,
    funnelData,
    summary,
  } = data;

  // Prepare chart data
  const valueByStageData = Object.entries(pipelineValueByStage).map(
    ([stage, info]: [string, any]) => ({
      stage: STAGE_LABELS[stage] || stage,
      value: info.value,
      count: info.count,
      fill: STAGE_COLORS[stage] || "#6b7280",
    })
  );

  const timeInStageData = Object.entries(timeInStage).map(
    ([stage, info]: [string, any]) => ({
      stage: STAGE_LABELS[stage] || stage,
      avgDays: info.avgDays,
      count: info.count,
      fill: STAGE_COLORS[stage] || "#6b7280",
    })
  );

  const velocityData = dealVelocity.closedPerMonth || [];

  // Combine throughput data for dual display
  const throughputData = (throughput.enteringPerMonth || []).map(
    (entry: any, i: number) => ({
      month: entry.month,
      entering: entry.count,
      exiting: throughput.exitingPerMonth?.[i]?.count ?? 0,
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Pipeline Analytics"
        subtitle="Deal flow metrics and pipeline health indicators"
        actions={
          <Link
            href="/deals"
            className="text-xs text-indigo-600 hover:underline font-medium"
          >
            &larr; Back to Pipeline
          </Link>
        }
      />

      {/* Summary Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Pipeline Value"
          value={formatValue(summary.totalPipelineValue)}
          sub={`${summary.activeDeals} active deals`}
        />
        <StatCard
          label="Active Deals"
          value={String(summary.activeDeals)}
          sub="In pipeline"
        />
        <StatCard
          label="Avg Days to Close"
          value={summary.avgDaysToClose > 0 ? `${summary.avgDaysToClose}d` : "---"}
          sub="Screening to closed"
        />
        <StatCard
          label="Overall Conversion"
          value={`${summary.overallConversion}%`}
          sub="Pipeline to closed"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline Value by Stage */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Pipeline Value by Stage
          </h3>
          {valueByStageData.some((d: any) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={valueByStageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(v: any) => formatValue(Number(v) || 0)}
                  axisLine={{ stroke: "#e5e7eb" }}
                  width={70}
                />
                <Tooltip
                  formatter={(value: any) => [formatValue(Number(value) || 0), "Value"]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {valueByStageData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
              No pipeline value data available
            </div>
          )}
        </div>

        {/* Time in Stage */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Average Time in Stage
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Identifies bottlenecks in your pipeline
          </p>
          {timeInStageData.some((d: any) => d.avgDays > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={timeInStageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(v: any) => `${v}d`}
                  axisLine={{ stroke: "#e5e7eb" }}
                  width={50}
                />
                <Tooltip
                  formatter={(value: any, _name: any, props: any) => [
                    `${value} days (${props?.payload?.count ?? 0} deals)`,
                    "Avg Time",
                  ]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Bar dataKey="avgDays" radius={[4, 4, 0, 0]}>
                  {timeInStageData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
              No time-in-stage data available yet
            </div>
          )}
        </div>

        {/* Deal Velocity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Deal Velocity
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Deals closed per month (last 6 months)
          </p>
          {velocityData.some((d: any) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  allowDecimals={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  width={30}
                />
                <Tooltip
                  formatter={(value: any) => [value, "Deals Closed"]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: "#6366f1", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-gray-400">
              No closed deals in the last 6 months
            </div>
          )}
          {dealVelocity.avgDaysToClose > 0 && (
            <div className="mt-3 text-center">
              <span className="text-xs text-gray-500">
                Average time to close:{" "}
                <span className="font-semibold text-gray-900">
                  {dealVelocity.avgDaysToClose} days
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Conversion Funnel
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            How many deals pass each stage
          </p>
          <div className="space-y-2">
            {(funnelData || []).map((stage: any, i: number) => {
              const maxCount = funnelData?.[0]?.count || 1;
              const barWidth = Math.max(
                (stage.count / maxCount) * 100,
                stage.count > 0 ? 8 : 0
              );
              return (
                <div key={stage.stage} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-24 text-right">
                    {stage.stage}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: FUNNEL_COLORS[i] || "#6b7280",
                      }}
                    >
                      {stage.count > 0 && (
                        <span className="text-[10px] font-bold text-white">
                          {stage.count}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 w-10">
                    {stage.pct}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Conversion rate details */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              {
                label: "Screen to DD",
                value: conversionRates.screeningToDD,
              },
              { label: "DD to IC", value: conversionRates.ddToIC },
              { label: "IC to Close", value: conversionRates.icToClose },
            ].map((cr) => (
              <div
                key={cr.label}
                className="bg-gray-50 rounded-lg p-2 text-center"
              >
                <div className="text-[10px] text-gray-500">{cr.label}</div>
                <div className="text-sm font-semibold text-gray-900">
                  {cr.value}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deal Throughput */}
      {throughputData.some((d: any) => d.entering > 0 || d.exiting > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Deal Throughput
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Deals entering vs. exiting the pipeline per month
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={throughputData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                allowDecimals={false}
                axisLine={{ stroke: "#e5e7eb" }}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
              <Bar
                dataKey="entering"
                name="Entering"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="exiting"
                name="Exiting"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex justify-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
              Entering Pipeline
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              Exiting (Closed/Dead)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
