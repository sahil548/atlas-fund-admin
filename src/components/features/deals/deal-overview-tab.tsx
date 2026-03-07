"use client";

import { useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { InlineEditField } from "./inline-edit-field";
import { DealEntitySection } from "./deal-entity-section";
import { mutate } from "swr";
import type { AnalysisProgress } from "@/app/(gp)/deals/[id]/page";
import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS,
  CAPITAL_INSTRUMENT_LABELS,
  PARTICIPATION_LABELS,
  PARTICIPATION_COLORS,
} from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

const stageLabel: Record<string, string> = {
  SCREENING: "Screening",
  DUE_DILIGENCE: "Due Diligence",
  IC_REVIEW: "IC Review",
  CLOSING: "Closing",
  CLOSED: "Closed",
  DEAD: "Dead",
};

const stageColor: Record<string, string> = {
  SCREENING: "yellow",
  DUE_DILIGENCE: "blue",
  IC_REVIEW: "purple",
  CLOSING: "indigo",
  CLOSED: "green",
  DEAD: "red",
};

const REC_COLORS: Record<string, string> = {
  APPROVE: "green",
  APPROVE_WITH_CONDITIONS: "yellow",
  DECLINE: "red",
  GO: "green",
  NO_GO: "red",
  NEEDS_MORE_INFO: "yellow",
};

// Asset-class-specific field definitions for deal terms
const ASSET_CLASS_FIELDS: Record<string, { key: string; label: string }[]> = {
  REAL_ESTATE: [
    { key: "propertyType", label: "Property Type" },
    { key: "location", label: "Location" },
    { key: "capRate", label: "Cap Rate" },
    { key: "noi", label: "NOI" },
    { key: "squareFootage", label: "Square Footage" },
  ],
  INFRASTRUCTURE: [
    { key: "projectType", label: "Project Type" },
    { key: "location", label: "Location" },
    { key: "contractLength", label: "Contract Length" },
    { key: "regulatoryStatus", label: "Regulatory Status" },
  ],
  OPERATING_BUSINESS: [
    { key: "revenue", label: "Revenue" },
    { key: "ebitda", label: "EBITDA" },
    { key: "ownershipPercent", label: "Ownership %" },
    { key: "growthRate", label: "Growth Rate" },
  ],
  PUBLIC_SECURITIES: [
    { key: "ticker", label: "Ticker" },
    { key: "marketCap", label: "Market Cap" },
    { key: "sector", label: "Sector" },
    { key: "peRatio", label: "P/E Ratio" },
  ],
};

// For debt instruments, use these fields regardless of asset class
const DEBT_FIELDS = [
  { key: "principal", label: "Principal" },
  { key: "interestRate", label: "Interest Rate" },
  { key: "maturityDate", label: "Maturity Date" },
  { key: "ltv", label: "LTV" },
  { key: "covenants", label: "Covenants Summary" },
];

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
  const [fullMemoExpanded, setFullMemoExpanded] = useState(false);
  const [selectedMemoVersion, setSelectedMemoVersion] = useState<number | null>(null);
  const [extracting, setExtracting] = useState(false);
  const toast = useToast();

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

  // Deal metadata from AI extraction
  const metadata: Record<string, any> = deal.dealMetadata && typeof deal.dealMetadata === "object"
    ? deal.dealMetadata
    : {};
  const hasMetadata = Object.keys(metadata).length > 0;

  // Get the appropriate fields for this deal's asset class
  function getTermFields(): { key: string; label: string }[] {
    if (deal.capitalInstrument === "DEBT") {
      return DEBT_FIELDS;
    }
    return ASSET_CLASS_FIELDS[deal.assetClass] || [];
  }

  // Trigger AI metadata extraction
  async function extractMetadata() {
    setExtracting(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/extract-metadata`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err.error === "string" ? err.error : "Failed to extract metadata";
        toast.error(msg);
        return;
      }
      toast.success("Deal terms extracted from documents");
      mutate(`/api/deals/${deal.id}`);
    } catch {
      toast.error("Failed to extract metadata");
    } finally {
      setExtracting(false);
    }
  }

  // Save a single metadata field
  async function saveMetadataField(key: string, value: string) {
    const updated = { ...metadata, [key]: value || null };
    try {
      await fetch(`/api/deals/${deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealMetadata: updated }),
      });
      mutate(`/api/deals/${deal.id}`);
    } catch {
      toast.error("Failed to save field");
    }
  }

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

          {/* Investment Vehicle */}
          <DealEntitySection dealId={deal.id} />
        </>
      )}

      {/* ── Post-screening: 4-Section Dashboard ── */}
      {!isScreening && (
        <>
          {/* ═══ SECTION 1: Header Card ═══ */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-5 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold truncate">{deal.name}</h2>
                  {deal.aiScore != null && (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      deal.aiScore >= 70 ? "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40" :
                      deal.aiScore >= 50 ? "bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40" :
                      "bg-red-400/20 text-red-300 ring-1 ring-red-400/40"
                    }`}>
                      {deal.aiScore}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge color={stageColor[deal.stage] || "gray"}>
                    {stageLabel[deal.stage] || deal.stage}
                  </Badge>
                  <Badge color={ASSET_CLASS_COLORS[deal.assetClass] || "gray"}>
                    {ASSET_CLASS_LABELS[deal.assetClass] || deal.assetClass}
                  </Badge>
                  {deal.capitalInstrument && (
                    <Badge color={deal.capitalInstrument === "DEBT" ? "orange" : "blue"}>
                      {CAPITAL_INSTRUMENT_LABELS[deal.capitalInstrument] || deal.capitalInstrument}
                    </Badge>
                  )}
                  {deal.participationStructure && (
                    <Badge color={PARTICIPATION_COLORS[deal.participationStructure] || "gray"}>
                      {PARTICIPATION_LABELS[deal.participationStructure] || deal.participationStructure}
                    </Badge>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-4 text-sm text-gray-300 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{deal.dealLead?.name || "No lead assigned"}</span>
                  </div>
                  {deal.targetSize && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{deal.targetSize}</span>
                    </div>
                  )}
                  {deal.source && (
                    <span className="text-xs text-gray-400">Source: {deal.source}</span>
                  )}
                  {deal.counterparty && (
                    <span className="text-xs text-gray-400">Counterparty: {deal.counterparty}</span>
                  )}
                </div>
              </div>

              {/* Deal lead initials avatar */}
              {deal.dealLead && (
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ml-4">
                  {deal.dealLead.initials || deal.dealLead.name?.charAt(0) || "?"}
                </div>
              )}
            </div>
          </div>

          {/* ═══ SECTION 2: Key Metrics ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Target Return"
              value={deal.targetReturn || metadata.targetReturn || "--"}
              small
            />
            <StatCard
              label="Target Check Size"
              value={deal.targetCheckSize || metadata.targetCheckSize || "--"}
              small
            />
            <StatCard
              label="Deal Size"
              value={deal.targetSize || metadata.dealSize || "--"}
              small
            />
            <StatCard
              label="Projected Cash Flow"
              value={metadata.projectedCashFlow || "Not available"}
              small
            />
          </div>

          {/* ═══ SECTIONS 3 & 4: IC Memo Summary + Deal Terms (2-col on lg) ═══ */}
          <div className={`grid grid-cols-1 ${fullMemoExpanded ? "" : "lg:grid-cols-2"} gap-6 items-start`}>

            {/* ═══ SECTION 3: IC Memo Summary ═══ */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setMemoExpanded(!memoExpanded)} className="text-xs text-gray-500">
                    <span className={`transition-transform inline-block ${memoExpanded ? "rotate-90" : ""}`}>&#9654;</span>
                  </button>

                  {/* Integrated Score Circle */}
                  {deal.aiScore != null && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      deal.aiScore >= 70 ? "bg-emerald-100 text-emerald-700" :
                      deal.aiScore >= 40 ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {deal.aiScore}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">IC Memo</span>
                      {sr?.memo?.recommendation && (
                        <Badge color={REC_COLORS[sr.memo.recommendation] || "gray"}>
                          {sr.memo.recommendation.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {hasMemo && <Badge color="indigo">v{currentMemoVersion}</Badge>}
                      {isAnalyzing && <Badge color="yellow">Generating...</Badge>}
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
                      {hasMemo ? "Regenerate" : "Generate"}
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
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {displayMemo.summary}
                          </p>
                        </div>
                      )}

                      {fullMemoExpanded && displayMemo.sections && Array.isArray(displayMemo.sections) && (
                        <div className="space-y-3 pt-2 border-t border-gray-100">
                          {displayMemo.sections.map((section: any, idx: number) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-700">{section.name || section.title}</span>
                                {section.riskLevel && (
                                  <Badge color={section.riskLevel === "HIGH" ? "red" : section.riskLevel === "LOW" ? "green" : "yellow"}>
                                    {section.riskLevel}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 whitespace-pre-wrap">{section.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {displayMemo.sections && Array.isArray(displayMemo.sections) && displayMemo.sections.length > 0 && (
                        <button
                          onClick={() => setFullMemoExpanded(!fullMemoExpanded)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-2"
                        >
                          {fullMemoExpanded ? "Collapse memo" : "Read full memo"}
                        </button>
                      )}

                      {hasMemo && sr?.memoGeneratedAt && (
                        <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">
                          Generated {new Date(sr.memoGeneratedAt).toLocaleDateString()} · v{currentMemoVersion}
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
                      <div className="text-sm text-gray-500">IC Memo not yet generated.</div>
                      <p className="text-xs text-gray-400 mt-1">
                        Click &ldquo;Generate&rdquo; to run all workstream analyses and synthesize findings.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ═══ SECTION 4: Deal Terms ═══ */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Deal Terms</span>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={extracting}
                  onClick={extractMetadata}
                >
                  Extract from Documents
                </Button>
              </div>

              <div className="p-4">
                {hasMetadata || getTermFields().length > 0 ? (
                  <div className="space-y-3">
                    {/* Asset-class-specific fields */}
                    {getTermFields().map(({ key, label }) => (
                      <MetadataField
                        key={key}
                        label={label}
                        value={metadata[key] ?? null}
                        onSave={(val) => saveMetadataField(key, val)}
                      />
                    ))}

                    {/* Generic extracted fields not in the predefined list */}
                    {Object.entries(metadata)
                      .filter(([key]) => {
                        const fieldKeys = getTermFields().map(f => f.key);
                        // Skip keys already shown above and common top-level keys
                        return !fieldKeys.includes(key) &&
                          !["dealSize", "targetReturn", "projectedCashFlow", "targetCheckSize", "investmentStructure"].includes(key);
                      })
                      .map(([key, value]) => (
                        <MetadataField
                          key={key}
                          label={formatFieldLabel(key)}
                          value={typeof value === "string" ? value : value != null ? JSON.stringify(value) : null}
                          onSave={(val) => saveMetadataField(key, val)}
                        />
                      ))}

                    {/* Investment structure summary if present */}
                    {metadata.investmentStructure && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-xs font-semibold text-gray-500 mb-1">Investment Structure</div>
                        <p className="text-sm text-gray-700">
                          {typeof metadata.investmentStructure === "string"
                            ? metadata.investmentStructure
                            : JSON.stringify(metadata.investmentStructure)}
                        </p>
                      </div>
                    )}

                    {/* Key terms summary if present */}
                    {metadata.keyTerms && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-xs font-semibold text-gray-500 mb-1">Key Terms</div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {typeof metadata.keyTerms === "string"
                            ? metadata.keyTerms
                            : JSON.stringify(metadata.keyTerms, null, 2)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <div className="text-sm text-gray-500">No deal terms extracted.</div>
                    <p className="text-xs text-gray-400 mt-1">
                      Upload documents and click &ldquo;Extract from Documents&rdquo; to populate deal terms using AI.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ Collapsible Deal Details (existing fields) ═══ */}
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
              </div>
            )}
          </div>

          {/* Investment Vehicle */}
          <DealEntitySection dealId={deal.id} />
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

// ── Helper: format camelCase to Title Case ──
function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ── Metadata field component (inline edit for extracted terms) ──
function MetadataField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string | null;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");

  function startEdit() {
    setEditValue(value ?? "");
    setEditing(true);
  }

  function save() {
    if (editValue !== (value ?? "")) {
      onSave(editValue);
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setEditValue(value ?? "");
      setEditing(false);
    }
    if (e.key === "Enter") {
      save();
    }
  }

  if (editing) {
    return (
      <div>
        <div className="text-[11px] text-gray-500 mb-0.5">{label}</div>
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="text-[11px] text-gray-500 mb-0.5">{label}</div>
      <button
        onClick={startEdit}
        className="group flex items-center gap-1.5 text-left"
      >
        <span className={`text-sm ${value ? "text-gray-900" : "text-gray-400 italic"}`}>
          {value || "Not available"}
        </span>
        <svg
          className="w-3 h-3 text-gray-300 group-hover:text-indigo-500 flex-shrink-0 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      </button>
    </div>
  );
}
