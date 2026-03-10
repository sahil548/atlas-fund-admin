"use client";

import Link from "next/link";
import { Eye, DollarSign, FileText } from "lucide-react";
import { fmt, pct } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface EntityCardProps {
  entityId: string;
  name: string;
  entityType: string;
  nav: {
    costBasis: number;
    fairValue: number;
    unrealizedGain: number;
    total: number;
  };
  irr: number | null;
  tvpi: number | null;
  dpi: number | null;
  assetCount: number;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  FUND: "Fund",
  SPV: "SPV",
  HOLDING_CO: "Holding Co",
  OPERATING_CO: "Operating Co",
  TRUST: "Trust",
  LP: "LP",
  GP: "GP",
  JV: "JV",
  OTHER: "Other",
};

export function EntityCard({
  entityId,
  name,
  entityType,
  nav,
  irr,
  tvpi,
  dpi,
  assetCount,
}: EntityCardProps) {
  const totalNAV = nav.total;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors">
      {/* Row 1: name + entity type badge + NAV */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <Link
          href={`/entities/${entityId}`}
          className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 hover:underline truncate flex-1 min-w-0"
        >
          {name}
        </Link>
        <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          {ENTITY_TYPE_LABELS[entityType] ?? entityType}
        </span>
        <span className="flex-shrink-0 text-sm font-bold text-gray-900 dark:text-gray-100">
          {fmt(totalNAV)}
        </span>
      </div>

      {/* Row 2: metric pills + quick action icons */}
      <div className="flex items-center justify-between gap-1">
        {/* Metric pills */}
        <div className="flex items-center gap-1 flex-wrap">
          <MetricPill
            label="IRR"
            value={irr != null ? pct(irr) : "N/A"}
            colorClass={
              irr == null
                ? "text-gray-400"
                : irr >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }
          />
          <MetricPill
            label="TVPI"
            value={tvpi != null ? `${tvpi.toFixed(2)}x` : "N/A"}
          />
          <MetricPill
            label="DPI"
            value={dpi != null ? `${dpi.toFixed(2)}x` : "N/A"}
          />
          <MetricPill
            label="Assets"
            value={String(assetCount)}
          />
        </div>

        {/* Quick action icons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Link
            href={`/entities/${entityId}`}
            title="View Entity"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/capital?entityId=${entityId}`}
            title="Create Capital Call"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/reports?entityId=${entityId}`}
            title="Generate Report"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// Small helper component for metric pills
function MetricPill({
  label,
  value,
  colorClass = "text-gray-700 dark:text-gray-300",
}: {
  label: string;
  value: string;
  colorClass?: string;
}) {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <span className="text-[9px] text-gray-400 dark:text-gray-500">{label}</span>
      <span className={`text-[10px] font-medium ${colorClass}`}>{value}</span>
    </span>
  );
}
