"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt, cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { CreateEntityForm } from "@/components/features/entities/create-entity-form";
import { useFirm } from "@/components/providers/firm-provider";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Building } from "lucide-react";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { ExportButton } from "@/components/ui/export-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { VehicleTreeView } from "@/components/features/entities/vehicle-tree-view";
import { VehicleOrgChart } from "@/components/features/entities/vehicle-org-chart";
import { VehicleCardsView } from "@/components/features/entities/vehicle-cards-view";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

/* eslint-disable @typescript-eslint/no-explicit-any */

type ViewMode = "flat" | "tree" | "orgchart" | "cards";

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: "flat", label: "Flat" },
  { key: "tree", label: "Tree" },
  { key: "orgchart", label: "Org Chart" },
  { key: "cards", label: "Cards" },
];

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
  const [viewMode, setViewMode] = useState<ViewMode>("flat");

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
      logger.error("Load more failed", { error: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, buildUrl]);

  const hasMore = !!cursor;
  const hasFilters = !!(search || Object.values(activeFilters).some(Boolean));

  const handleClearFilters = () => {
    setSearch("");
    setActiveFilters({});
    setAllEntities([]);
    setCursor(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vehicles"
        subtitle={`${allEntities.length} vehicles`}
        actions={
          <>
            <SearchFilterBar
              filters={ENTITY_FILTERS}
              onFilterChange={handleFilterChange}
              activeFilters={activeFilters}
            >
              <ExportButton
                data={allEntities.map((e: any) => ({
                  id: e.id,
                  name: e.name,
                  type: e.entityType,
                  vintageYear: e.vintageYear ?? "",
                  totalCommitted: e.totalCommitments ?? 0,
                  totalCalled: e.totalCalled ?? 0,
                  nav: e.nav ?? "",
                  irr: e.irr ?? "",
                  tvpi: e.tvpi ?? "",
                }))}
                fileName="Vehicles_Export"
              />
            </SearchFilterBar>

            {/* View mode toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    viewMode === mode.key
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <Button onClick={() => setShowCreate(true)}>+ Create Vehicle</Button>
          </>
        }
      />

      {/* Flat view (default) */}
      {viewMode === "flat" && (
        <SectionPanel noPadding className="overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {["Vehicle", "Type", "Vintage", "Committed", "Called", "Distributed", "Formation", "Accounting", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && allEntities.length === 0 ? (
                <TableSkeleton columns={9} />
              ) : allEntities.length === 0 ? (
                <tr><td colSpan={9}>
                  <EmptyState
                    icon={<Building className="h-10 w-10" />}
                    title={hasFilters ? "No results match your filters" : "No vehicles yet"}
                    description={!hasFilters ? "Create your first vehicle to get started" : undefined}
                    action={!hasFilters ? { label: "+ Create Vehicle", onClick: () => setShowCreate(true) } : undefined}
                    filtered={hasFilters}
                    onClearFilters={hasFilters ? handleClearFilters : undefined}
                  />
                </td></tr>
              ) : (
                allEntities.map((e: any) => (
                  <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800">
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
                ))
              )}
            </tbody>
          </table>
        </SectionPanel>
      )}

      {/* Tree view */}
      {viewMode === "tree" && (
        <SectionPanel noPadding className="overflow-hidden">
          {isLoading && allEntities.length === 0 ? (
            <table className="w-full text-xs"><tbody><TableSkeleton columns={6} /></tbody></table>
          ) : (
            <VehicleTreeView entities={allEntities} />
          )}
        </SectionPanel>
      )}

      {/* Org chart view */}
      {viewMode === "orgchart" && (
        <SectionPanel noPadding className="overflow-hidden">
          {isLoading && allEntities.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
          ) : (
            <VehicleOrgChart entities={allEntities} />
          )}
        </SectionPanel>
      )}

      {/* Cards view */}
      {viewMode === "cards" && (
        <>
          {isLoading && allEntities.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 h-48 animate-pulse" />
              ))}
            </div>
          ) : (
            <VehicleCardsView entities={allEntities} />
          )}
        </>
      )}

      {/* Load more (only visible in flat/tree modes where pagination matters) */}
      {(viewMode === "flat" || viewMode === "tree") && (
        <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={handleLoadMore} />
      )}

      <CreateEntityForm open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
