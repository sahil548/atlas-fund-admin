"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Performer {
  assetId: string;
  name: string;
  irr: number | null;
  moic: number | null;
  fairValue: number;
  entityName: string | null;
  entryDate: string | null;
}

interface TopBottomPerformersProps {
  topPerformers: Performer[];
  bottomPerformers: Performer[];
}

type VintageFilter = "ALL" | "1Y" | "3Y" | "5Y";

const VINTAGE_CHIPS: { label: string; value: VintageFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "1Y", value: "1Y" },
  { label: "3Y", value: "3Y" },
  { label: "5Y", value: "5Y" },
];

function filterByVintage(performers: Performer[], filter: VintageFilter): Performer[] {
  if (filter === "ALL") return performers;
  const now = new Date();
  const years = filter === "1Y" ? 1 : filter === "3Y" ? 3 : 5;
  const cutoff = new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
  return performers.filter((p) => {
    if (!p.entryDate) return false;
    return new Date(p.entryDate) >= cutoff;
  });
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
      <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
        No performance data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {performers.map((p, i) => (
        <div
          key={p.assetId}
          className="flex items-center gap-2 py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0"
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
              className="text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:underline truncate block"
            >
              {p.name}
            </Link>
            {p.entityName && (
              <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{p.entityName}</div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div
              className={`text-xs font-semibold ${
                (p.irr ?? 0) >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {p.irr != null ? `${(p.irr * 100).toFixed(1)}%` : "N/A"}
            </div>
            {p.moic != null && (
              <div className="text-[10px] text-gray-500 dark:text-gray-400">{p.moic.toFixed(2)}x</div>
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
  const [vintage, setVintage] = useState<VintageFilter>("ALL");

  const filteredTop = useMemo(() => filterByVintage(topPerformers, vintage), [topPerformers, vintage]);
  const filteredBottom = useMemo(() => filterByVintage(bottomPerformers, vintage), [bottomPerformers, vintage]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Performers</h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
              Assets ranked by IRR · Since Inception
            </p>
          </div>
          {/* Vintage filter pills */}
          <div className="flex items-center gap-1">
            {VINTAGE_CHIPS.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setVintage(chip.value)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                  vintage === chip.value
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800">
        {/* Top performers */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
              Top Performers
            </span>
          </div>
          <PerformerList performers={filteredTop} accent="green" />
        </div>

        {/* Bottom performers */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
              Bottom Performers
            </span>
          </div>
          <PerformerList performers={filteredBottom} accent="red" />
        </div>
      </div>
    </div>
  );
}
