"use client";

import Link from "next/link";
interface Performer {
  assetId: string;
  name: string;
  irr: number | null;
  moic: number | null;
  fairValue: number;
  entityName: string | null;
}

interface TopBottomPerformersProps {
  topPerformers: Performer[];
  bottomPerformers: Performer[];
}

function PerformerList({
  performers,
  accent,
}: {
  performers: Performer[];
  accent: "green" | "red";
}) {
  if (performers.length === 0) {
    return (
      <div className="text-xs text-gray-400 text-center py-6">
        No performance data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {performers.map((p, i) => (
        <div
          key={p.assetId}
          className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0"
        >
          <span
            className={`text-[10px] font-bold w-4 flex-shrink-0 ${
              accent === "green" ? "text-emerald-500" : "text-red-400"
            }`}
          >
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <Link
              href={`/assets/${p.assetId}`}
              className="text-xs font-medium text-indigo-700 hover:underline truncate block"
            >
              {p.name}
            </Link>
            {p.entityName && (
              <div className="text-[10px] text-gray-400 truncate">{p.entityName}</div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div
              className={`text-xs font-semibold ${
                (p.irr ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {p.irr != null ? `${(p.irr * 100).toFixed(1)}%` : "N/A"}
            </div>
            {p.moic != null && (
              <div className="text-[10px] text-gray-500">{p.moic.toFixed(2)}x</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopBottomPerformers({
  topPerformers,
  bottomPerformers,
}: TopBottomPerformersProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Performers</h3>
        <p className="text-[10px] text-gray-500 mt-0.5">Assets ranked by IRR</p>
      </div>
      <div className="grid grid-cols-2 divide-x divide-gray-100">
        {/* Top performers */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
              Top Performers
            </span>
          </div>
          <PerformerList performers={topPerformers} accent="green" />
        </div>

        {/* Bottom performers */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">
              Bottom Performers
            </span>
          </div>
          <PerformerList performers={bottomPerformers} accent="red" />
        </div>
      </div>
    </div>
  );
}
