"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateDealWizard } from "@/components/features/deals/create-deal-wizard";
import { Modal } from "@/components/ui/modal";
import { useFirm } from "@/components/providers/firm-provider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DealsPage() {
  const { firmId } = useFirm();
  const [showCreate, setShowCreate] = useState(false);
  const [showDead, setShowDead] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const { data, isLoading } = useSWR(`/api/deals?firmId=${firmId}`, fetcher);
  if (isLoading || !data)
    return <div className="text-sm text-gray-400">Loading...</div>;

  const deals = data.deals as any[];
  const stats = data.screeningStats as {
    docsProcessed: number;
    dealsScreened: number;
    passedToDD: number;
  };
  const analytics = data.pipelineAnalytics as {
    stageDistribution: Record<string, number>;
    valueByStage: Record<string, number>;
    pipelineValue: number;
    conversionRates: { screeningToDD: number; ddToIC: number; icToClose: number };
    totalActiveDeals: number;
    totalClosedDeals: number;
    totalDeadDeals: number;
  } | undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Deal Pipeline</h2>
        <Button onClick={() => setShowCreate(true)}>+ New Deal</Button>
      </div>

      {/* Pipeline Analytics */}
      {analytics && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Pipeline Analytics</h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-400">{deals.length} total deals</span>
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
      )}

      {/* Kanban Pipeline — 4 columns */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((s) => {
          const items = deals.filter((p: any) => p.stage === s.k);
          return (
            <div
              key={s.k}
              className={`${s.c} rounded-xl p-3 min-w-[260px] flex-1`}
            >
              <div className="text-xs font-semibold text-gray-700 mb-2 flex justify-between">
                {s.l}{" "}
                <span className="text-gray-400">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((p: any) => {
                  // Compute DD progress for DD+ stages
                  const totalTasks =
                    p.workstreams?.reduce(
                      (sum: number, ws: any) => sum + (ws.totalTasks || 0),
                      0,
                    ) ?? 0;
                  const completedTasks =
                    p.workstreams?.reduce(
                      (sum: number, ws: any) =>
                        sum + (ws.completedTasks || 0),
                      0,
                    ) ?? 0;
                  const ddPct =
                    totalTasks > 0
                      ? Math.round((completedTasks / totalTasks) * 100)
                      : 0;
                  const showDDProgress =
                    ["DUE_DILIGENCE", "IC_REVIEW", "CLOSING"].includes(
                      p.stage,
                    ) && totalTasks > 0;

                  // Compute closing checklist progress for Closing column
                  const closingItems = p.closingChecklist || [];
                  const closingTotal = closingItems.length;
                  const closingComplete = closingItems.filter((ci: any) => ci.status === "COMPLETE").length;
                  const closingPct = closingTotal > 0 ? Math.round((closingComplete / closingTotal) * 100) : 0;
                  const showClosingProgress = p.stage === "CLOSING" && closingTotal > 0;

                  return (
                    <Link
                      key={p.id}
                      href={`/deals/${p.id}`}
                      className="block bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-300 transition-colors"
                    >
                      {/* Deal name + category badge */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium truncate pr-2">
                          {p.name}
                        </div>
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

                      {/* DD Progress Bar */}
                      {showDDProgress && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                ddPct === 100
                                  ? "bg-emerald-400"
                                  : "bg-amber-400"
                              }`}
                              style={{ width: `${ddPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500">
                            {ddPct}%
                          </span>
                        </div>
                      )}

                      {/* Closing Checklist Progress */}
                      {showClosingProgress && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                closingPct === 100
                                  ? "bg-emerald-400"
                                  : "bg-indigo-400"
                              }`}
                              style={{ width: `${closingPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500">
                            {closingPct}% closing
                          </span>
                        </div>
                      )}

                      {/* Footer: Target size */}
                      <div className="mt-2 flex justify-between text-[10px] text-gray-500">
                        <span>{p.targetSize || ""}</span>
                        <span>{p.counterparty || ""}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <CreateDealWizard
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />

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
                {p.killReason && (
                  <Badge color="red">{p.killReason}</Badge>
                )}
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
