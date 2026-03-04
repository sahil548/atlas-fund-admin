"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineEditField } from "./inline-edit-field";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import Link from "next/link";
import type { AnalysisProgress } from "@/app/(gp)/deals/[id]/page";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const stageLabel: Record<string, string> = {
  SCREENING: "Screening",
  DUE_DILIGENCE: "Due Diligence",
  IC_REVIEW: "IC Review",
  CLOSING: "Closing",
  DEAD: "Dead",
};

const entityTypeLabels: Record<string, string> = {
  MAIN_FUND: "Main Fund",
  SIDECAR: "Sidecar",
  SPV: "SPV",
  CO_INVEST_VEHICLE: "Co-Invest Vehicle",
  GP_ENTITY: "GP Entity",
  HOLDING_COMPANY: "Holding Company",
};

const vehicleStructureLabels: Record<string, string> = {
  LLC: "LLC",
  LP: "LP",
  CORP: "Corp",
  TRUST: "Trust",
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
  const [showLinkEntity, setShowLinkEntity] = useState(false);
  const [linkingEntity, setLinkingEntity] = useState(false);
  const [showCreateEntity, setShowCreateEntity] = useState(false);
  const [newEntityForm, setNewEntityForm] = useState({
    name: "",
    entityType: "MAIN_FUND",
    vehicleStructure: "LLC",
  });
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [startFormation, setStartFormation] = useState(true);
  const [sourceDataOpen, setSourceDataOpen] = useState(false);
  const [memoExpanded, setMemoExpanded] = useState(true);
  const [selectedMemoVersion, setSelectedMemoVersion] = useState<number | null>(null);
  const toast = useToast();
  const { firmId } = useFirm();

  const { data: entities } = useSWR(
    showLinkEntity ? `/api/entities?firmId=${firmId}` : null,
    fetcher
  );

  const isScreening = deal.stage === "SCREENING";
  const workstreams = ((deal.workstreams || []) as any[]).filter(
    (w: any) => w.analysisType !== "IC_MEMO"
  );

  // IC Memo data from AIScreeningResult
  const sr = deal.screeningResult;
  const hasMemo = !!sr?.memo;
  const isAnalyzing = !!analysisProgress;

  const previousMemoVersions: any[] = sr?.previousVersions
    ? (Array.isArray(sr.previousVersions) ? sr.previousVersions.filter((v: any) => v.memo) : [])
    : [];
  const currentMemoVersion = sr?.version ?? 1;

  // Display the selected version or current
  const displayMemo =
    selectedMemoVersion != null
      ? previousMemoVersions.find((v: any) => v.version === selectedMemoVersion)?.memo
      : sr?.memo;

  // ── Entity management ──

  async function handleLinkEntity(entityId: string) {
    setLinkingEntity(true);
    try {
      await fetch(`/api/deals/${deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId }),
      });
      mutate(`/api/deals/${deal.id}`);
      setShowLinkEntity(false);
    } catch {
      // silently fail
    } finally {
      setLinkingEntity(false);
    }
  }

  async function handleUnlinkEntity() {
    try {
      await fetch(`/api/deals/${deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: null }),
      });
      mutate(`/api/deals/${deal.id}`);
    } catch {
      // silently fail
    }
  }

  async function handleCreateAndLink() {
    if (!newEntityForm.name.trim()) return;
    setCreatingEntity(true);
    try {
      const res = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmId,
          name: newEntityForm.name.trim(),
          entityType: newEntityForm.entityType,
          vehicleStructure: newEntityForm.vehicleStructure,
          startFormation,
        }),
      });
      const created = await res.json();
      await fetch(`/api/deals/${deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId: created.id }),
      });
      mutate(`/api/deals/${deal.id}`);
      toast.success(`Entity "${newEntityForm.name.trim()}" created & linked`);
      setNewEntityForm({ name: "", entityType: "MAIN_FUND", vehicleStructure: "LLC" });
      setShowCreateEntity(false);
    } catch {
      toast.error("Failed to create entity");
    } finally {
      setCreatingEntity(false);
    }
  }

  // ── Render ──

  return (
    <div className="space-y-6">
      {/* ── SCREENING stage: show deal details + Run AI Screening CTA ── */}
      {isScreening && (
        <>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              {renderEditableFields()}
            </div>
            <div className="space-y-3">
              <StatCard label="Stage" value={stageLabel[deal.stage] || deal.stage} small />
              <StatCard label="Documents" value={String(deal.documents?.length ?? 0)} small />
              <StatCard label="Notes" value={String(deal.notes?.length ?? 0)} small />
            </div>
          </div>

          {/* Run AI Screening CTA */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-purple-900">Ready to screen this deal?</div>
                <p className="text-sm text-purple-700 mt-1">
                  AI will analyze all uploaded documents across {workstreams.length} workstream{workstreams.length !== 1 ? "s" : ""} and generate a unified IC Memo.
                </p>

                {/* Progress indicator */}
                {analysisProgress && (
                  <div className="mt-3 bg-white/60 rounded-lg p-3 border border-purple-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-purple-800">
                        {analysisProgress.phase || "Processing"}
                        {analysisProgress.current
                          ? ` — ${analysisProgress.current}...`
                          : "..."}
                      </span>
                      <span className="text-xs text-purple-600">
                        {analysisProgress.completed}/{analysisProgress.total}
                      </span>
                    </div>
                    <div className="bg-purple-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-purple-500 transition-all"
                        style={{
                          width: `${analysisProgress.total > 0 ? Math.round((analysisProgress.completed / analysisProgress.total) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    {/* Show workstream names being analyzed */}
                    {analysisProgress.workstreamNames && analysisProgress.workstreamNames.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {analysisProgress.workstreamNames.map((name, i) => (
                          <span
                            key={name}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              i < (analysisProgress.completed ?? 0)
                                ? "bg-purple-200 text-purple-700 line-through"
                                : analysisProgress.current === name
                                  ? "bg-purple-300 text-purple-800 font-semibold"
                                  : "bg-purple-100 text-purple-500"
                            }`}
                          >
                            {name}
                          </span>
                        ))}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            analysisProgress.phase === "Generating IC Memo"
                              ? "bg-purple-300 text-purple-800 font-semibold"
                              : "bg-purple-100 text-purple-500"
                          }`}
                        >
                          IC Memo
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!analysisProgress && (
                  <div className="mt-3">
                    <Button loading={ddStarting} onClick={startScreening}>
                      Run AI Screening
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Post-screening: IC Memo (primary AI overview) + deal details ── */}
      {!isScreening && (
        <>
          {/* ── IC Memo — primary AI overview of the deal ── */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setMemoExpanded(!memoExpanded)} className="text-xs">
                  <span className={`transition-transform inline-block ${memoExpanded ? "rotate-90" : ""}`}>&#9654;</span>
                </button>
                <div className="text-sm font-semibold text-gray-900">AI Overview — IC Memo</div>
                {hasMemo && (
                  <Badge color="indigo">v{currentMemoVersion}</Badge>
                )}
                {hasMemo && sr?.memoGeneratedAt && (
                  <span className="text-[10px] text-gray-400">
                    Generated {new Date(sr.memoGeneratedAt).toLocaleDateString()}
                  </span>
                )}
                {isAnalyzing && (
                  <Badge color="yellow">Generating...</Badge>
                )}
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

            {/* Progress bar inside IC memo box */}
            {analysisProgress && (
              <div className="px-4 py-2 bg-indigo-50/50 border-b border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-indigo-800">
                    {analysisProgress.phase || "Processing"}
                    {analysisProgress.current ? ` — ${analysisProgress.current}...` : "..."}
                  </span>
                  <span className="text-xs text-indigo-600">
                    {analysisProgress.completed}/{analysisProgress.total}
                  </span>
                </div>
                <div className="bg-indigo-200 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-indigo-500 transition-all"
                    style={{
                      width: `${analysisProgress.total > 0 ? Math.round((analysisProgress.completed / analysisProgress.total) * 100) : 0}%`,
                    }}
                  />
                </div>
                {/* Show workstream names being analyzed */}
                {analysisProgress.workstreamNames && analysisProgress.workstreamNames.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {analysisProgress.workstreamNames.map((name, i) => (
                      <span
                        key={name}
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          i < (analysisProgress.completed ?? 0)
                            ? "bg-indigo-200 text-indigo-700 line-through"
                            : analysisProgress.current === name
                              ? "bg-indigo-300 text-indigo-800 font-semibold"
                              : "bg-indigo-100 text-indigo-500"
                        }`}
                      >
                        {name}
                      </span>
                    ))}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        analysisProgress.phase === "Generating IC Memo"
                          ? "bg-indigo-300 text-indigo-800 font-semibold"
                          : "bg-indigo-100 text-indigo-500"
                      }`}
                    >
                      IC Memo
                    </span>
                  </div>
                )}
              </div>
            )}

            {memoExpanded && (
              <div className="p-4">
                {displayMemo ? (
                  <div className="space-y-3">
                    {/* Historical version banner */}
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

                    {/* Recommendation */}
                    {displayMemo.recommendation && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-600">Recommendation:</span>
                        <Badge color={REC_COLORS[displayMemo.recommendation] || "gray"}>
                          {displayMemo.recommendation.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    )}

                    {/* Summary */}
                    {displayMemo.summary && (
                      <div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">Executive Summary</div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{displayMemo.summary}</p>
                      </div>
                    )}

                    {/* Sections */}
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

                    {/* Key Findings / Action Items */}
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

          {/* Workstream Progress Summary */}
          {workstreams.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-semibold text-gray-700 mb-2">Workstream Progress</div>
              <div className="space-y-1">
                {workstreams.map((ws: any) => {
                  const pct = ws.totalTasks > 0 ? Math.round((ws.completedTasks / ws.totalTasks) * 100) : 0;
                  const hasAnalysis = !!ws.analysisResult;
                  return (
                    <div key={ws.id} className="flex items-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full ${
                        ws.status === "COMPLETE" ? "bg-emerald-400" :
                        ws.status === "IN_PROGRESS" ? "bg-amber-400" : "bg-gray-300"
                      }`} />
                      <span className="flex-1">{ws.name}</span>
                      {hasAnalysis && (
                        <Badge color="indigo">Analyzed</Badge>
                      )}
                      <span className="text-gray-500">{ws.completedTasks}/{ws.totalTasks} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Source Data & Deal Details (collapsible) */}
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
              <div className="p-4">
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2 space-y-6">
                    {renderEditableFields()}
                  </div>
                  <div className="space-y-3">
                    <StatCard label="Stage" value={stageLabel[deal.stage] || deal.stage} small />
                    <StatCard label="Documents" value={String(deal.documents?.length ?? 0)} small />
                    <StatCard label="Notes" value={String(deal.notes?.length ?? 0)} small />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  // ── Shared editable fields renderer ──
  function renderEditableFields() {
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

        {/* Investment Vehicle */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Investment Vehicle</h4>
          {deal.targetEntity ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link href={`/entities/${deal.targetEntity.id}`} className="text-sm text-indigo-600 hover:underline font-semibold">
                    {deal.targetEntity.name}
                  </Link>
                  <Badge color="purple">{entityTypeLabels[deal.targetEntity.entityType] || deal.targetEntity.entityType}</Badge>
                  {deal.targetEntity.vehicleStructure && (
                    <Badge color="blue">{vehicleStructureLabels[deal.targetEntity.vehicleStructure] || deal.targetEntity.vehicleStructure}</Badge>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={() => setShowLinkEntity(true)}>Change</Button>
              </div>
              {showLinkEntity && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="text-xs text-gray-500 mb-2">Select a different entity:</div>
                  {entities ? (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {(entities as any[]).map((entity: any) => (
                        <button key={entity.id} onClick={() => handleLinkEntity(entity.id)} disabled={linkingEntity} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between">
                          <span className="font-medium">{entity.name}</span>
                          <Badge color="gray">{entityTypeLabels[entity.entityType] || entity.entityType}</Badge>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">Loading entities...</div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowLinkEntity(false)}>Cancel</Button>
                    <Button variant="danger" size="sm" onClick={handleUnlinkEntity}>Unlink Entity</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center">
              <div className="text-sm text-gray-500 mb-3">No investment vehicle linked to this deal.</div>
              <div className="flex items-center justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowLinkEntity(true)}>Link Existing</Button>
                <Button variant="secondary" size="sm" onClick={() => setShowCreateEntity(true)}>Create New</Button>
              </div>
              {showCreateEntity && (
                <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-white text-left">
                  <div className="text-xs font-semibold text-gray-700 mb-3">Create New Entity</div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Name</label>
                      <input type="text" value={newEntityForm.name} onChange={(e) => setNewEntityForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Atlas Fund I LLC" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">Entity Type</label>
                        <select value={newEntityForm.entityType} onChange={(e) => setNewEntityForm((f) => ({ ...f, entityType: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
                          {Object.entries(entityTypeLabels).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-500 mb-1 block">Vehicle Structure</label>
                        <select value={newEntityForm.vehicleStructure} onChange={(e) => setNewEntityForm((f) => ({ ...f, vehicleStructure: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
                          {Object.entries(vehicleStructureLabels).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                        </select>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 mt-2">
                      <input type="checkbox" checked={startFormation} onChange={(e) => setStartFormation(e.target.checked)} className="rounded border-gray-300" />
                      <span className="text-xs text-gray-600">Start formation workflow</span>
                    </label>
                    {startFormation && (<p className="text-[10px] text-gray-400 mt-1">A formation workflow will be created to track legal filings and registrations.</p>)}
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" onClick={handleCreateAndLink} disabled={creatingEntity || !newEntityForm.name.trim()}>{creatingEntity ? "Creating..." : "Create & Link"}</Button>
                      <Button variant="secondary" size="sm" onClick={() => { setShowCreateEntity(false); setNewEntityForm({ name: "", entityType: "MAIN_FUND", vehicleStructure: "LLC" }); }}>Cancel</Button>
                    </div>
                  </div>
                </div>
              )}
              {showLinkEntity && (
                <div className="mt-4 border-t border-gray-100 pt-3 text-left">
                  <div className="text-xs text-gray-500 mb-2">Select an entity:</div>
                  {entities ? (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {(entities as any[]).length === 0 ? (
                        <div className="text-xs text-gray-400 py-2">No entities found. Create one first.</div>
                      ) : (
                        (entities as any[]).map((entity: any) => (
                          <button key={entity.id} onClick={() => handleLinkEntity(entity.id)} disabled={linkingEntity} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-between">
                            <span className="font-medium">{entity.name}</span>
                            <Badge color="gray">{entityTypeLabels[entity.entityType] || entity.entityType}</Badge>
                          </button>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">Loading entities...</div>
                  )}
                  <div className="mt-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowLinkEntity(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  }
}
