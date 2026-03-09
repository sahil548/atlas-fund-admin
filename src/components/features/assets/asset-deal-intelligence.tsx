"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { fmt, formatDate } from "@/lib/utils";
import Link from "next/link";

/* eslint-disable @typescript-eslint/no-explicit-any */

const REC_COLORS: Record<string, string> = {
  APPROVE: "green",
  APPROVE_WITH_CONDITIONS: "yellow",
  DECLINE: "red",
  GO: "green",
  NO_GO: "red",
  NEEDS_MORE_INFO: "yellow",
};

const RISK_COLORS: Record<string, string> = {
  HIGH: "red",
  MEDIUM: "yellow",
  LOW: "green",
};

interface AssetDealIntelligenceProps {
  deal: any;
  asset: { costBasis: number; fairValue: number; moic?: number; irr?: number };
}

export function AssetDealIntelligence({ deal, asset }: AssetDealIntelligenceProps) {
  const [expandedWorkstream, setExpandedWorkstream] = useState<string | null>(null);
  const [memoExpanded, setMemoExpanded] = useState(false);

  const memo = deal.screeningResult?.memo;
  const workstreams = (deal.workstreams || []).filter((w: any) => w.analysisType !== "IC_MEMO");
  const allTasks = workstreams.flatMap((w: any) => w.tasks || []);
  const completedTasks = allTasks.filter((t: any) => t.status === "DONE");
  const icProcess = deal.icProcess;

  return (
    <div className="space-y-4">
      {/* Header with link to source deal */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Deal Intelligence</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              From deal: {deal.name} · Lead: {deal.dealLead?.name || "Unassigned"}
            </p>
          </div>
          <Link
            href={`/deals/${deal.id}`}
            className="text-xs text-indigo-600 hover:underline font-medium"
          >
            View Full Deal Record &rarr;
          </Link>
        </div>

        {/* Projected vs Actual */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase">Target Size</div>
            <div className="text-sm font-bold text-gray-900">{deal.targetSize || "—"}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Projected</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase">Cost Basis</div>
            <div className="text-sm font-bold text-gray-900">{fmt(asset.costBasis)}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Actual</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase">Target Return</div>
            <div className="text-sm font-bold text-gray-900">{deal.targetReturn || "—"}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Projected</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase">Current MOIC / IRR</div>
            <div className="text-sm font-bold text-gray-900">
              {asset.moic ? `${asset.moic.toFixed(2)}x` : "—"}
              {asset.irr ? ` / ${(asset.irr * 100).toFixed(1)}%` : ""}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Actual</div>
          </div>
        </div>

        {/* IC Decision */}
        {icProcess && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-gray-500">IC Decision:</span>
            <Badge color={icProcess.finalDecision === "APPROVED" ? "green" : icProcess.finalDecision === "REJECTED" ? "red" : "yellow"}>
              {icProcess.finalDecision || "Pending"}
            </Badge>
            {icProcess.votes?.length > 0 && (
              <span className="text-gray-400">
                ({icProcess.votes.length} vote{icProcess.votes.length !== 1 ? "s" : ""})
              </span>
            )}
          </div>
        )}
      </div>

      {/* IC Memo */}
      {memo && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setMemoExpanded(!memoExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className={`transition-transform inline-block text-xs ${memoExpanded ? "rotate-90" : ""}`}>&#9654;</span>
              <span className="text-sm font-semibold text-gray-900">IC Memo</span>
              {memo.recommendation && (
                <Badge color={REC_COLORS[memo.recommendation] || "gray"}>
                  {memo.recommendation.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-400">
              Generated {deal.screeningResult?.memoGeneratedAt ? formatDate(deal.screeningResult.memoGeneratedAt) : "—"}
            </span>
          </button>

          {memoExpanded && (
            <div className="p-4 space-y-3">
              {memo.summary && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">Executive Summary</div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{memo.summary}</p>
                </div>
              )}
              {Array.isArray(memo.sections) && memo.sections.length > 0 && (
                <div className="space-y-2">
                  {memo.sections.map((section: any, i: number) => (
                    <div key={i} className="bg-gray-50 rounded-lg border border-gray-100 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-800">{section.name}</span>
                        {section.riskLevel && (
                          <Badge color={RISK_COLORS[section.riskLevel] || "gray"}>{section.riskLevel}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{section.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* DD Reports */}
      {workstreams.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Due Diligence Reports ({workstreams.length})
          </h3>
          <div className="space-y-2">
            {workstreams.map((ws: any) => {
              const result = ws.analysisResult;
              const isExpanded = expandedWorkstream === ws.id;
              const taskCount = ws.tasks?.length || 0;
              const doneTasks = ws.tasks?.filter((t: any) => t.status === "DONE").length || 0;

              return (
                <div key={ws.id} className="border border-gray-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedWorkstream(isExpanded ? null : ws.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`transition-transform inline-block text-[10px] ${isExpanded ? "rotate-90" : ""}`}>&#9654;</span>
                      <span className={`w-2 h-2 rounded-full ${result ? "bg-emerald-400" : "bg-gray-300"}`} />
                      <span className="text-xs font-medium text-gray-800">{ws.name}</span>
                      {result?.recommendation && (
                        <Badge color={REC_COLORS[result.recommendation] || "gray"}>
                          {result.recommendation.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {taskCount > 0 && (
                        <span className="text-[10px] text-gray-400">{doneTasks}/{taskCount} resolved</span>
                      )}
                      <Badge color={result ? "indigo" : "gray"}>{result ? "Analyzed" : "No Analysis"}</Badge>
                    </div>
                  </button>

                  {isExpanded && result && (
                    <div className="px-3 pb-3 space-y-2">
                      {result.summary && (
                        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{result.summary}</p>
                      )}
                      {Array.isArray(result.sections) && result.sections.map((section: any, i: number) => (
                        <div key={i} className="bg-gray-50 rounded p-2">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] font-semibold text-gray-700">{section.name}</span>
                            {section.riskLevel && (
                              <Badge color={RISK_COLORS[section.riskLevel] || "gray"}>{section.riskLevel}</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-600 whitespace-pre-wrap">{section.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {isExpanded && ws.tasks?.length > 0 && (
                    <div className="px-3 pb-3">
                      <div className="text-[10px] font-semibold text-gray-600 mb-1 uppercase">Open Questions & Tasks</div>
                      <div className="space-y-1">
                        {ws.tasks.map((task: any) => (
                          <div key={task.id} className="flex items-center gap-2 text-xs">
                            <span className={`w-3 h-3 rounded border flex items-center justify-center text-[8px] ${
                              task.status === "DONE" ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300"
                            }`}>
                              {task.status === "DONE" ? "\u2713" : ""}
                            </span>
                            <span className={task.status === "DONE" ? "text-gray-400 line-through" : "text-gray-700"}>
                              {task.title}
                            </span>
                            <Badge color={task.priority === "HIGH" ? "red" : task.priority === "MEDIUM" ? "yellow" : "gray"}>
                              {task.priority}
                            </Badge>
                            {task.status === "DONE" && task.resolution && (
                              <span className="text-[10px] text-gray-400 italic">— {task.resolution}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DD Task Summary */}
      {allTasks.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-700">DD Task Resolution</div>
            <span className="text-xs text-gray-500">
              {completedTasks.length} of {allTasks.length} resolved ({allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
