"use client";

import { useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineEditField } from "./inline-edit-field";
import { DealEntitySection } from "./deal-entity-section";
import type { AnalysisProgress } from "@/app/(gp)/deals/[id]/page";

/* eslint-disable @typescript-eslint/no-explicit-any */

const stageLabel: Record<string, string> = {
  SCREENING: "Screening",
  DUE_DILIGENCE: "Due Diligence",
  IC_REVIEW: "IC Review",
  CLOSING: "Closing",
  DEAD: "Dead",
};

const REC_COLORS: Record<string, string> = {
  APPROVE: "green",
  APPROVE_WITH_CONDITIONS: "yellow",
  DECLINE: "red",
  GO: "green",
  NO_GO: "red",
  NEEDS_MORE_INFO: "yellow",
};

interface DealOverviewTabProps {
  deal: any;
  analysisProgress: AnalysisProgress | null;
  ddStarting: boolean;
  regenerating: boolean;
  startScreening: () => void;
  regenerateMemo: () => void;
}

export function DealOverviewTab({
  deal,
  analysisProgress,
  ddStarting,
  regenerating,
  startScreening,
  regenerateMemo,
}: DealOverviewTabProps) {
  const [sourceDataOpen, setSourceDataOpen] = useState(false);
  const [memoExpanded, setMemoExpanded] = useState(true);
  const [selectedMemoVersion, setSelectedMemoVersion] = useState<number | null>(null);

  const isScreening = deal.stage === "SCREENING";
  const workstreams = ((deal.workstreams || []) as any[]).filter(
    (w: any) => w.analysisType !== "IC_MEMO"
  );

  // IC Memo data
  const sr = deal.screeningResult;
  const hasMemo = !!sr?.memo;
  const isAnalyzing = !!analysisProgress;

  const previousMemoVersions: any[] = sr?.previousVersions
    ? (Array.isArray(sr.previousVersions) ? sr.previousVersions.filter((v: any) => v.memo) : [])
    : [];
  const currentMemoVersion = sr?.version ?? 1;

  const displayMemo =
    selectedMemoVersion != null
      ? previousMemoVersions.find((v: any) => v.version === selectedMemoVersion)?.memo
      : sr?.memo;

  return (
    <div className="space-y-6">
      {/* ── SCREENING stage ── */}
      {isScreening && (
        <>
          {/* Screening Stage Banner */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold flex items-center gap-2">
                  Screening Stage
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-0.5">
                  Upload documents and review deal details, then run AI screening to generate workstream analyses and an IC Memo.
                </p>
              </div>
            </div>
          </div>

          {/* Run AI Screening CTA */}
          <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border-2 border-dashed border-purple-300 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-base font-semibold text-purple-900">Ready to screen this deal?</div>
                <p className="text-sm text-purple-700 mt-1">
                  AI will analyze all uploaded documents across {workstreams.length} workstream{workstreams.length !== 1 ? "s" : ""} and generate a unified IC Memo with scoring and recommendations.
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-purple-500">
                  <span>{deal.documents?.length ?? 0} document{(deal.documents?.length ?? 0) !== 1 ? "s" : ""} uploaded</span>
                  <span>·</span>
                  <span>{workstreams.length} workstream{workstreams.length !== 1 ? "s" : ""} configured</span>
                </div>
                {!analysisProgress && (
                  <div className="mt-4">
                    <Button loading={ddStarting} onClick={startScreening} className="bg-purple-600 hover:bg-purple-700 text-white px-6">
                      Run AI Screening
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Review Details */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Review Details</div>
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-6">
                {renderDealFields()}
              </div>
              <div className="space-y-3">
                <StatCard label="Stage" value={stageLabel[deal.stage] || deal.stage} small />
                <StatCard label="Documents" value={String(deal.documents?.length ?? 0)} small />
                <StatCard label="Notes" value={String(deal.notes?.length ?? 0)} small />
              </div>
            </div>
          </div>

          {/* Investment Vehicle — standalone section */}
          <DealEntitySection dealId={deal.id} targetEntity={deal.targetEntity} />
        </>
      )}

      {/* ── Post-screening ── */}
      {!isScreening && (
        <>
          {/* IC Memo with integrated AI Score */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setMemoExpanded(!memoExpanded)} className="text-xs text-gray-500">
                  <span className={`transition-transform inline-block ${memoExpanded ? "rotate-90" : ""}`}>&#9654;</span>
                </button>

                {/* Integrated Score Circle */}
                {deal.aiScore != null && (
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    deal.aiScore >= 70 ? "bg-emerald-100 text-emerald-700" :
                    deal.aiScore >= 40 ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {deal.aiScore}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">AI Overview — IC Memo</span>
                    {sr?.memo?.recommendation && (
                      <Badge color={REC_COLORS[sr.memo.recommendation] || "gray"}>
                        {sr.memo.recommendation.replace(/_/g, " ")}
                      </Badge>
                    )}
                    {hasMemo && <Badge color="indigo">v{currentMemoVersion}</Badge>}
                    {isAnalyzing && <Badge color="yellow">Generating...</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {deal.aiScore != null && (
                      <span className="text-[10px] text-gray-500">
                        Score: {deal.aiScore >= 70 ? "Strong" : deal.aiScore >= 40 ? "Moderate" : "Weak"}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {stageLabel[deal.stage] || deal.stage} · {workstreams.length} workstreams
                    </span>
                    {hasMemo && sr?.memoGeneratedAt && (
                      <span className="text-[10px] text-gray-400">
                        · Generated {new Date(sr.memoGeneratedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {previousMemoVersions.length > 0 && (
                  <select
                    value={selectedMemoVersion ?? ""}
                    onChange={(e) => setSelectedMemoVersion(e.target.value ? Number(e.target.value) : null)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                  >
                    <option value="">v{currentMemoVersion} (Current)</option>
                    {[...previousMemoVersions].reverse().map((v: any) => (
                      <option key={v.version} value={v.version}>
                        v{v.version} ({new Date(v.memoGeneratedAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                )}
                {!isAnalyzing && (
                  <Button
                    size="sm"
                    variant={hasMemo ? "secondary" : "primary"}
                    loading={regenerating}
                    onClick={regenerateMemo}
                  >
                    {hasMemo ? "Regenerate" : "Generate IC Memo"}
                  </Button>
                )}
              </div>
            </div>

            {memoExpanded && (
              <div className="p-4">
                {displayMemo ? (
                  <div className="space-y-3">
                    {selectedMemoVersion != null && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800 flex items-center gap-2">
                        <span>Viewing version {selectedMemoVersion}.</span>
                        <button
                          onClick={() => setSelectedMemoVersion(null)}
                          className="text-amber-700 font-semibold underline hover:text-amber-900"
                        >
                          Return to current
                        </button>
                      </div>
                    )}

                    {displayMemo.recommendation && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-600">Recommendation:</span>
                        <Badge color={REC_COLORS[displayMemo.recommendation] || "gray"}>
                          {displayMemo.recommendation.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    )}

                    {displayMemo.summary && (
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">Executive Summary</div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{displayMemo.summary}</p>
                      </div>
                    )}

                    {Array.isArray(displayMemo.sections) && displayMemo.sections.length > 0 && (
                      <div className="space-y-2">
                        {displayMemo.sections.map((section: any, i: number) => (
                          <div key={i} className="bg-gray-50 rounded-lg border border-gray-100 p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-gray-800">{section.name}</span>
                              {section.riskLevel && (
                                <Badge
                                  color={section.riskLevel === "HIGH" ? "red" : section.riskLevel === "MEDIUM" ? "yellow" : "green"}
                                >
                                  {section.riskLevel}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 whitespace-pre-wrap">{section.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {Array.isArray(displayMemo.findings) && displayMemo.findings.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-2">Key Action Items ({displayMemo.findings.length})</div>
                        <div className="space-y-1">
                          {displayMemo.findings.map((f: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <Badge color={f.priority === "HIGH" ? "red" : f.priority === "MEDIUM" ? "yellow" : "gray"}>
                                {f.priority}
                              </Badge>
                              <div>
                                <span className="font-medium text-gray-800">{f.title}</span>
                                {f.description && (
                                  <span className="text-gray-500 ml-1">— {f.description}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : isAnalyzing ? (
                  <div className="py-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      <div className="text-sm font-medium text-indigo-700">Generating IC Memo...</div>
                    </div>
                    <p className="text-xs text-gray-400">
                      Analyzing {workstreams.length} workstream{workstreams.length !== 1 ? "s" : ""} and synthesizing into an IC-ready document.
                    </p>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <div className="text-sm text-gray-500">No IC Memo generated yet.</div>
                    <p className="text-xs text-gray-400 mt-1">
                      Click &ldquo;Generate IC Memo&rdquo; to run all workstream analyses and synthesize findings into an IC-ready document.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Deal Details (collapsible) */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setSourceDataOpen(!sourceDataOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700">Deal Details</span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${sourceDataOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {sourceDataOpen && (
              <div className="p-4 space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2 space-y-6">
                    {renderDealFields()}
                  </div>
                  <div className="space-y-3">
                    <StatCard label="Stage" value={stageLabel[deal.stage] || deal.stage} small />
                    <StatCard label="Documents" value={String(deal.documents?.length ?? 0)} small />
                    <StatCard label="Notes" value={String(deal.notes?.length ?? 0)} small />
                  </div>
                </div>
                <DealEntitySection dealId={deal.id} targetEntity={deal.targetEntity} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  function renderDealFields() {
    return (
      <>
        {/* Deal Size & Return */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Deal Size &amp; Return</h4>
          <div className="grid grid-cols-3 gap-4">
            <InlineEditField label="Total Raise" value={deal.targetSize} field="targetSize" dealId={deal.id} placeholder="e.g. $50M" />
            <InlineEditField label="Target Check Size" value={deal.targetCheckSize} field="targetCheckSize" dealId={deal.id} placeholder="e.g. $10M" />
            <InlineEditField label="Target Return" value={deal.targetReturn} field="targetReturn" dealId={deal.id} placeholder="e.g. 2.5x / 25% IRR" />
          </div>
        </div>

        {/* Parties */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Parties</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-gray-500 mb-1">Deal Lead</div>
              <div className="text-sm font-medium text-gray-900">{deal.dealLead?.name || "Unassigned"}</div>
            </div>
            <InlineEditField label="GP Name" value={deal.gpName} field="gpName" dealId={deal.id} placeholder="e.g. Acme Capital" />
            <InlineEditField label="Source" value={deal.source} field="source" dealId={deal.id} placeholder="e.g. Direct / Broker" />
            <InlineEditField label="Counterparty" value={deal.counterparty} field="counterparty" dealId={deal.id} placeholder="e.g. Seller LLC" />
          </div>
        </div>

        {/* Investment Context */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Investment Context</h4>
          <div className="space-y-4">
            <InlineEditField label="Investment Rationale" value={deal.investmentRationale} field="investmentRationale" dealId={deal.id} type="textarea" placeholder="Why is this deal interesting?" />
            <InlineEditField label="Thesis Notes" value={deal.thesisNotes} field="thesisNotes" dealId={deal.id} type="textarea" placeholder="Investment thesis and key drivers..." />
            <InlineEditField label="Description" value={deal.description} field="description" dealId={deal.id} type="textarea" placeholder="Brief deal description..." />
            <InlineEditField label="Additional Context" value={deal.additionalContext} field="additionalContext" dealId={deal.id} type="textarea" placeholder="Any additional context, background, or notes..." />
          </div>
        </div>
      </>
    );
  }
}
