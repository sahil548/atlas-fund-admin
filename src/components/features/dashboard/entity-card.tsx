"use client";

import { useState } from "react";
import Link from "next/link";
import { fmt, pct } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface AssetBreakdown {
  assetId: string;
  assetName: string;
  allocationPercent: number;
  costBasis: number;
  fairValue: number;
  unrealizedGain: number;
  moic: number | null;
  irr: number | null;
}

interface TopAsset {
  assetId: string;
  name: string;
  fairValue: number;
  moic: number | null;
}

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
  rvpi: number | null;
  capitalDeployed: number;
  totalCommitted: number;
  deploymentPct: number;
  dryPowder: number;
  assetCount: number;
  topAssets: TopAsset[];
  perAssetBreakdown: AssetBreakdown[];
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
  capitalDeployed,
  totalCommitted,
  deploymentPct,
  dryPowder,
  assetCount,
  perAssetBreakdown,
}: EntityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const totalNAV = nav.total;
  const unrealizedGain = nav.unrealizedGain;
  const gainPct = nav.costBasis > 0 ? (unrealizedGain / nav.costBasis) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-indigo-200 transition-colors">
      {/* Card header — compact view */}
      <div className="p-4">
        {/* Top row: name + type badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <Link
              href={`/entities/${entityId}`}
              className="text-sm font-semibold text-indigo-700 hover:underline truncate block"
            >
              {name}
            </Link>
            <span className="inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {ENTITY_TYPE_LABELS[entityType] ?? entityType}
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-2 flex-shrink-0 text-[10px] font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <div className="text-[10px] text-gray-500 mb-0.5">NAV</div>
            <div className="text-sm font-semibold text-gray-900">{fmt(totalNAV)}</div>
            {unrealizedGain !== 0 && (
              <div className={`text-[10px] ${unrealizedGain >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {unrealizedGain >= 0 ? "+" : ""}{fmt(unrealizedGain)} ({gainPct >= 0 ? "+" : ""}{gainPct.toFixed(0)}%)
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] text-gray-500 mb-0.5">IRR</div>
            <div className={`text-sm font-semibold ${irr != null ? (irr >= 0 ? "text-emerald-700" : "text-red-600") : "text-gray-400"}`}>
              {irr != null ? `${(irr * 100).toFixed(1)}%` : "N/A"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 mb-0.5">TVPI</div>
            <div className="text-sm font-semibold text-gray-900">
              {tvpi != null ? `${tvpi.toFixed(2)}x` : <span className="text-gray-400 text-xs">N/A</span>}
            </div>
          </div>
        </div>

        {/* Capital deployment progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">Capital Deployed</span>
            <span className="text-[10px] font-medium text-gray-700">
              {fmt(capitalDeployed)} / {fmt(totalCommitted)}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${deploymentPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-gray-400">{deploymentPct.toFixed(0)}% deployed</span>
            <span className="text-[10px] text-amber-600 font-medium">
              {fmt(dryPowder)} dry powder
            </span>
          </div>
        </div>

        {/* Asset count */}
        <div className="text-[10px] text-gray-400">
          {assetCount} active asset{assetCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Expandable detail section */}
      <div
        style={{
          maxHeight: expanded ? "600px" : "0",
          overflow: "hidden",
          transition: "max-height 0.3s ease-in-out",
        }}
      >
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          {/* NAV Detail */}
          <div className="mb-4">
            <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
              NAV Breakdown
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-lg p-2 border border-gray-100">
                <div className="text-[10px] text-gray-500">Cost Basis</div>
                <div className="text-sm font-semibold text-gray-900">{fmt(nav.costBasis)}</div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-gray-100">
                <div className="text-[10px] text-gray-500">Fair Value</div>
                <div className="text-sm font-semibold text-gray-900">{fmt(nav.fairValue)}</div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-gray-100">
                <div className="text-[10px] text-gray-500">Unrealized Gain</div>
                <div className={`text-sm font-semibold ${unrealizedGain >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {unrealizedGain >= 0 ? "+" : ""}{fmt(unrealizedGain)}
                </div>
              </div>
            </div>
          </div>

          {/* Per-asset contributions */}
          {perAssetBreakdown.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Per-Asset Contributions
              </h4>
              <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-[10px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Asset</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600">Cost</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600">Fair Value</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600">Gain</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600">MOIC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perAssetBreakdown.map((asset) => (
                      <tr key={asset.assetId} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <Link
                            href={`/assets/${asset.assetId}`}
                            className="text-indigo-700 hover:underline"
                          >
                            {asset.assetName}
                          </Link>
                          {asset.allocationPercent < 100 && (
                            <span className="ml-1 text-gray-400">({pct(asset.allocationPercent / 100)})</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">{fmt(asset.costBasis)}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{fmt(asset.fairValue)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${asset.unrealizedGain >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {asset.unrealizedGain >= 0 ? "+" : ""}{fmt(asset.unrealizedGain)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {asset.moic != null ? `${asset.moic.toFixed(2)}x` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {perAssetBreakdown.length === 0 && (
            <div className="text-xs text-gray-400 text-center py-3">
              No active assets in this entity
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
