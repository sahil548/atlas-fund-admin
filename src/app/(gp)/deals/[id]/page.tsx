"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CloseDealModal } from "@/components/features/deals/close-deal-modal";
import { EditDealForm } from "@/components/features/deals/edit-deal-form";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";

// Tab components
import { DealOverviewTab } from "@/components/features/deals/deal-overview-tab";
import { DealDocumentsTab } from "@/components/features/deals/deal-documents-tab";
import { DealNotesTab } from "@/components/features/deals/deal-notes-tab";
import { DealDDTab } from "@/components/features/deals/deal-dd-tab";
import { DealActivityTab } from "@/components/features/deals/deal-activity-tab";
import { DealICReviewTab } from "@/components/features/deals/deal-ic-review-tab";
import { DealClosingTab } from "@/components/features/deals/deal-closing-tab";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS,
  CAPITAL_INSTRUMENT_LABELS,
  PARTICIPATION_LABELS,
  PARTICIPATION_COLORS,
} from "@/lib/constants";

/* eslint-disable @typescript-eslint/no-explicit-any */

const stageOrder = ["SCREENING", "DUE_DILIGENCE", "IC_REVIEW", "CLOSING"];
const stageLabel: Record<string, string> = {
  SCREENING: "Screening",
  DUE_DILIGENCE: "Due Diligence",
  IC_REVIEW: "IC Review",
  CLOSING: "Closing",
  CLOSED: "Closed",
  DEAD: "Dead",
};

const NAME_TO_TYPE: Record<string, string> = {
  "Financial DD": "DD_FINANCIAL",
  "Legal DD": "DD_LEGAL",
  "Market DD": "DD_MARKET",
  "Tax DD": "DD_TAX",
  "Operational DD": "DD_OPERATIONAL",
  "ESG DD": "DD_ESG",
  "Collateral DD": "DD_COLLATERAL",
  "Tenant & Lease DD": "DD_TENANT_LEASE",
  "Customer DD": "DD_CUSTOMER",
  "Technology DD": "DD_TECHNOLOGY",
  "Regulatory & Permitting DD": "DD_REGULATORY",
  "Engineering DD": "DD_ENGINEERING",
  "Credit DD": "DD_CREDIT",
  "Commercial DD": "DD_COMMERCIAL",
  "Management DD": "DD_MANAGEMENT",
};

/* ── Stage-dependent tab visibility ──────────────── */
const stageTabs: Record<string, string[]> = {
  SCREENING: ["Overview", "Due Diligence", "Documents", "Notes", "Activity"],
  DUE_DILIGENCE: [
    "Overview",
    "Due Diligence",
    "Documents",
    "Notes",
    "Activity",
  ],
  IC_REVIEW: [
    "Overview",
    "Due Diligence",
    "Documents",
    "Notes",
    "Activity",
    "IC Review",
  ],
  CLOSING: [
    "Overview",
    "Due Diligence",
    "Documents",
    "Notes",
    "Activity",
    "IC Review",
    "Closing",
  ],
  CLOSED: [
    "Overview",
    "Due Diligence",
    "Documents",
    "Notes",
    "Activity",
    "IC Review",
    "Closing",
  ],
};

function getDeadTabs(deal: any): string[] {
  const tabs = ["Overview", "Due Diligence", "Documents", "Notes", "Activity"];
  if (deal.icProcess) {
    tabs.push("IC Review");
  }
  return tabs;
}

export interface AnalysisProgress {
  total: number;
  completed: number;
  current?: string;
  phase?: string;
  /** Names of the workstreams being analyzed (for dynamic display) */
  workstreamNames?: string[];
  /** Set of workstream names currently running in parallel */
  running?: Set<string>;
  /** Set of workstream names that have completed */
  done?: Set<string>;
}

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: deal, isLoading } = useSWR(`/api/deals/${id}`, fetcher);
  const toast = useToast();
  const [tab, setTab] = useState("Overview");
  const [showEdit, setShowEdit] = useState(false);
  const [showKillConfirm, setShowKillConfirm] = useState(false);
  const [showSendToIC, setShowSendToIC] = useState(false);
  const [sendToICWarning, setSendToICWarning] = useState<string | null>(null);
  const [killingDeal, setKillingDeal] = useState(false);
  const [sendingToIC, setSendingToIC] = useState(false);
  const [showAdvanceToClosing, setShowAdvanceToClosing] = useState(false);
  const [showCloseDeal, setShowCloseDeal] = useState(false);
  const [advancingToClosing, setAdvancingToClosing] = useState(false);
  const [closingDeal, setClosingDeal] = useState(false);

  // ── Analysis orchestration state (lives here so tab switches don't kill it) ──
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [ddStarting, setDDStarting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const autoStartedRef = useRef(false);

  // ── Auto-trigger for "Create & Screen" path ──
  // When the deal is in DUE_DILIGENCE with workstreams but no analyses, auto-start.
  useEffect(() => {
    if (!deal) return;
    const ws = (deal.workstreams || []) as any[];
    const nonMemo = ws.filter((w: any) => w.analysisType !== "IC_MEMO");
    const hasAnyAnalysis = nonMemo.some((w: any) => !!w.analysisResult);
    const hasMemo = !!deal.screeningResult?.memo;
    const needsInitial = deal.stage !== "SCREENING" && nonMemo.length > 0 && !hasAnyAnalysis && !hasMemo;

    if (needsInitial && !autoStartedRef.current && !analysisProgress && !regenerating) {
      autoStartedRef.current = true;
      runAnalysesAndMemo(nonMemo, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.stage, deal?.workstreams?.length, deal?.screeningResult?.memo]);

  // ── Core analysis runner (survives tab switches) ──
  const runAnalysesAndMemo = useCallback(async (workstreamsList: any[], isRerun: boolean) => {
    const analyzable = isRerun
      ? workstreamsList.filter((w: any) => w.analysisType !== "IC_MEMO")
      : workstreamsList.filter((w: any) => !w.analysisResult);

    const wsNames = analyzable.map((w: any) => w.name);
    const totalSteps = analyzable.length + 1; // +1 for IC memo
    const runningSet = new Set<string>(wsNames);
    const doneSet = new Set<string>();
    setAnalysisProgress({ total: totalSteps, completed: 0, phase: "Analyzing workstreams", workstreamNames: wsNames, running: runningSet, done: doneSet });

    try {
      // Phase 1: Run all workstream analyses in parallel
      let completed = 0;
      await Promise.allSettled(
        analyzable.map(async (w: any) => {
          const type = w.analysisType || NAME_TO_TYPE[w.name] || "DD_CUSTOM";
          try {
            const res = await fetch(`/api/deals/${id}/dd-analyze`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type, categoryName: w.name, rerun: isRerun }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              console.warn(`Analysis failed for ${w.name}:`, err.error);
            }
          } catch {
            // continue with other workstreams
          }
          completed++;
          doneSet.add(w.name);
          runningSet.delete(w.name);
          setAnalysisProgress((p) =>
            p ? { ...p, completed, running: new Set(runningSet), done: new Set(doneSet) } : null
          );
        })
      );

      // Phase 2: Generate IC Memo from workstream outputs
      setAnalysisProgress((p) =>
        p ? { ...p, current: "IC Memo", phase: "Generating IC Memo", running: new Set(["IC Memo"]), done: new Set(doneSet) } : null
      );
      try {
        await fetch(`/api/deals/${id}/dd-analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "IC_MEMO", rerun: isRerun || !!deal?.screeningResult?.memo }),
        });
      } catch {
        toast.error("IC Memo generation failed — workstream analyses are still available");
      }
    } finally {
      setAnalysisProgress(null);
      mutate(`/api/deals/${id}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Start screening (from SCREENING stage button) ──
  async function startScreening() {
    setDDStarting(true);
    try {
      // Advance stage (workstreams already exist from deal creation)
      const res = await fetch(`/api/deals/${id}/screen`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start screening");
      }
      const updatedDeal = await res.json();
      mutate(`/api/deals/${id}`, updatedDeal, false);

      // Run all analyses + generate IC memo
      const ws = (updatedDeal.workstreams || []) as any[];
      const nonMemo = ws.filter((w: any) => w.analysisType !== "IC_MEMO");
      if (nonMemo.length > 0) {
        autoStartedRef.current = true; // prevent useEffect double-trigger
        await runAnalysesAndMemo(nonMemo, false);
      }

      toast.success("Screening complete — IC Memo generated");
      mutate(`/api/deals/${id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to start screening");
    } finally {
      setDDStarting(false);
      setAnalysisProgress(null);
    }
  }

  // ── Regenerate (re-run all analyses + regenerate IC memo) ──
  async function regenerateMemo() {
    if (!deal) return;
    setRegenerating(true);
    try {
      const ws = (deal.workstreams || []) as any[];
      const nonMemo = ws.filter((w: any) => w.analysisType !== "IC_MEMO");
      await runAnalysesAndMemo(nonMemo, true);
      toast.success("All analyses re-run — IC Memo regenerated");
      mutate(`/api/deals/${id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate");
    } finally {
      setRegenerating(false);
      setAnalysisProgress(null);
    }
  }

  if (isLoading || !deal)
    return <div className="text-sm text-gray-400">Loading...</div>;

  const currentIdx = deal.stage === "CLOSED"
    ? stageOrder.length // all segments show as completed
    : stageOrder.indexOf(deal.stage);
  const isDead = deal.stage === "DEAD";
  const isClosed = deal.stage === "CLOSED";
  const visibleTabs = isDead
    ? getDeadTabs(deal)
    : stageTabs[deal.stage] || stageTabs.SCREENING;

  // If the current tab isn't visible, reset to Overview
  const activeTab = visibleTabs.includes(tab) ? tab : "Overview";

  /* ── Header Actions ────────────────────────────── */

  async function handleKillDeal() {
    setKillingDeal(true);
    try {
      await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "KILL" }),
      });
      toast.success("Deal marked as dead");
      mutate(`/api/deals/${id}`);
      setShowKillConfirm(false);
    } catch {
      toast.error("Failed to kill deal");
    } finally {
      setKillingDeal(false);
    }
  }

  async function handleSendToIC(force = false) {
    setSendingToIC(true);
    try {
      const res = await fetch(`/api/deals/${id}/send-to-ic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (data.warning && !force) {
        setSendToICWarning(data.warning);
        return;
      }
      toast.success("Deal sent to IC Review");
      mutate(`/api/deals/${id}`);
      setShowSendToIC(false);
      setSendToICWarning(null);
    } catch {
      toast.error("Failed to send to IC");
    } finally {
      setSendingToIC(false);
    }
  }

  async function handleAdvanceToClosing() {
    setAdvancingToClosing(true);
    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADVANCE_TO_CLOSING" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Failed to advance");
        return;
      }
      toast.success("Deal advanced to Closing");
      mutate(`/api/deals/${id}`);
      setShowAdvanceToClosing(false);
    } catch {
      toast.error("Failed to advance to closing");
    } finally {
      setAdvancingToClosing(false);
    }
  }

  async function handleCloseDeal(closeData: { costBasis: number; fairValue: number; entryDate: string }) {
    setClosingDeal(true);
    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CLOSE", force: true, ...closeData }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Failed to close deal");
        return;
      }
      toast.success("Deal closed — asset created and booked");
      mutate(`/api/deals/${id}`);
      mutate("/api/deals");
      setShowCloseDeal(false);
    } catch {
      toast.error("Failed to close deal");
    } finally {
      setClosingDeal(false);
    }
  }

  /* ── Render active tab component ───────────────── */

  function renderTab() {
    switch (activeTab) {
      case "Overview":
        return (
          <DealOverviewTab
            deal={deal}
            analysisProgress={analysisProgress}
            ddStarting={ddStarting}
            regenerating={regenerating}
            startScreening={startScreening}
            regenerateMemo={regenerateMemo}
          />
        );
      case "Documents":
        return <DealDocumentsTab deal={deal} />;
      case "Notes":
        return <DealNotesTab deal={deal} />;
      case "Due Diligence":
        return <DealDDTab deal={deal} />;
      case "Activity":
        return <DealActivityTab deal={deal} />;
      case "IC Review":
        return <DealICReviewTab deal={deal} />;
      case "Closing":
        return <DealClosingTab deal={deal} />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href="/deals"
        className="text-xs text-indigo-600 hover:underline"
      >
        &larr; Back to pipeline
      </Link>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{deal.name}</h2>
            <Badge color={ASSET_CLASS_COLORS[deal.assetClass]}>
              {ASSET_CLASS_LABELS[deal.assetClass]}
            </Badge>
            {deal.capitalInstrument && (
              <Badge color={deal.capitalInstrument === "DEBT" ? "orange" : "blue"}>
                {CAPITAL_INSTRUMENT_LABELS[deal.capitalInstrument]}
              </Badge>
            )}
            {deal.participationStructure && (
              <Badge color={PARTICIPATION_COLORS[deal.participationStructure] || "gray"}>
                {PARTICIPATION_LABELS[deal.participationStructure] || deal.participationStructure}
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {deal.sector} · Target: {deal.targetSize} · Lead:{" "}
            {deal.dealLead?.name || "Unassigned"}
            {deal.counterparty && ` · Counterparty: ${deal.counterparty}`}
          </div>
        </div>
        <div className="flex gap-2">
          {deal.stage === "DUE_DILIGENCE" && (
            <Button onClick={() => setShowSendToIC(true)}>
              Send to IC Review
            </Button>
          )}
          {deal.stage === "IC_REVIEW" &&
            deal.icProcess?.finalDecision === "APPROVED" && (
              <Button onClick={() => setShowAdvanceToClosing(true)}>
                Advance to Closing
              </Button>
            )}
          {deal.stage === "CLOSING" && (
            <Button
              onClick={() => setShowCloseDeal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Close Deal
            </Button>
          )}
          {!isDead && !isClosed && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowKillConfirm(true)}
            >
              Kill Deal
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowEdit(true)}
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Stage Progress Bar */}
      {!isDead && (
        <div className="flex items-center gap-1">
          {stageOrder.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full h-1.5 rounded-full ${
                  i <= currentIdx
                    ? i === currentIdx
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                    : "bg-gray-200"
                }`}
              />
              <span
                className={`text-[9px] mt-1 ${
                  i === currentIdx
                    ? "text-amber-700 font-semibold"
                    : i < currentIdx
                    ? "text-emerald-600"
                    : "text-gray-400"
                }`}
              >
                {stageLabel[s]}
              </span>
            </div>
          ))}
        </div>
      )}

      {deal.stage === "IC_REVIEW" && !isDead && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          <span className="font-semibold">Next step:</span>{" "}
          {deal.icProcess?.finalDecision === "APPROVED"
            ? 'IC has approved — click "Advance to Closing" to begin the closing process.'
            : "Awaiting IC decision. Once approved, you can advance to Closing."}
        </div>
      )}
      {deal.stage === "CLOSING" && !isClosed && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-700">
          <span className="font-semibold">Next step:</span> Complete all items
          in the Closing tab, then click &quot;Close Deal&quot; to finalize.
        </div>
      )}

      {isDead && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 font-medium">
          This deal has been killed and is no longer active.
        </div>
      )}

      {isClosed && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700 font-medium">
          This deal has been closed — the asset has been created and booked.
        </div>
      )}

      {/* Analysis Progress Banner (visible across all tabs) */}
      {analysisProgress && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-indigo-800">
                {analysisProgress.phase === "Generating IC Memo"
                  ? "Generating IC Memo"
                  : `Running ${analysisProgress.running?.size ?? 0} workstreams in parallel`}
              </span>
            </div>
            <span className="text-xs text-indigo-600 font-medium">
              {analysisProgress.completed}/{analysisProgress.total} complete
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
          {analysisProgress.workstreamNames && analysisProgress.workstreamNames.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {analysisProgress.workstreamNames.map((name) => {
                const isDone = analysisProgress.done?.has(name);
                const isRunning = analysisProgress.running?.has(name);
                return (
                  <span
                    key={name}
                    className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                      isDone
                        ? "bg-emerald-100 text-emerald-700"
                        : isRunning
                          ? "bg-indigo-200 text-indigo-800 font-semibold animate-pulse"
                          : "bg-indigo-100 text-indigo-500"
                    }`}
                  >
                    {isDone ? "\u2713 " : isRunning ? "\u25CF " : ""}{name}
                  </span>
                );
              })}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                  analysisProgress.running?.has("IC Memo")
                    ? "bg-indigo-200 text-indigo-800 font-semibold animate-pulse"
                    : analysisProgress.done?.has("IC Memo")
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-indigo-100 text-indigo-500"
                }`}
              >
                {analysisProgress.done?.has("IC Memo") ? "\u2713 " : analysisProgress.running?.has("IC Memo") ? "\u25CF " : ""}IC Memo
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {visibleTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 ${
              activeTab === t
                ? "bg-white text-indigo-700 border-gray-200"
                : "bg-gray-50 text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {renderTab()}
      </div>

      {/* Modals */}
      <EditDealForm
        open={showEdit}
        onClose={() => setShowEdit(false)}
        deal={{
          id: deal.id,
          name: deal.name,
          sector: deal.sector,
          targetSize: deal.targetSize,
          targetCheckSize: deal.targetCheckSize,
          targetReturn: deal.targetReturn,
          dealLeadId: deal.dealLeadId,
          assetClass: deal.assetClass,
          capitalInstrument: deal.capitalInstrument,
          participationStructure: deal.participationStructure,
          gpName: deal.gpName,
          source: deal.source,
          counterparty: deal.counterparty,
          description: deal.description,
          thesisNotes: deal.thesisNotes,
          investmentRationale: deal.investmentRationale,
          additionalContext: deal.additionalContext,
        }}
      />
      <ConfirmDialog
        open={showKillConfirm}
        onClose={() => setShowKillConfirm(false)}
        onConfirm={handleKillDeal}
        title="Kill Deal"
        message={`Are you sure you want to kill "${deal.name}"? This will move it to the DEAD stage.`}
        confirmLabel="Kill Deal"
        variant="danger"
        loading={killingDeal}
      />
      <ConfirmDialog
        open={showSendToIC}
        onClose={() => {
          setShowSendToIC(false);
          setSendToICWarning(null);
        }}
        onConfirm={() =>
          sendToICWarning ? handleSendToIC(true) : handleSendToIC(false)
        }
        title="Send to IC Review"
        message={
          sendToICWarning ||
          `Send "${deal.name}" to the Investment Committee for review?`
        }
        confirmLabel={sendToICWarning ? "Send Anyway" : "Send to IC"}
        variant="primary"
        loading={sendingToIC}
      />
      <ConfirmDialog
        open={showAdvanceToClosing}
        onClose={() => setShowAdvanceToClosing(false)}
        onConfirm={handleAdvanceToClosing}
        title="Advance to Closing"
        message={`Advance "${deal.name}" to the Closing stage? This will begin the closing process.`}
        confirmLabel="Advance to Closing"
        variant="primary"
        loading={advancingToClosing}
      />
      <CloseDealModal
        open={showCloseDeal}
        onClose={() => setShowCloseDeal(false)}
        onConfirm={handleCloseDeal}
        dealName={deal.name}
        assetClass={ASSET_CLASS_LABELS[deal.assetClass as keyof typeof ASSET_CLASS_LABELS] || deal.assetClass}
        entityName={deal.targetEntity?.name}
        loading={closingDeal}
        checklistTotal={deal.closingChecklist?.length ?? 0}
        checklistComplete={deal.closingChecklist?.filter((i: any) => i.status === "COMPLETE").length ?? 0}
      />
    </div>
  );
}
