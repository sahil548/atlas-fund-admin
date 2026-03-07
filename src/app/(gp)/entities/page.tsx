"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/utils";
import { CreateEntityForm } from "@/components/features/entities/create-entity-form";
import { useFirm } from "@/components/providers/firm-provider";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { LoadMoreButton } from "@/components/ui/load-more-button";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

/* eslint-disable @typescript-eslint/no-explicit-any */

const ENTITY_FILTERS = [
  {
    key: "entityType",
    label: "Type",
    options: [
      { value: "MAIN_FUND", label: "Main Fund" },
      { value: "SIDECAR", label: "Sidecar" },
      { value: "SPV", label: "SPV" },
      { value: "CO_INVEST", label: "Co-Invest" },
    ],
  },
  {
    key: "status",
    label: "Status",
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "WINDING_DOWN", label: "Winding Down" },
      { value: "DISSOLVED", label: "Dissolved" },
    ],
  },
];

export default function EntitiesPage() {
  const { firmId } = useFirm();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [allEntities, setAllEntities] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const buildUrl = useCallback(
    (currentCursor?: string | null) => {
      const params = new URLSearchParams({ firmId, limit: "50" });
      if (search) params.set("search", search);
      for (const [k, v] of Object.entries(activeFilters)) {
        if (v) params.set(k, v);
      }
      if (currentCursor) params.set("cursor", currentCursor);
      return `/api/entities?${params.toString()}`;
    },
    [firmId, search, activeFilters],
  );

  const { isLoading } = useSWR(buildUrl(null), fetcher, {
    onSuccess: (result) => {
      setAllEntities(result.data ?? []);
      setCursor(result.nextCursor ?? null);
    },
    revalidateOnFocus: false,
  });

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setAllEntities([]);
    setCursor(null);
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
    setAllEntities([]);
    setCursor(null);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(cursor));
      const result = await res.json();
      setAllEntities((prev) => [...prev, ...(result.data ?? [])]);
      setCursor(result.nextCursor ?? null);
    } catch (e) {
      console.error("Load more failed", e);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, buildUrl]);

  if (isLoading && allEntities.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading entities...
      </div>
    );
  }

  const hasMore = !!cursor;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">All Entities ({allEntities.length})</h3>
          <div className="flex items-center gap-3">
            <SearchFilterBar
              onSearch={handleSearch}
              filters={ENTITY_FILTERS}
              onFilterChange={handleFilterChange}
              activeFilters={activeFilters}
              placeholder="Search entities..."
            />
            <Button onClick={() => setShowCreate(true)}>+ Create Entity</Button>
          </div>
        </div>

        {allEntities.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
            <p className="text-sm text-gray-500">No entities found</p>
            <p className="text-xs text-gray-400">
              {search || Object.values(activeFilters).some(Boolean)
                ? "Try different search terms or clear filters"
                : "Create your first entity to get started"}
            </p>
            {!search && !Object.values(activeFilters).some(Boolean) && (
              <Button onClick={() => setShowCreate(true)} className="mt-2">+ Create Entity</Button>
            )}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Entity", "Type", "Vintage", "Committed", "Called", "Distributed", "Formation", "Accounting", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allEntities.map((e: any) => (
                <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <Link href={`/entities/${e.id}`} className="font-medium text-indigo-700 hover:underline">{e.name}</Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge color={e.entityType === "MAIN_FUND" ? "indigo" : e.entityType === "SIDECAR" ? "purple" : "blue"}>
                      {e.entityType?.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">{e.vintageYear}</td>
                  <td className="px-3 py-2.5">{fmt(e.totalCommitments || 0)}</td>
                  <td className="px-3 py-2.5">{fmt(e.totalCalled)}</td>
                  <td className="px-3 py-2.5">{fmt(e.totalDistributed)}</td>
                  <td className="px-3 py-2.5">
                    {e.formationStatus === "FORMING" && <Badge color="yellow">Forming</Badge>}
                    {e.formationStatus === "FORMED" && <Badge color="green">Formed</Badge>}
                    {e.formationStatus === "REGISTERED" && <Badge color="blue">Registered</Badge>}
                    {(!e.formationStatus || e.formationStatus === "NOT_STARTED") && <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge color={e.accountingConnection?.syncStatus === "CONNECTED" ? "green" : e.accountingConnection?.syncStatus === "ERROR" ? "red" : "gray"}>
                      {e.accountingConnection?.syncStatus || "—"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/entities/${e.id}`}>
                      <Button variant="secondary" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={handleLoadMore} />

      <CreateEntityForm open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
