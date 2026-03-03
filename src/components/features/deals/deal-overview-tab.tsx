"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineEditField } from "./inline-edit-field";
import { ScreeningConfigModal } from "./screening-config-modal";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import Link from "next/link";

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
  STRONG_PROCEED: "green",
  PROCEED: "blue",
  PROCEED_WITH_CAUTION: "yellow",
  WATCHLIST: "orange",
  PASS: "red",
  APPROVE: "green",
  APPROVE_WITH_CONDITIONS: "yellow",
  DECLINE: "red",
};

interface DealOverviewTabProps {
  deal: any;
}

export function DealOverviewTab({ deal }: DealOverviewTabProps) {
  const [showScreeningConfig, setShowScreeningConfig] = useState(false);
  const [showRerunConfig, setShowRerunConfig] = useState(false);
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
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [screeningDetailsOpen, setScreeningDetailsOpen] = useState(false);
  const [sourceDataOpen, setSourceDataOpen] = useState(false);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const toast = useToast();
  const { firmId } = useFirm();

  const { data: entities } = useSWR(
    showLinkEntity ? `/api/entities?firmId=${firmId}` : null,
    fetcher
  );

  const hasScreeningResult = !!deal.screeningResult;
  const isScreening = deal.stage === "SCREENING";

  // ── Version management ──
  const sr = deal.screeningResult;
  const previousVersions: any[] = sr?.previousVersions
    ? (Array.isArray(sr.previousVersions) ? sr.previousVersions : [])
    : [];
  const currentVersion = sr?.version ?? 1;

  // Build display data: either current or a historical version
  const displayData =
    selectedVersion != null
      ? previousVersions.find((v: any) => v.version === selectedVersion)
      : sr;

  const displayMemo = displayData?.memo;
  const displayScore = displayData?.score ?? 0;
  const isMock = displayData?.summary?.includes("Mock") || displayData?.summary?.includes("mock");
  const isHistorical = selectedVersion != null;

  function getScoreColor(score: number | null | undefined) {
    if (score == null) return undefined;
    if (score >= 70) return "green";
    if (score >= 40) return "yellow";
    return "red";
  }

  // ── Entity management (same as before) ──

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

  async function runScreening() {
    setScreeningLoading(true);
    try {
      await fetch(`/api/deals/${deal.id}/screen`, { method: "POST" });
      toast.success("AI screening complete — IC Memo generated");
      mutate(`/api/deals/${deal.id}`);
    } catch {
      toast.error("Screening failed");
    } finally {
      setScreeningLoading(false);
    }
  }

  // ── If screening hasn't run, show input form + CTA ──

  if (!hasScreeningResult) {
    return (
      <div className="space-y-6">
        {/* Editable fields */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {renderEditableFields()}
          </div>
          <div className="space-y-3">
            <StatCard label="Stage" value={stageLabel[deal.stage] || deal.stage} small />
            <StatCard label="AI Score" value="---" small />
            <StatCard label="Documents" value={String(deal.documents?.length ?? 0)} small />
            <StatCard label="Notes" value={String(deal.notes?.length ?? 0)} small />
          </div>
        </div>

        {/* Run AI Screening CTA */}
        {isScreening && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-purple-900">Ready to screen?</div>
                <p className="text-sm text-purple-700 mt-1">
                  AI will analyze all deal info, documents, and notes to generate an IC Memo with screening score and populate Due Diligence workstreams.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button loading={screeningLoading} onClick={runScreening}>
                    Run AI Screening
                  </Button>
                  <Button variant="secondary" onClick={() => setShowScreeningConfig(true)}>
                    Configure &amp; Run
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ScreeningConfigModal
          open={showScreeningConfig}
          onClose={() => setShowScreeningConfig(false)}
          dealId={deal.id}
          onComplete={() => setShowScreeningConfig(false)}
        />
      </div>
    );
  }

  // ── Screening has run: show IC Memo + collapsible sections ──

  const scoreColor = getScoreColor(displayScore);

  return (
    <div className="space-y-4">
      {/* Historical version banner */}
      {isHistorical && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Viewing historical version {selectedVersion}. </span>
          <button
            onClick={() => setSelectedVersion(null)}
            className="text-amber-700 font-semibold underline hover:text-amber-900"
          >
            Return to current
          </button>
        </div>
      )}

      {/* ── Memo Header ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Score badge */}
              <div className={`text-2xl font-bold px-4 py-2 rounded-xl ${
                scoreColor === "green"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : scoreColor === "yellow"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {displayScore}/100
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-gray-900">AI Screening Score</div>
                  <Badge color={isMock ? "gray" : "purple"}>
                    {isMock ? "Mock" : "AI-Powered"}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Processed {new Date(displayData?.processedAt || displayData?.memoGeneratedAt || Date.now()).toLocaleDateString()}
                </div>
              </div>
              {displayData?.recommendation && (
                <Badge color={REC_COLORS[displayData.recommendation] || "gray"}>
                  {displayData.recommendation.replace(/_/g, " ")}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Version selector */}
              {previousVersions.length > 0 && (
                <select
                  value={selectedVersion ?? ""}
                  onChange={(e) => setSelectedVersion(e.target.value ? Number(e.target.value) : null)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                >
                  <option value="">v{currentVersion} (Current)</option>
                  {[...previousVersions].reverse().map((v: any) => (
                    <option key={v.version} value={v.version}>
                      v{v.version} ({new Date(v.processedAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              )}
              {!isHistorical && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowRerunConfig(true)}
                >
                  Re-run Screening
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── IC Memo Body ── */}
        {displayMemo && (
          <div className="p-5 space-y-4">
            {/* Memo summary */}
            <p className="text-sm text-gray-700">{displayMemo.summary}</p>

            {/* Memo sections */}
            {Array.isArray(displayMemo.sections) && displayMemo.sections.map((section: any, i: number) => (
              <div key={i}>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">{section.name}</h4>
                  {section.riskLevel && (
                    <Badge
                      color={section.riskLevel === "HIGH" ? "red" : section.riskLevel === "MEDIUM" ? "yellow" : "green"}
                    >
                      {section.riskLevel}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{section.content}</p>
              </div>
            ))}

            {/* Memo recommendation */}
            {displayMemo.recommendation && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-700">IC Recommendation:</span>
                <Badge
                  color={
                    displayMemo.recommendation.includes("APPROVE") && !displayMemo.recommendation.includes("CONDITIONS") ? "green" :
                    displayMemo.recommendation === "DECLINE" ? "red" : "yellow"
                  }
                >
                  {displayMemo.recommendation.replace(/_/g, " ")}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Fallback if no memo yet */}
        {!displayMemo && displayData?.summary && (
          <div className="p-5">
            <p className="text-sm text-gray-600">{displayData.summary}</p>
          </div>
        )}
      </div>

      {/* ── Screening Details (collapsible) ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setScreeningDetailsOpen(!screeningDetailsOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-700">Screening Details</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${screeningDetailsOpen ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {screeningDetailsOpen && (
          <div className="p-4 space-y-4">
            {/* Financials */}
            {displayData?.financials && typeof displayData.financials === "object" && Object.keys(displayData.financials).length > 0 && (
              <div>
                <div className="text-xs font-semibold text-indigo-700 mb-1">Key Financials</div>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(displayData.financials).map(([key, value]) => (
                    <div key={key} className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                      <div className="text-[10px] text-indigo-500 uppercase tracking-wide">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      <div className="text-sm font-semibold text-indigo-800">{String(value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {displayData?.strengths && (
              <div>
                <div className="text-xs font-semibold text-emerald-700 mb-1">Strengths</div>
                <ul className="space-y-1">
                  {(Array.isArray(displayData.strengths) ? displayData.strengths : []).map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-emerald-500 mt-0.5">+</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks */}
            {displayData?.risks && (
              <div>
                <div className="text-xs font-semibold text-red-700 mb-1">Risks</div>
                <ul className="space-y-1">
                  {(Array.isArray(displayData.risks) ? displayData.risks : []).map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-red-500 mt-0.5">-</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Source Data & Deal Details (collapsible) ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setSourceDataOpen(!sourceDataOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-700">Source Data &amp; Deal Details</span>
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
                <StatCard
                  label="AI Score"
                  value={sr?.score != null ? `${sr.score}/100` : "---"}
                  small
                />
                <StatCard label="Documents" value={String(deal.documents?.length ?? 0)} small />
                <StatCard label="Notes" value={String(deal.notes?.length ?? 0)} small />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stage Gate Summary (for DUE_DILIGENCE stage) */}
      {deal.stage === "DUE_DILIGENCE" && deal.workstreams?.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-semibold text-gray-700 mb-2">Workstream Progress</div>
          <div className="space-y-1">
            {(deal.workstreams as any[]).map((ws: any) => {
              const pct = ws.totalTasks > 0 ? Math.round((ws.completedTasks / ws.totalTasks) * 100) : 0;
              return (
                <div key={ws.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${
                    ws.status === "COMPLETE" ? "bg-emerald-400" :
                    ws.status === "IN_PROGRESS" ? "bg-amber-400" : "bg-gray-300"
                  }`} />
                  <span className="flex-1">{ws.name}</span>
                  <span className="text-gray-500">{ws.completedTasks}/{ws.totalTasks} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rerun config modal */}
      <ScreeningConfigModal
        open={showRerunConfig}
        onClose={() => setShowRerunConfig(false)}
        dealId={deal.id}
        rerun
        onComplete={() => setShowRerunConfig(false)}
      />
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
