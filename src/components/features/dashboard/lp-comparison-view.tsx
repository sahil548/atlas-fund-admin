"use client";

import { Fragment, useState } from "react";
import useSWR from "swr";
import { fmt } from "@/lib/utils";
import { useFirm } from "@/components/providers/firm-provider";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

interface PerEntityMetric {
  entityId: string;
  entityName: string;
  entityType: string;
  committed: number;
  called: number;
  distributed: number;
  nav: number;
  tvpi: number | null;
  dpi: number | null;
  rvpi: number | null;
  irr: number | null;
}

interface AggregateMetrics {
  tvpi: number | null;
  dpi: number | null;
  rvpi: number | null;
  irr: number | null;
  called: number;
  distributed: number;
  nav: number;
}

interface LPRow {
  investorId: string;
  investorName: string;
  investorType: string;
  totalCommitted: number;
  perEntity: PerEntityMetric[];
  aggregateMetrics: AggregateMetrics;
}

type SortKey = "investorName" | "totalCommitted" | "tvpi" | "irr";
type SortDir = "asc" | "desc";

function MetricCell({
  value,
  suffix = "",
  isPercent = false,
}: {
  value: number | null;
  suffix?: string;
  isPercent?: boolean;
}) {
  if (value == null) return <span className="text-gray-300">—</span>;
  const formatted = isPercent
    ? `${(value * 100).toFixed(1)}%`
    : `${value.toFixed(2)}${suffix}`;
  const isNegative = value < 0;
  return (
    <span className={isNegative ? "text-red-600" : ""}>{formatted}</span>
  );
}

export function LPComparisonView() {
  const { firmId } = useFirm();
  const { data, isLoading } = useSWR(
    `/api/dashboard/lp-comparison?firmId=${firmId}`,
    fetcher
  );

  const [sortKey, setSortKey] = useState<SortKey>("totalCommitted");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState(false);

  if (isLoading || !data)
    return <div className="text-sm text-gray-400">Loading LP comparison...</div>;

  const rows: LPRow[] = data;
  if (rows.length === 0)
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">LP Comparison</h3>
        <div className="text-xs text-gray-400 text-center py-6">
          No LP data available
        </div>
      </div>
    );

  // Collect all unique entity names across all LPs
  const allEntityNames = Array.from(
    new Set(rows.flatMap((r) => r.perEntity.map((e) => e.entityName)))
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    let av: number;
    let bv: number;
    switch (sortKey) {
      case "investorName":
        return sortDir === "asc"
          ? a.investorName.localeCompare(b.investorName)
          : b.investorName.localeCompare(a.investorName);
      case "totalCommitted":
        av = a.totalCommitted;
        bv = b.totalCommitted;
        break;
      case "tvpi":
        av = a.aggregateMetrics.tvpi ?? -Infinity;
        bv = b.aggregateMetrics.tvpi ?? -Infinity;
        break;
      case "irr":
        av = a.aggregateMetrics.irr ?? -Infinity;
        bv = b.aggregateMetrics.irr ?? -Infinity;
        break;
      default:
        return 0;
    }
    return sortDir === "asc" ? av - bv : bv - av;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <span className="text-gray-300 ml-0.5">↕</span>;
    return (
      <span className="text-indigo-600 ml-0.5">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-900">LP Comparison</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {rows.length} investor{rows.length !== 1 ? "s" : ""} — TVPI, DPI, RVPI, IRR side by side
          </p>
        </div>
        <button className="text-xs text-indigo-600 font-medium">
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      <div
        style={{
          maxHeight: expanded ? "800px" : "0",
          overflow: "hidden",
          transition: "max-height 0.3s ease-in-out",
        }}
      >
        <div className="border-t border-gray-100 overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th
                  className="text-left px-4 py-2.5 font-semibold text-gray-600 cursor-pointer hover:text-indigo-700 whitespace-nowrap"
                  onClick={() => handleSort("investorName")}
                >
                  Investor <SortIcon col="investorName" />
                </th>
                <th
                  className="text-right px-3 py-2.5 font-semibold text-gray-600 cursor-pointer hover:text-indigo-700 whitespace-nowrap"
                  onClick={() => handleSort("totalCommitted")}
                >
                  Committed <SortIcon col="totalCommitted" />
                </th>
                {allEntityNames.map((entityName) => (
                  <th
                    key={entityName}
                    className="text-center px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap border-l border-gray-100"
                    colSpan={2}
                  >
                    {entityName}
                  </th>
                ))}
                <th
                  className="text-center px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap border-l border-gray-200 bg-indigo-50"
                  colSpan={2}
                >
                  Aggregate
                </th>
              </tr>
              {/* Sub-header for metric labels */}
              <tr className="border-t border-gray-100 bg-gray-50">
                <th className="px-4 py-1" />
                <th className="px-3 py-1" />
                {allEntityNames.map((entityName) => (
                  <Fragment key={entityName}>
                    <th className="text-center px-2 py-1 text-[10px] font-medium text-gray-400 border-l border-gray-100">
                      TVPI
                    </th>
                    <th className="text-center px-2 py-1 text-[10px] font-medium text-gray-400">
                      IRR
                    </th>
                  </Fragment>
                ))}
                <th className="text-center px-2 py-1 text-[10px] font-medium text-indigo-400 border-l border-gray-200 bg-indigo-50">
                  TVPI
                </th>
                <th className="text-center px-2 py-1 text-[10px] font-medium text-indigo-400 bg-indigo-50">
                  IRR
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((lp) => {
                const entityMap = new Map(
                  lp.perEntity.map((e) => [e.entityName, e])
                );

                return (
                  <tr
                    key={lp.investorId}
                    className="border-t border-gray-50 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900 whitespace-nowrap">
                        {lp.investorName}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {lp.investorType}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap">
                      {fmt(lp.totalCommitted)}
                    </td>
                    {allEntityNames.map((entityName) => {
                      const e = entityMap.get(entityName);
                      return (
                        <Fragment key={entityName}>
                          <td className="px-2 py-2.5 text-center whitespace-nowrap border-l border-gray-100">
                            {e ? (
                              <MetricCell value={e.tvpi} suffix="x" />
                            ) : (
                              <span className="text-gray-200">—</span>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-center whitespace-nowrap">
                            {e ? (
                              <MetricCell value={e.irr} isPercent />
                            ) : (
                              <span className="text-gray-200">—</span>
                            )}
                          </td>
                        </Fragment>
                      );
                    })}
                    {/* Aggregate */}
                    <td
                      className="px-2 py-2.5 text-center font-medium whitespace-nowrap border-l border-gray-200 bg-indigo-50 cursor-pointer"
                      onClick={() => handleSort("tvpi")}
                    >
                      <MetricCell value={lp.aggregateMetrics.tvpi} suffix="x" />
                    </td>
                    <td
                      className="px-2 py-2.5 text-center font-medium whitespace-nowrap bg-indigo-50 cursor-pointer"
                      onClick={() => handleSort("irr")}
                    >
                      <MetricCell value={lp.aggregateMetrics.irr} isPercent />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
