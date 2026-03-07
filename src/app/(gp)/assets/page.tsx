"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditAssetForm } from "@/components/features/assets/edit-asset-form";
import { fmt, pct } from "@/lib/utils";
import { useFirm } from "@/components/providers/firm-provider";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { LoadMoreButton } from "@/components/ui/load-more-button";

import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS,
  CAPITAL_INSTRUMENT_LABELS,
  PARTICIPATION_LABELS,
  PARTICIPATION_COLORS,
} from "@/lib/constants";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

const ASSET_FILTERS = [
  {
    key: "assetClass",
    label: "Asset Class",
    options: Object.entries(ASSET_CLASS_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: "status",
    label: "Status",
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "EXITED", label: "Exited" },
      { value: "WRITTEN_OFF", label: "Written Off" },
    ],
  },
];

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AssetsPage() {
  const { firmId } = useFirm();
  const [showEdit, setShowEdit] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const buildUrl = useCallback(
    (currentCursor?: string | null) => {
      const params = new URLSearchParams({ firmId, limit: "50" });
      if (search) params.set("search", search);
      for (const [k, v] of Object.entries(activeFilters)) {
        if (v) params.set(k, v);
      }
      if (currentCursor) params.set("cursor", currentCursor);
      return `/api/assets?${params.toString()}`;
    },
    [firmId, search, activeFilters],
  );

  const { isLoading } = useSWR(buildUrl(null), fetcher, {
    onSuccess: (result) => {
      setAllAssets(result.data ?? []);
      setCursor(result.nextCursor ?? null);
    },
    revalidateOnFocus: false,
  });

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setAllAssets([]);
    setCursor(null);
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
    setAllAssets([]);
    setCursor(null);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(cursor));
      const result = await res.json();
      setAllAssets((prev) => [...prev, ...(result.data ?? [])]);
      setCursor(result.nextCursor ?? null);
    } catch (e) {
      console.error("Load more failed", e);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, buildUrl]);

  if (isLoading && allAssets.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading assets...
      </div>
    );
  }

  const hasMore = !!cursor;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">All Assets ({allAssets.length})</h3>
          <SearchFilterBar
            onSearch={handleSearch}
            filters={ASSET_FILTERS}
            onFilterChange={handleFilterChange}
            activeFilters={activeFilters}
            placeholder="Search assets..."
          />
        </div>

        {allAssets.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
            <p className="text-sm text-gray-500">No assets found</p>
            <p className="text-xs text-gray-400">
              {search || Object.values(activeFilters).some(Boolean)
                ? "Try different search terms or clear filters"
                : "Assets appear here after deals are closed"}
            </p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Asset", "Asset Class", "Instrument", "Participation", "Sector", "Entities", "Cost Basis", "Fair Value", "Unrealized", "MOIC", "IRR", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allAssets.map((a: any) => {
                const ur = a.fairValue - a.costBasis;
                return (
                  <tr
                    key={a.id}
                    className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => (window.location.href = `/assets/${a.id}`)}
                  >
                    <td className="px-3 py-2.5 font-medium text-indigo-700">{a.name}</td>
                    <td className="px-3 py-2.5">
                      <Badge color={ASSET_CLASS_COLORS[a.assetClass]}>{ASSET_CLASS_LABELS[a.assetClass]}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {a.capitalInstrument ? (
                        <Badge color={a.capitalInstrument === "DEBT" ? "orange" : "blue"}>{CAPITAL_INSTRUMENT_LABELS[a.capitalInstrument]}</Badge>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {a.participationStructure ? (
                        <Badge color={PARTICIPATION_COLORS[a.participationStructure] || "gray"}>{PARTICIPATION_LABELS[a.participationStructure] || a.participationStructure}</Badge>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{a.sector}</td>
                    <td className="px-3 py-2.5">
                      {a.entityAllocations?.map((ea: any) => (
                        <span key={ea.entity.name} className="text-[10px] bg-gray-100 px-1 py-0.5 rounded mr-1">{ea.entity.name}</span>
                      ))}
                    </td>
                    <td className="px-3 py-2.5">{fmt(a.costBasis)}</td>
                    <td className="px-3 py-2.5 font-medium">{fmt(a.fairValue)}</td>
                    <td className={`px-3 py-2.5 font-medium ${ur > 0 ? "text-emerald-700" : "text-gray-500"}`}>
                      {ur > 0 ? "+" : ""}{fmt(ur)}
                    </td>
                    <td className={`px-3 py-2.5 font-medium ${(a.moic || 0) >= 2 ? "text-emerald-600" : ""}`}>
                      {a.moic?.toFixed(2)}x
                    </td>
                    <td className="px-3 py-2.5 text-emerald-700">{a.irr ? pct(a.irr) : "—"}</td>
                    <td className="px-3 py-2.5">
                      <Badge color={a.status === "ACTIVE" ? "green" : "purple"}>{a.status?.toLowerCase()}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAsset(a);
                          setShowEdit(true);
                        }}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={handleLoadMore} />

      {editingAsset && (
        <EditAssetForm open={showEdit} onClose={() => { setShowEdit(false); setEditingAsset(null); }} asset={editingAsset} />
      )}
    </div>
  );
}
