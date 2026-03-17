"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import { logger } from "@/lib/logger";
import { InlineEditField } from "./inline-edit-field";
import { InlineSelectField } from "./inline-select-field";
import { DealEntitySection } from "./deal-entity-section";
import { mutate } from "swr";
import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS,
  CAPITAL_INSTRUMENT_LABELS,
  PARTICIPATION_LABELS,
  PARTICIPATION_COLORS,
} from "@/lib/constants";
import { formatDate, fmt } from "@/lib/utils";
import { FileDown } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Memo sections, previous versions, and workstream shapes come from JSON fields —
// remaining any usages below are for those API response fields only.
/* eslint-disable @typescript-eslint/no-explicit-any */

interface DealForOverviewTab {
  id: string;
  stage: string;
  name: string;
  aiScore?: number | null;
  assetClass: string;
  capitalInstrument?: string;
  participationStructure?: string;
  targetSize: string | null;
  targetReturn: string | null;
  targetCheckSize: string | null;
  source: string | null;
  counterparty: string | null;
  gpName: string | null;
  investmentRationale: string | null;
  thesisNotes: string | null;
  description: string | null;
  additionalContext: string | null;
  projectedExitTimeframe?: string | null;
  dealMetadata?: Record<string, unknown> | null;
  dealLead?: { id: string; name?: string | null; initials?: string | null } | null;
  documents?: Array<unknown>;
  notes?: Array<unknown>;
  workstreams?: Array<{ analysisType?: string | null }>;
  sourceAssets?: Array<{ id: string; name: string; costBasis?: number | null; fairValue?: number | null; moic?: number | null; irr?: number | null }>;
  screeningResult?: {
    memo?: Record<string, any> | null;
    memoGeneratedAt?: string | null;
    version?: number | null;
    recommendation?: string | null;
    previousVersions?: unknown;
  } | null;
}

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
  deal: DealForOverviewTab;
  regenerating: boolean;
  regenerateMemo: () => void;
}

export function DealOverviewTab({
  deal,
  regenerating,
  regenerateMemo,
}: DealOverviewTabProps) {
  const [sourceDataOpen, setSourceDataOpen] = useState(false);
  const [memoExpanded, setMemoExpanded] = useState(true);
  const [fullMemoExpanded, setFullMemoExpanded] = useState(false);
  const [selectedMemoVersion, setSelectedMemoVersion] = useState<number | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const toast = useToast();
  const { firmId } = useFirm();

  // Directory data for party selectors
  const { data: companies, isLoading: companiesLoading } = useSWR(
    `/api/companies?firmId=${firmId}`,
    fetcher
  );
  const { data: contactsData, isLoading: contactsLoading } = useSWR(
    `/api/contacts?firmId=${firmId}&limit=200`,
    fetcher
  );
  const contacts = contactsData?.contacts || contactsData || [];

  // Build selector options
  const gpOptions = useMemo(() => {
    if (!companies) return [];
    const gpCompanies = (companies as any[]).filter((c: any) => c.type === "GP");
    const otherCompanies = (companies as any[]).filter((c: any) => c.type !== "GP");
    return [
      ...gpCompanies.map((c: any) => ({ value: c.name, label: c.name, sublabel: "GP" })),
      ...otherCompanies.map((c: any) => ({ value: c.name, label: c.name, sublabel: c.type?.replace(/_/g, " ") })),
    ];
  }, [companies]);

  const counterpartyOptions = useMemo(() => {
    if (!companies) return [];
    const cpCompanies = (companies as any[]).filter((c: any) =>
      ["COUNTERPARTY", "OPERATING_COMPANY"].includes(c.type)
    );
    const otherCompanies = (companies as any[]).filter((c: any) =>
      !["COUNTERPARTY", "OPERATING_COMPANY"].includes(c.type)
    );
    return [
      ...cpCompanies.map((c: any) => ({ value: c.name, label: c.name, sublabel: c.type?.replace(/_/g, " ") })),
      ...otherCompanies.map((c: any) => ({ value: c.name, label: c.name, sublabel: c.type?.replace(/_/g, " ") })),
    ];
  }, [companies]);

  const sourceOptions = useMemo(() => {
    if (!contacts) return [];
    return (contacts as any[]).map((c: any) => ({
      value: `${c.firstName} ${c.lastName}`.trim(),
      label: `${c.firstName} ${c.lastName}`.trim(),
      sublabel: c.company?.name || c.email || c.type,
    }));
  }, [contacts]);

  const isScreening = deal.stage === "SCREENING";
  const workstreams = ((deal.workstreams || []) as any[]).filter(
    (w: any) => w.analysisType !== "IC_MEMO"
  );

  // IC Memo data
  const sr = deal.screeningResult;
  const hasMemo = !!sr?.memo;
  const isAnalyzing = false;

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
    return (deal.assetClass ? ASSET_CLASS_FIELDS[deal.assetClass] : undefined) || [];
  }

  // Trigger AI metadata extraction
  async function extractMetadata() {
    setExtracting(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}/extract-metadata`, {
        method: "POST",
      });
      if (res.status === 504) {
        toast.error("AI generation timed out. Try again with a smaller document.");
        return;
      }
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

  // Download IC Memo as PDF
  async function exportMemoPDF() {
    if (!sr?.memo || typeof window === "undefined") return;
    setExportingPDF(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { ICMemoPDF } = await import("@/lib/pdf/ic-memo");
      const memo = sr.memo;
      const memoData = {
        dealName: deal.name,
        recommendation: memo.recommendation ?? null,
        executiveSummary: memo.summary ?? null,
        sections: Array.isArray(memo.sections) ? memo.sections : [],
        generatedAt: sr.memoGeneratedAt ?? new Date().toISOString(),
        dealLead: deal.dealLead?.name ?? null,
        targetSize: deal.targetSize ?? null,
        assetClass: deal.assetClass ? (ASSET_CLASS_LABELS[deal.assetClass] || deal.assetClass) : null,
        stage: deal.stage ?? null,
      };
      const blob = await pdf(<ICMemoPDF data={memoData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `IC_Memo_${deal.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error("PDF export failed:", { error: err instanceof Error ? err.message : String(err) });
      toast.error("Failed to export PDF");
    } finally {
      setExportingPDF(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── SCREENING stage ── */}
      {isScreening && (
        <>
          {renderDealFields()}
          {/* Investment Vehicle */}
          <DealEntitySection dealId={deal.id} />
        </>
      )}

      {/* ── Post-screening: 4-Section Dashboard ── */}
      {!isScreening && (
        <>
          {/* Stage-specific quick stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {deal.stage === "DUE_DILIGENCE" && (() => {
              const ws = ((deal.workstreams || []) as any[]).filter((w: any) => w.analysisType !== "IC_MEMO");
              const complete = ws.filter((w: any) => w.status === "COMPLETE").length;
              const inProgress = ws.filter((w: any) => w.status === "IN_PROGRESS").length;
              return (
                <>
                  <StatCard label="Workstreams" value={`${complete}/${ws.length} done`} small />
                  <StatCard label="In Progress" value={String(inProgress)} small />
                  <StatCard label="Target Return" value={deal.targetReturn || "--"} small />
                  <StatCard label="Exit Timeframe" value={deal.projectedExitTimeframe || "--"} small />
                </>
              );
            })()}

            {deal.stage === "IC_REVIEW" && (() => {
              const votes = (deal as any).icProcess?.votes || [];
              const approve = votes.filter((v: any) => v.vote === "APPROVE").length;
              const structure = (deal as any).targetEntity?.decisionStructure;
              const voterCount = structure?.members?.filter((m: any) => m.role === "VOTER" || !m.role).length || votes.length;
              return (
                <>
                  <StatCard label="IC Votes" value={`${votes.length}/${voterCount}`} small />
                  <StatCard label="Approvals" value={String(approve)} small />
                  <StatCard label="AI Score" value={deal.aiScore != null ? String(deal.aiScore) : "--"} small />
                  <StatCard label="Exit Timeframe" value={deal.projectedExitTimeframe || "--"} small />
                </>
              );
            })()}

            {deal.stage === "CLOSING" && (() => {
              const items = ((deal as any).closingChecklist || []) as any[];
              const complete = items.filter((i: any) => i.completed || i.status === "COMPLETE").length;
              return (
                <>
                  <StatCard label="Closing Progress" value={`${complete}/${items.length}`} small />
                  <StatCard label="Target Check" value={deal.targetCheckSize || "--"} small />
                  <StatCard label="Target Return" value={deal.targetReturn || "--"} small />
                  <StatCard label="Exit Timeframe" value={deal.projectedExitTimeframe || "--"} small />
                </>
              );
            })()}

            {deal.stage === "CLOSED" && (() => {
              const asset = deal.sourceAssets?.[0];
              const costBasis = asset?.costBasis;
              const fairValue = asset?.fairValue;
              return (
                <>
                  <StatCard label="Cost Basis" value={costBasis != null ? fmt(costBasis) : "--"} small />
                  <StatCard label="Fair Value" value={fairValue != null ? fmt(fairValue) : "--"} small />
                  <StatCard label="MOIC" value={asset?.moic != null ? `${asset.moic.toFixed(2)}x` : "--"} small />
                  <StatCard label="IRR" value={asset?.irr != null ? `${(asset.irr * 100).toFixed(1)}%` : "--"} small />
                </>
              );
            })()}

            {deal.stage === "DEAD" && (
              <>
                <StatCard label="Target Return" value={deal.targetReturn || "--"} small />
                <StatCard label="Deal Size" value={deal.targetSize || "--"} small />
                <StatCard label="Target Check" value={deal.targetCheckSize || "--"} small />
                <StatCard label="AI Score" value={deal.aiScore != null ? String(deal.aiScore) : "--"} small />
              </>
            )}
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
                          v{v.version} ({formatDate(v.memoGeneratedAt)})
                        </option>
                      ))}
                    </select>
                  )}
                  {hasMemo && !isAnalyzing && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={exportingPDF}
                      onClick={exportMemoPDF}
                      title="Download IC Memo as PDF"
                    >
                      <FileDown className="w-3.5 h-3.5 mr-1" />
                      Export PDF
                    </Button>
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
                          Generated {formatDate(sr.memoGeneratedAt)} · v{currentMemoVersion}
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <InlineEditField label="Total Raise" value={deal.targetSize} field="targetSize" dealId={deal.id} placeholder="e.g. $50M" />
            <InlineEditField label="Target Check Size" value={deal.targetCheckSize} field="targetCheckSize" dealId={deal.id} placeholder="e.g. $10M" />
            <InlineEditField label="Target Return" value={deal.targetReturn} field="targetReturn" dealId={deal.id} placeholder="e.g. 2.5x / 25% IRR" />
            <InlineEditField label="Exit Timeframe" value={deal.projectedExitTimeframe ?? null} field="projectedExitTimeframe" dealId={deal.id} placeholder="e.g. 3-5 years" />
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
            <InlineSelectField label="GP / Sponsor" value={deal.gpName} field="gpName" dealId={deal.id} options={gpOptions} placeholder="Select from directory..." allowCustom loading={companiesLoading} />
            <InlineSelectField label="Source" value={deal.source} field="source" dealId={deal.id} options={sourceOptions} placeholder="Select from directory..." allowCustom loading={contactsLoading} />
            <InlineSelectField label="Counterparty" value={deal.counterparty} field="counterparty" dealId={deal.id} options={counterpartyOptions} placeholder="Select from directory..." allowCustom loading={companiesLoading} />
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
