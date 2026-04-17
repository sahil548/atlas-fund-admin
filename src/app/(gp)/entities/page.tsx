"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fmt, cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { useFirm } from "@/components/providers/firm-provider";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Building } from "lucide-react";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { ExportButton } from "@/components/ui/export-button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionPanel } from "@/components/ui/section-panel";
import { VehicleOrgChart } from "@/components/features/entities/vehicle-org-chart";
import { VehicleCardsView } from "@/components/features/entities/vehicle-cards-view";
import { CreateEntityForm } from "@/components/features/entities/create-entity-form";
import { ChevronRight, ChevronDown } from "lucide-react";

type EntitySortKey = "name" | "entityType" | "vintageYear" | "status";
type SortDir = "asc" | "desc";

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<EntitySortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(k: EntitySortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  }

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", entityType: "", vintageYear: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const buildUrl = useCallback(
    (currentCursor?: string | null) => {
      const params = new URLSearchParams({ firmId, limit: "50" });
      if (search) params.set("search", search);
      if (currentCursor) params.set("cursor", currentCursor);
      return `/api/entities?${params.toString()}`;
    },
    [firmId, search],
  );

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setAllEntities([]);
    setCursor(null);
  }, []);

  const { isLoading } = useSWR(buildUrl(null), fetcher, {
    onSuccess: (result) => {
      setAllEntities(result.data ?? []);
      setCursor(result.nextCursor ?? null);
    },
    revalidateOnFocus: false,
  });

  const sortedEntities = useMemo(() =>
    [...allEntities].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    }),
    [allEntities, sortKey, sortDir]
  );

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

  function revalidateEntities() {
    mutate(buildUrl(null));
  }

  function startEdit(e: any) {
    setEditingId(e.id);
    setEditForm({
      name: e.name || "",
      entityType: e.entityType || "MAIN_FUND",
      vintageYear: e.vintageYear ? String(e.vintageYear) : "",
    });
  }

  async function handleEditSave() {
    if (!editingId || !editForm.name.trim()) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/entities/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          entityType: editForm.entityType,
          ...(editForm.vintageYear ? { vintageYear: Number(editForm.vintageYear) } : {}),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(typeof d.error === "string" ? d.error : "Failed to update");
        return;
      }
      revalidateEntities();
      setEditingId(null);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/entities/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(typeof d.error === "string" ? d.error : "Failed to delete");
        return;
      }
      revalidateEntities();
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const hasMore = !!cursor;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vehicles"
        subtitle={`${allEntities.length} vehicles`}
        actions={
          <div className="flex items-center gap-2">
            <SearchFilterBar
              filters={[]}
              onSearch={handleSearch}
              onFilterChange={() => {}}
              activeFilters={activeFilters}
            />
            <Button size="sm" onClick={() => setShowCreateForm(true)}>+ New Vehicle</Button>
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
                {(["Vehicle", "Type", "Vintage"] as const).map((h, i) => {
                  const colKey: EntitySortKey = i === 0 ? "name" : i === 1 ? "entityType" : "vintageYear";
                  const isActive = sortKey === colKey;
                  return (
                    <th
                      key={h}
                      className={cn(
                        "text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:text-gray-900 hover:bg-gray-100 transition-colors",
                        isActive && "text-indigo-700",
                      )}
                      onClick={() => handleSort(colKey)}
                    >
                      {h}{isActive ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                  );
                })}
                {["Committed", "Called", "Distributed"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                ))}
                <th
                  className={cn(
                    "text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:text-gray-900 hover:bg-gray-100 transition-colors",
                    sortKey === "status" && "text-indigo-700",
                  )}
                  onClick={() => handleSort("status")}
                >
                  Formation{sortKey === "status" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </th>
                {["Accounting", "Actions"].map((h) => (
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
                  // Use sortedEntities for roots so sort order applies
                  const roots = sortedEntities.filter((e: any) => !e.parentEntityId || !entityIds.has(e.parentEntityId));

                  const toggleExpand = (id: string) => {
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    });
                  };

                  const ENTITY_TYPES = [
                    { value: "MAIN_FUND", label: "Main Fund" },
                    { value: "SIDECAR", label: "Sidecar" },
                    { value: "SPV", label: "SPV" },
                    { value: "CO_INVEST_VEHICLE", label: "Co-Invest Vehicle" },
                    { value: "GP_ENTITY", label: "GP Entity" },
                    { value: "HOLDING_COMPANY", label: "Holding Company" },
                  ];

                  const renderRow = (e: any, depth: number) => {
                    const hasChildren = childrenMap.has(e.id);
                    const isExpanded = expanded.has(e.id);
                    const isEditing = editingId === e.id;

                    if (isEditing) {
                      return (
                        <tr key={e.id} className="border-t border-gray-50 bg-indigo-50/40 dark:bg-indigo-900/10">
                          <td className="px-3 py-2">
                            <input
                              value={editForm.name}
                              onChange={(ev) => setEditForm((f) => ({ ...f, name: ev.target.value }))}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={editForm.entityType}
                              onChange={(ev) => setEditForm((f) => ({ ...f, entityType: ev.target.value }))}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            >
                              {ENTITY_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={editForm.vintageYear}
                              onChange={(ev) => setEditForm((f) => ({ ...f, vintageYear: ev.target.value }))}
                              placeholder="Year"
                              className="w-20 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                          </td>
                          <td className="px-3 py-2.5" colSpan={5}></td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={handleEditSave}
                                disabled={editSaving}
                                className="text-[10px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded px-2 py-1 disabled:opacity-50"
                              >
                                {editSaving ? "Saving…" : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-[10px] font-medium text-gray-500 hover:text-gray-700 rounded px-2 py-1"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => { setEditingId(null); setDeleteTarget(e); }}
                                className="text-[10px] font-medium text-red-500 hover:text-red-700 rounded px-2 py-1 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={e.id} className={cn("border-t border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800 group", depth > 0 && "bg-gray-50/50 dark:bg-gray-800/30")}>
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
                          <div className="flex items-center gap-1">
                            <Link href={`/entities/${e.id}`}>
                              <Button variant="secondary" size="sm">View</Button>
                            </Link>
                            <button
                              onClick={() => startEdit(e)}
                              className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 rounded px-2 py-1 hover:bg-indigo-50 border border-indigo-200"
                            >
                              Edit
                            </button>
                          </div>
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

      {/* Create vehicle modal */}
      <CreateEntityForm open={showCreateForm} onClose={() => { setShowCreateForm(false); revalidateEntities(); }} />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Vehicle"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}"? This will remove the vehicle and all associated data. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
