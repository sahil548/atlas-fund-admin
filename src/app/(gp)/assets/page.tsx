"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditAssetForm } from "@/components/features/assets/edit-asset-form";
import { CreateAssetForm } from "@/components/features/assets/create-asset-form";
import { AssetMonitoringPanel } from "@/components/features/assets/asset-monitoring-panel";
import { fmt, pct, formatDate, cn } from "@/lib/utils";
import { useFirm } from "@/components/providers/firm-provider";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Package } from "lucide-react";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { ExportButton } from "@/components/ui/export-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";

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

const SORTABLE_COLUMNS: { key: string; label: string }[] = [
  { key: "name", label: "Asset" },
  { key: "assetClass", label: "Asset Class" },
  { key: "capitalInstrument", label: "Instrument" },
  { key: "participationStructure", label: "Participation" },
  { key: "sector", label: "Sector" },
  { key: "costBasis", label: "Cost Basis" },
  { key: "fairValue", label: "Fair Value" },
  { key: "_unrealized", label: "Unrealized" },
  { key: "moic", label: "MOIC" },
  { key: "irr", label: "IRR" },
  { key: "status", label: "Status" },
];

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AssetsPage() {
  const { firmId } = useFirm();
  const [showEdit, setShowEdit] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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

  const sortedAssets = [...allAssets].sort((a, b) => {
    let valA: any;
    let valB: any;
    if (sortKey === "_unrealized") {
      valA = (a.fairValue ?? 0) - (a.costBasis ?? 0);
      valB = (b.fairValue ?? 0) - (b.costBasis ?? 0);
    } else {
      valA = a[sortKey] ?? "";
      valB = b[sortKey] ?? "";
    }
    const cmp =
      typeof valA === "number" && typeof valB === "number"
        ? valA - valB
        : String(valA).localeCompare(String(valB));
    return sortDir === "asc" ? cmp : -cmp;
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

  const hasMore = !!cursor;
  const hasFilters = !!(search || Object.values(activeFilters).some(Boolean));

  const handleClearFilters = () => {
    setSearch("");
    setActiveFilters({});
    setAllAssets([]);
    setCursor(null);
  };

  function SortHeader({ colKey, children }: { colKey: string; children: React.ReactNode }) {
    const isActive = sortKey === colKey;
    return (
      <th
        className={cn(
          "text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none",
          "hover:text-gray-900 hover:bg-gray-100 transition-colors",
          isActive && "text-indigo-700",
        )}
        onClick={() => handleSort(colKey)}
      >
        {children}
        {isActive ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </th>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Assets"
        subtitle={`${allAssets.length} assets`}
        actions={
          <SearchFilterBar
            filters={ASSET_FILTERS}
            onFilterChange={handleFilterChange}
            activeFilters={activeFilters}
          >
            <Button onClick={() => setShowCreate(true)}>+ Add Asset</Button>
            <ExportButton
              data={allAssets.map((a: any) => ({
                id: a.id,
                name: a.name,
                assetClass: a.assetClass,
                entityName: a.entityAllocations?.map((ea: any) => ea.entity.name).join(", ") ?? "",
                costBasis: a.costBasis,
                fairValue: a.fairValue,
                irr: a.irr ?? "",
                moic: a.moic ?? "",
                status: a.status,
                createdAt: formatDate(a.createdAt),
              }))}
              fileName="Assets_Export"
            />
          </SearchFilterBar>
        }
      />

      <AssetMonitoringPanel />

      <SectionPanel noPadding className="overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {SORTABLE_COLUMNS.map((col) => (
                <SortHeader key={col.key} colKey={col.key}>
                  {col.label}
                </SortHeader>
              ))}
              {/* Non-sortable: Entities, Actions */}
              <th className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">Entities</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && allAssets.length === 0 ? (
              <TableSkeleton columns={13} />
            ) : allAssets.length === 0 ? (
              <tr><td colSpan={13}>
                <EmptyState
                  icon={<Package className="h-10 w-10" />}
                  title={hasFilters ? "No results match your filters" : "No assets yet"}
                  description={!hasFilters ? "Add your first asset to start tracking portfolio performance" : undefined}
                  action={!hasFilters ? { label: "+ Add Asset", onClick: () => setShowCreate(true) } : undefined}
                  filtered={hasFilters}
                  onClearFilters={hasFilters ? handleClearFilters : undefined}
                />
              </td></tr>
            ) : (
              sortedAssets.map((a: any) => {
                const ur = a.fairValue - a.costBasis;
                return (
                  <tr
                    key={a.id}
                    className={cn("border-t border-gray-50 hover:bg-gray-50 cursor-pointer", a.status === "EXITED" && "opacity-60")}
                    onClick={() => (window.location.href = `/assets/${a.id}`)}
                  >
                    <td className="px-3 py-2.5 font-medium text-indigo-700">
                      <span className="inline-flex items-center gap-1.5">
                        {a.name}
                        {a.status === "EXITED" && <Badge color="gray">EXITED</Badge>}
                      </span>
                    </td>
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
                      {a.entityAllocations?.map((ea: any) => (
                        <span key={ea.entity.name} className="text-[10px] bg-gray-100 px-1 py-0.5 rounded mr-1">{ea.entity.name}</span>
                      ))}
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
              })
            )}
          </tbody>
        </table>
      </SectionPanel>

      <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={handleLoadMore} />

      {editingAsset && (
        <EditAssetForm open={showEdit} onClose={() => { setShowEdit(false); setEditingAsset(null); }} asset={editingAsset} />
      )}

      <CreateAssetForm open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
