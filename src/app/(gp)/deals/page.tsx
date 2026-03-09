"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateDealWizard } from "@/components/features/deals/create-deal-wizard";
import { Modal } from "@/components/ui/modal";
import { useFirm } from "@/components/providers/firm-provider";
import { SearchFilterBar } from "@/components/ui/search-filter-bar";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { SectionErrorBoundary } from "@/components/ui/error-boundary";
import { ExportButton } from "@/components/ui/export-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/components/ui/toast";
import { LayoutList } from "lucide-react";
import { formatDate, fmt } from "@/lib/utils";

import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS,
  CAPITAL_INSTRUMENT_LABELS,
  PARTICIPATION_LABELS,
} from "@/lib/constants";

/* ── Pipeline stages (4 columns, no DEAD) ────────────── */
const stages = [
  { k: "SCREENING", l: "Screening", c: "bg-gray-50 dark:bg-gray-900" },
  { k: "DUE_DILIGENCE", l: "Due Diligence", c: "bg-blue-50 dark:bg-blue-950" },
  { k: "IC_REVIEW", l: "IC Review", c: "bg-amber-50 dark:bg-amber-950" },
  { k: "CLOSING", l: "Closing", c: "bg-emerald-50 dark:bg-emerald-950" },
];

const KILL_REASONS = [
  { value: "Pricing", label: "Pricing" },
  { value: "Risk", label: "Risk" },
  { value: "Timing", label: "Timing" },
  { value: "Sponsor", label: "Sponsor" },
  { value: "Other", label: "Other" },
];

const STAGE_LABELS: Record<string, string> = {
  SCREENING: "Screening",
  DUE_DILIGENCE: "Due Diligence",
  IC_REVIEW: "IC Review",
  CLOSING: "Closing",
  CLOSED: "Closed",
};

const VALID_ADVANCE_STAGES: Record<string, string> = {
  SCREENING: "DUE_DILIGENCE",
  DUE_DILIGENCE: "IC_REVIEW",
};

const DEAL_FILTERS = [
  {
    key: "stage",
    label: "Stage",
    options: [
      { value: "SCREENING", label: "Screening" },
      { value: "DUE_DILIGENCE", label: "Due Diligence" },
      { value: "IC_REVIEW", label: "IC Review" },
      { value: "CLOSING", label: "Closing" },
      { value: "CLOSED", label: "Closed" },
    ],
  },
  {
    key: "assetClass",
    label: "Asset Class",
    options: Object.entries(ASSET_CLASS_LABELS).map(([value, label]) => ({ value, label })),
  },
];

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DealsPage() {
  const { firmId } = useFirm();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [showDead, setShowDead] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  // Search, filters, and cursor state
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [allDeals, setAllDeals] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  // Bulk selection state
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());

  // Bulk action modal states
  const [bulkKillOpen, setBulkKillOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

  // Bulk kill form state
  const [bulkKillReason, setBulkKillReason] = useState("");
  const [bulkKillLoading, setBulkKillLoading] = useState(false);

  // Bulk assign form state
  const [bulkAssignLeadId, setBulkAssignLeadId] = useState("");
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);

  // Build query string
  const buildUrl = useCallback(
    (currentCursor?: string | null) => {
      const params = new URLSearchParams({ firmId, limit: "50" });
      if (search) params.set("search", search);
      for (const [k, v] of Object.entries(activeFilters)) {
        if (v) params.set(k, v);
      }
      if (currentCursor) params.set("cursor", currentCursor);
      return `/api/deals?${params.toString()}`;
    },
    [firmId, search, activeFilters],
  );

  const { data, isLoading, mutate } = useSWR(buildUrl(null), fetcher, {
    onSuccess: (result) => {
      setAllDeals(result.deals ?? []);
      setCursor(result.nextCursor ?? null);
    },
    revalidateOnFocus: false,
  });

  // Users for bulk assign — fetch GP team members
  const { data: usersData } = useSWR(`/api/users?firmId=${firmId}`, fetcher);
  const gpUsers = (usersData ?? []).filter(
    (u: any) => u.role === "GP_ADMIN" || u.role === "GP_TEAM",
  );

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setAllDeals([]);
    setCursor(null);
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
    setAllDeals([]);
    setCursor(null);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(cursor));
      const result = await res.json();
      setAllDeals((prev) => [...prev, ...(result.deals ?? [])]);
      setCursor(result.nextCursor ?? null);
    } catch (e) {
      console.error("Load more failed", e);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, buildUrl]);

  const deals = allDeals;
  const hasMore = !!cursor;
  const hasFilters = !!(search || Object.values(activeFilters).some(Boolean));

  const handleClearFilters = () => {
    setSearch("");
    setActiveFilters({});
    setAllDeals([]);
    setCursor(null);
  };

  // Toggle deal selection
  function toggleDealSelection(id: string) {
    setSelectedDealIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedDealIds(new Set());
  }

  // Bulk kill action
  async function handleBulkKill() {
    if (!bulkKillReason) return;
    setBulkKillLoading(true);
    try {
      const res = await fetch("/api/deals/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealIds: [...selectedDealIds],
          action: "kill",
          killReason: bulkKillReason,
          firmId,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        const msg = typeof result.error === "string" ? result.error : "Failed to kill deals";
        toast.error(msg);
        return;
      }
      clearSelection();
      setBulkKillOpen(false);
      setBulkKillReason("");
      mutate();
      toast.success(`${result.updated} deal${result.updated !== 1 ? "s" : ""} killed`);
    } catch {
      toast.error("Failed to kill deals");
    } finally {
      setBulkKillLoading(false);
    }
  }

  // Bulk assign action
  async function handleBulkAssign() {
    if (!bulkAssignLeadId) return;
    setBulkAssignLoading(true);
    try {
      const res = await fetch("/api/deals/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealIds: [...selectedDealIds],
          action: "assign",
          assignLeadId: bulkAssignLeadId,
          firmId,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        const msg = typeof result.error === "string" ? result.error : "Failed to assign lead";
        toast.error(msg);
        return;
      }
      clearSelection();
      setBulkAssignOpen(false);
      setBulkAssignLeadId("");
      mutate();
      toast.success(`Lead assigned to ${result.updated} deal${result.updated !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to assign lead");
    } finally {
      setBulkAssignLoading(false);
    }
  }

  // Bulk advance action
  async function handleBulkAdvance() {
    // Client-side validation: all selected deals must be in the same stage
    const selectedDeals = deals.filter((d: any) => selectedDealIds.has(d.id));
    const uniqueStages = [...new Set(selectedDeals.map((d: any) => d.stage as string))];

    if (uniqueStages.length > 1) {
      toast.error("All selected deals must be in the same stage to advance");
      return;
    }

    const currentStage = uniqueStages[0];
    if (!currentStage || !VALID_ADVANCE_STAGES[currentStage]) {
      toast.error("Cannot bulk advance deals past IC Review — IC decisions required individually");
      return;
    }

    const nextStage = VALID_ADVANCE_STAGES[currentStage];

    try {
      const res = await fetch("/api/deals/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealIds: [...selectedDealIds],
          action: "advance",
          firmId,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        const msg = typeof result.error === "string" ? result.error : "Failed to advance deals";
        toast.error(msg);
        return;
      }
      clearSelection();
      mutate();
      toast.success(
        `${result.updated} deal${result.updated !== 1 ? "s" : ""} advanced to ${STAGE_LABELS[nextStage] ?? nextStage}`,
      );
    } catch {
      toast.error("Failed to advance deals");
    }
  }

  const analytics = data?.pipelineAnalytics as {
    stageDistribution: Record<string, number>;
    valueByStage: Record<string, number>;
    pipelineValue: number;
    conversionRates: { screeningToDD: number; ddToIC: number; icToClose: number };
    totalActiveDeals: number;
    totalClosedDeals: number;
    totalDeadDeals: number;
  } | undefined;

  const anySelected = selectedDealIds.size > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Deal Pipeline"
        subtitle={`${data?.total ?? deals.length} deals`}
        actions={
          <SearchFilterBar
            filters={DEAL_FILTERS}
            onFilterChange={handleFilterChange}
            activeFilters={activeFilters}
          >
            <ExportButton
              data={deals.map((d: any) => ({
                id: d.id,
                name: d.name,
                assetClass: d.assetClass,
                stage: d.stage,
                targetReturn: d.targetReturn ?? "",
                targetSize: d.targetSize ?? "",
                dealLead: d.dealLead?.name ?? "",
                status: d.status ?? d.stage,
                createdAt: d.createdAt ? formatDate(d.createdAt) : "",
              }))}
              fileName="Deals_Export"
            />
            <Button onClick={() => setShowCreate(true)}>+ New Deal</Button>
          </SearchFilterBar>
        }
      />

      {/* Pipeline Analytics */}
      {analytics && (
        <SectionErrorBoundary>
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Pipeline Analytics</h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-400">{data?.total ?? deals.length} total deals</span>
                <Link href="/analytics" className="text-xs text-indigo-600 hover:underline font-medium">
                  View Full Analytics &rarr;
                </Link>
              </div>
            </div>

            {/* Top-level stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-[10px] text-gray-500">Active Deals</div>
                <div className="text-lg font-bold text-gray-900">{analytics.totalActiveDeals}</div>
              </div>
              <button onClick={() => setShowClosed(true)} className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-3 text-center hover:ring-2 hover:ring-emerald-300 transition-all cursor-pointer">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Closed</div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{analytics.totalClosedDeals}</div>
              </button>
              <button onClick={() => setShowDead(true)} className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center hover:ring-2 hover:ring-red-300 transition-all cursor-pointer">
                <div className="text-[10px] text-red-500 dark:text-red-400">Dead</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-300">{analytics.totalDeadDeals}</div>
              </button>
              <div className="bg-indigo-50 dark:bg-indigo-950 rounded-lg p-3 text-center">
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400">Pipeline Value</div>
                <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                  {analytics.pipelineValue >= 1_000_000_000
                    ? `$${(analytics.pipelineValue / 1_000_000_000).toFixed(1)}B`
                    : analytics.pipelineValue >= 1_000_000
                    ? `$${(analytics.pipelineValue / 1_000_000).toFixed(0)}M`
                    : analytics.pipelineValue > 0
                    ? `$${(analytics.pipelineValue / 1_000).toFixed(0)}K`
                    : "—"}
                </div>
              </div>
            </div>

            {/* Deal Flow Funnel */}
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">Deal Flow</div>
              <div className="space-y-1.5">
                {[
                  { label: "Screening", count: analytics.stageDistribution.SCREENING ?? 0, color: "bg-gray-400", pct: 100 },
                  { label: "Due Diligence", count: analytics.stageDistribution.DUE_DILIGENCE ?? 0, color: "bg-blue-500", pct: analytics.conversionRates.screeningToDD },
                  { label: "IC Review", count: analytics.stageDistribution.IC_REVIEW ?? 0, color: "bg-amber-500", pct: analytics.conversionRates.ddToIC },
                  { label: "Closing", count: analytics.stageDistribution.CLOSING ?? 0, color: "bg-emerald-500", pct: analytics.conversionRates.icToClose },
                ].map((stage) => (
                  <div key={stage.label} className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-600 w-24 text-right">{stage.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 relative overflow-hidden">
                      <div
                        className={`h-full rounded-full ${stage.color} transition-all`}
                        style={{ width: `${Math.max(stage.pct, stage.count > 0 ? 5 : 0)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-gray-700 w-6 text-right">{stage.count}</span>
                    <span className="text-[10px] text-gray-400 w-10">{stage.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Value by stage */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Screening", value: analytics.valueByStage.SCREENING ?? 0, border: "border-gray-200 dark:border-gray-700" },
                { label: "Due Diligence", value: analytics.valueByStage.DUE_DILIGENCE ?? 0, border: "border-blue-200 dark:border-blue-800" },
                { label: "IC Review", value: analytics.valueByStage.IC_REVIEW ?? 0, border: "border-amber-200 dark:border-amber-800" },
                { label: "Closing", value: analytics.valueByStage.CLOSING ?? 0, border: "border-emerald-200 dark:border-emerald-800" },
              ].map((s) => (
                <div key={s.label} className={`border ${s.border} rounded-lg p-2 text-center`}>
                  <div className="text-[10px] text-gray-500">{s.label}</div>
                  <div className="text-xs font-semibold text-gray-900">
                    {s.value >= 1_000_000_000
                      ? `$${(s.value / 1_000_000_000).toFixed(1)}B`
                      : s.value >= 1_000_000
                      ? `$${(s.value / 1_000_000).toFixed(0)}M`
                      : s.value >= 1_000
                      ? `$${(s.value / 1_000).toFixed(0)}K`
                      : s.value > 0
                      ? `$${s.value.toLocaleString()}`
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionErrorBoundary>
      )}

      {/* Kanban Pipeline — 4 columns */}
      {isLoading && deals.length === 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stages.map((s) => (
            <div key={s.k} className={`${s.c} rounded-xl p-3 min-w-[260px] flex-1`}>
              <div className="text-xs font-semibold text-gray-700 mb-2">{s.l}</div>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                    <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : deals.length === 0 ? (
        <EmptyState
          icon={<LayoutList className="h-10 w-10" />}
          title={hasFilters ? "No results match your filters" : "No deals yet"}
          description={!hasFilters ? "Create your first deal to start tracking your pipeline" : undefined}
          action={!hasFilters ? { label: "+ New Deal", onClick: () => setShowCreate(true) } : undefined}
          filtered={hasFilters}
          onClearFilters={hasFilters ? handleClearFilters : undefined}
        />
      ) : (
        <>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stages.map((s) => {
              const items = deals.filter((p: any) => p.stage === s.k);
              return (
                <div key={s.k} className={`${s.c} rounded-xl p-3 min-w-[260px] flex-1`}>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex justify-between items-center">
                    <span>{s.l} <span className="text-gray-400">({items.length})</span></span>
                    {analytics?.valueByStage?.[s.k] ? (
                      <span className="text-gray-400 font-normal">{fmt(analytics.valueByStage[s.k])}</span>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {items.map((p: any) => {
                      const totalTasks = p.workstreams?.reduce((sum: number, ws: any) => sum + (ws.totalTasks || 0), 0) ?? 0;
                      const completedTasks = p.workstreams?.reduce((sum: number, ws: any) => sum + (ws.completedTasks || 0), 0) ?? 0;
                      const ddPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                      const showDDProgress = ["DUE_DILIGENCE", "IC_REVIEW", "CLOSING"].includes(p.stage) && totalTasks > 0;
                      const closingItems = p.closingChecklist || [];
                      const closingTotal = closingItems.length;
                      const closingComplete = closingItems.filter((ci: any) => ci.status === "COMPLETE").length;
                      const closingPct = closingTotal > 0 ? Math.round((closingComplete / closingTotal) * 100) : 0;
                      const showClosingProgress = p.stage === "CLOSING" && closingTotal > 0;
                      const isSelected = selectedDealIds.has(p.id);

                      return (
                        <div key={p.id} className="relative group">
                          {/* Checkbox — visible on hover, or always when any deal is selected */}
                          <div
                            className={`absolute top-2 left-2 z-10 transition-opacity ${
                              anySelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleDealSelection(p.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600 cursor-pointer"
                            />
                          </div>

                          <Link
                            href={`/deals/${p.id}`}
                            className={`block bg-white rounded-lg p-3 shadow-sm border cursor-pointer hover:border-indigo-300 transition-colors pl-8 ${
                              isSelected
                                ? "border-indigo-400 ring-1 ring-indigo-300"
                                : "border-gray-100"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-sm font-medium truncate pr-2">{p.name}</div>
                              {p.dealLead?.initials && (
                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                  {p.dealLead.initials}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge color={ASSET_CLASS_COLORS[p.assetClass] || "gray"}>
                                {ASSET_CLASS_LABELS[p.assetClass] || p.assetClass}
                              </Badge>
                              {p.capitalInstrument && (
                                <Badge color={p.capitalInstrument === "DEBT" ? "orange" : "blue"}>
                                  {CAPITAL_INSTRUMENT_LABELS[p.capitalInstrument]}
                                </Badge>
                              )}
                              {p.participationStructure && (
                                <Badge color={p.participationStructure === "DIRECT_GP" ? "purple" : p.participationStructure === "CO_INVEST_JV_PARTNERSHIP" ? "indigo" : "gray"}>
                                  {PARTICIPATION_LABELS[p.participationStructure] || p.participationStructure}
                                </Badge>
                              )}
                            </div>
                            {showDDProgress && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full ${ddPct === 100 ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${ddPct}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-500">{ddPct}%</span>
                              </div>
                            )}
                            {showClosingProgress && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full ${closingPct === 100 ? "bg-emerald-400" : "bg-indigo-400"}`} style={{ width: `${closingPct}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-500">{closingPct}% closing</span>
                              </div>
                            )}
                            {p.killReason && <Badge color="red">{p.killReason}</Badge>}
                            {p.killReasonText && (
                              <div className="mt-1 text-[10px] text-red-500 line-clamp-2">{p.killReasonText}</div>
                            )}
                            <div className="mt-2 flex justify-between text-[10px] text-gray-500">
                              <span>{p.targetSize || ""}</span>
                              <div className="flex items-center gap-1.5">
                                {p.daysInStage != null && (
                                  <span
                                    className={`font-medium ${
                                      p.daysInStage > 30
                                        ? "text-red-500"
                                        : p.daysInStage >= 14
                                          ? "text-amber-500"
                                          : "text-gray-400"
                                    }`}
                                  >
                                    {p.daysInStage}d
                                  </span>
                                )}
                                <span>{p.counterparty || ""}</span>
                              </div>
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                    {items.length === 0 && (
                      <div className="text-center py-6 text-[10px] text-gray-400">No deals in this stage</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More */}
          <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={handleLoadMore} />
        </>
      )}

      {/* Floating action bar — visible when deals are selected */}
      {anySelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4">
          <span className="text-sm font-medium">{selectedDealIds.size} selected</span>
          <div className="w-px h-6 bg-gray-600" />
          <button
            onClick={() => setBulkKillOpen(true)}
            className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-gray-800"
          >
            Kill All
          </button>
          <button
            onClick={() => setBulkAssignOpen(true)}
            className="text-xs font-medium text-blue-300 hover:text-blue-200 transition-colors px-2 py-1 rounded hover:bg-gray-800"
          >
            Assign Lead
          </button>
          <button
            onClick={handleBulkAdvance}
            className="text-xs font-medium text-emerald-300 hover:text-emerald-200 transition-colors px-2 py-1 rounded hover:bg-gray-800"
          >
            Advance Stage
          </button>
          <div className="w-px h-6 bg-gray-600" />
          <button
            onClick={clearSelection}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors px-1"
            aria-label="Clear selection"
          >
            &times; Clear
          </button>
        </div>
      )}

      <CreateDealWizard open={showCreate} onClose={() => setShowCreate(false)} />

      {/* Bulk Kill Modal */}
      <Modal
        open={bulkKillOpen}
        onClose={() => {
          setBulkKillOpen(false);
          setBulkKillReason("");
        }}
        title={`Kill ${selectedDealIds.size} Deal${selectedDealIds.size !== 1 ? "s" : ""}`}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setBulkKillOpen(false);
                setBulkKillReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleBulkKill}
              loading={bulkKillLoading}
              disabled={!bulkKillReason}
            >
              Kill {selectedDealIds.size} Deal{selectedDealIds.size !== 1 ? "s" : ""}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will move{" "}
            <span className="font-semibold">
              {selectedDealIds.size} deal{selectedDealIds.size !== 1 ? "s" : ""}
            </span>{" "}
            to the Dead stage. You can revive them individually later.
          </p>
          <FormField label="Kill Reason" required>
            <Select
              value={bulkKillReason}
              onChange={(e) => setBulkKillReason(e.target.value)}
              options={[
                { value: "", label: "— Select a reason —" },
                ...KILL_REASONS,
              ]}
            />
          </FormField>
        </div>
      </Modal>

      {/* Bulk Assign Lead Modal */}
      <Modal
        open={bulkAssignOpen}
        onClose={() => {
          setBulkAssignOpen(false);
          setBulkAssignLeadId("");
        }}
        title={`Assign Lead to ${selectedDealIds.size} Deal${selectedDealIds.size !== 1 ? "s" : ""}`}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setBulkAssignOpen(false);
                setBulkAssignLeadId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              loading={bulkAssignLoading}
              disabled={!bulkAssignLeadId}
            >
              Assign Lead
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select a team member to assign as deal lead for{" "}
            <span className="font-semibold">
              {selectedDealIds.size} deal{selectedDealIds.size !== 1 ? "s" : ""}
            </span>.
          </p>
          <FormField label="Team Member" required>
            <Select
              value={bulkAssignLeadId}
              onChange={(e) => setBulkAssignLeadId(e.target.value)}
              options={[
                { value: "", label: "— Select a team member —" },
                ...gpUsers.map((u: any) => ({ value: u.id, label: u.name })),
              ]}
            />
          </FormField>
        </div>
      </Modal>

      {/* Closed Deals Modal */}
      <Modal
        open={showClosed}
        onClose={() => setShowClosed(false)}
        title={`Closed Deals (${deals.filter((d: any) => d.stage === "CLOSED").length})`}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          {deals.filter((d: any) => d.stage === "CLOSED").map((p: any) => (
            <Link
              key={p.id}
              href={`/deals/${p.id}`}
              onClick={() => setShowClosed(false)}
              className="block bg-white rounded-lg p-3 shadow-sm border border-emerald-100 cursor-pointer hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium truncate pr-2">{p.name}</div>
                <Badge color="green">Closed</Badge>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge color={ASSET_CLASS_COLORS[p.assetClass] || "gray"}>
                  {ASSET_CLASS_LABELS[p.assetClass] || p.assetClass}
                </Badge>
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-gray-500">
                <span>{p.targetSize || ""}</span>
                <span>{p.counterparty || ""}</span>
              </div>
            </Link>
          ))}
          {deals.filter((d: any) => d.stage === "CLOSED").length === 0 && (
            <div className="col-span-2 text-center py-8 text-sm text-gray-400">No closed deals yet</div>
          )}
        </div>
      </Modal>

      {/* Dead Deals Modal */}
      <Modal
        open={showDead}
        onClose={() => setShowDead(false)}
        title={`Dead Deals (${deals.filter((d: any) => d.stage === "DEAD").length})`}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          {deals.filter((d: any) => d.stage === "DEAD").map((p: any) => (
            <Link
              key={p.id}
              href={`/deals/${p.id}`}
              onClick={() => setShowDead(false)}
              className="block bg-white rounded-lg p-3 shadow-sm border border-red-100 cursor-pointer hover:border-red-300 transition-colors opacity-80"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium truncate pr-2">{p.name}</div>
                <Badge color="red">Dead</Badge>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge color={ASSET_CLASS_COLORS[p.assetClass] || "gray"}>
                  {ASSET_CLASS_LABELS[p.assetClass] || p.assetClass}
                </Badge>
                {p.killReason && <Badge color="red">{p.killReason}</Badge>}
              </div>
              {p.killReasonText && (
                <div className="mt-1 text-[10px] text-red-500 line-clamp-2">{p.killReasonText}</div>
              )}
              <div className="mt-2 flex justify-between text-[10px] text-gray-500">
                <span>{p.targetSize || ""}</span>
                <span>{p.counterparty || ""}</span>
              </div>
            </Link>
          ))}
          {deals.filter((d: any) => d.stage === "DEAD").length === 0 && (
            <div className="col-span-2 text-center py-8 text-sm text-gray-400">No dead deals</div>
          )}
        </div>
      </Modal>
    </div>
  );
}
