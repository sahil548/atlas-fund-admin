"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt, cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { useFirm } from "@/components/providers/firm-provider";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Building } from "lucide-react";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { ExportButton } from "@/components/ui/export-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { VehicleOrgChart } from "@/components/features/entities/vehicle-org-chart";
import { VehicleCardsView } from "@/components/features/entities/vehicle-cards-view";
import { ChevronRight, ChevronDown } from "lucide-react";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

/* eslint-disable @typescript-eslint/no-explicit-any */

type ViewMode = "flat" | "orgchart" | "cards";

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: "flat", label: "Flat" },
  { key: "orgchart", label: "Org Chart" },
  { key: "cards", label: "Cards" },
];

export default function EntitiesPage() {
  const { firmId } = useFirm();
  const [cursor, setCursor] = useState<string | null>(null);
  const [allEntities, setAllEntities] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("flat");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const buildUrl = useCallback(
    (currentCursor?: string | null) => {
      const params = new URLSearchParams({ firmId, limit: "50" });
      if (currentCursor) params.set("cursor", currentCursor);
      return `/api/entities?${params.toString()}`;
    },
    [firmId],
  );

  const { isLoading } = useSWR(buildUrl(null), fetcher, {
    onSuccess: (result) => {
      setAllEntities(result.data ?? []);
      setCursor(result.nextCursor ?? null);
    },
    revalidateOnFocus: false,
  });

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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vehicles"
        subtitle={`${allEntities.length} vehicles`}
        actions={
          <div className="flex items-center gap-2">
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
          </div>
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
                    title="No vehicles yet"
                    description="Use the command bar (Cmd+K) to create your first vehicle"
                  />
                </td></tr>
              ) : (
                (() => {
                  // Build hierarchy for expand/collapse
                  const childrenMap = new Map<string, any[]>();
                  allEntities.forEach((e: any) => {
                    if (e.parentEntityId) {
                      const siblings = childrenMap.get(e.parentEntityId) || [];
                      siblings.push(e);
                      childrenMap.set(e.parentEntityId, siblings);
                    }
                  });
                  const entityIds = new Set(allEntities.map((e: any) => e.id));
                  const roots = allEntities.filter((e: any) => !e.parentEntityId || !entityIds.has(e.parentEntityId));

                  const toggleExpand = (id: string) => {
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    });
                  };

                  const renderRow = (e: any, depth: number) => {
                    const hasChildren = childrenMap.has(e.id);
                    const isExpanded = expanded.has(e.id);
                    return (
                      <tr key={e.id} className={cn("border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800", depth > 0 && "bg-gray-50/50 dark:bg-gray-800/30")}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center" style={{ paddingLeft: depth * 24 }}>
                            {hasChildren ? (
                              <button onClick={() => toggleExpand(e.id)} className="mr-1.5 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                              </button>
                            ) : (
                              <span className="mr-1.5 w-[18px]" />
                            )}
                            <Link href={`/entities/${e.id}`} className="font-medium text-indigo-700 hover:underline dark:text-indigo-400">{e.name}</Link>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge color={e.entityType === "MAIN_FUND" ? "indigo" : e.entityType === "SIDECAR" ? "purple" : e.entityType === "SPV" ? "blue" : e.entityType === "CO_INVEST_VEHICLE" || e.entityType === "CO_INVEST" ? "teal" : "gray"}>
                            {e.entityType?.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">{e.vintageYear}</td>
                        <td className="px-3 py-2.5">{fmt(e.totalCommitments || e.totalCommitted || 0)}</td>
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
                    );
                  };

                  const rows: React.ReactNode[] = [];
                  for (const root of roots) {
                    rows.push(renderRow(root, 0));
                    if (expanded.has(root.id)) {
                      for (const child of (childrenMap.get(root.id) || [])) {
                        rows.push(renderRow(child, 1));
                        // Support nested children (depth 2)
                        if (expanded.has(child.id)) {
                          for (const grandchild of (childrenMap.get(child.id) || [])) {
                            rows.push(renderRow(grandchild, 2));
                          }
                        }
                      }
                    }
                  }
                  return rows;
                })()
              )}
            </tbody>
          </table>
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

      {/* Load more (only visible in flat mode where pagination matters) */}
      {viewMode === "flat" && (
        <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={handleLoadMore} />
      )}
    </div>
  );
}
