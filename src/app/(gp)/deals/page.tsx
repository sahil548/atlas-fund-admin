"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateDealWizard } from "@/components/features/deals/create-deal-wizard";
import { useFirm } from "@/components/providers/firm-provider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS,
  CAPITAL_INSTRUMENT_LABELS,
} from "@/lib/constants";

/* ── Pipeline stages (4 columns, no DEAD) ────────────── */
const stages = [
  { k: "SCREENING", l: "Screening", c: "bg-gray-50" },
  { k: "DUE_DILIGENCE", l: "Due Diligence", c: "bg-blue-50" },
  { k: "IC_REVIEW", l: "IC Review", c: "bg-amber-50" },
  { k: "CLOSING", l: "Closing", c: "bg-emerald-50" },
];

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DealsPage() {
  const { firmId } = useFirm();
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useSWR(`/api/deals?firmId=${firmId}`, fetcher);
  if (isLoading || !data)
    return <div className="text-sm text-gray-400">Loading...</div>;

  const deals = data.deals as any[];
  const stats = data.screeningStats as {
    docsProcessed: number;
    dealsScreened: number;
    passedToDD: number;
    passRate: string;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Deal Pipeline</h2>
        <Button onClick={() => setShowCreate(true)}>+ New Deal</Button>
      </div>

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
                        {p.sector && (
                          <span className="text-[10px] text-gray-500">
                            {p.sector}
                          </span>
                        )}
                      </div>

                      {/* AI Score Pill */}
                      {p.aiScore != null && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              p.aiScore >= 80
                                ? "bg-emerald-100 text-emerald-700"
                                : p.aiScore >= 60
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            AI: {p.aiScore}
                          </span>
                          {p.aiFlag && (
                            <span className="text-[10px] text-gray-500 truncate">
                              {p.aiFlag}
                            </span>
                          )}
                        </div>
                      )}

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

      {/* AI Screening Engine Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">AI Screening Engine</div>
            <div className="text-xs opacity-80 mt-1">
              Upload documents → auto-extract metrics → flag risks →
              categorize DD workstreams
            </div>
          </div>
          <div />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {[
            { l: "Docs Processed", v: `${stats.docsProcessed} this qtr` },
            { l: "Avg Screen Time", v: "< 3 min" },
            { l: "Deals Screened", v: `${stats.dealsScreened} this qtr` },
            { l: "Pass Rate", v: stats.passRate },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white/10 rounded-lg p-2 text-center"
            >
              <div className="text-[10px] opacity-70">{s.l}</div>
              <div className="text-sm font-semibold">{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <CreateDealWizard
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
