"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CloseDealModal } from "@/components/features/deals/close-deal-modal";
import { EditDealForm } from "@/components/features/deals/edit-deal-form";
import { KillDealModal } from "@/components/features/deals/kill-deal-modal";
import { useToast } from "@/components/ui/toast";
import { useFirm } from "@/components/providers/firm-provider";
import Link from "next/link";

// Tab components
import { DealOverviewTab } from "@/components/features/deals/deal-overview-tab";
import { DealDocumentsTab } from "@/components/features/deals/deal-documents-tab";
import { DealNotesTab } from "@/components/features/deals/deal-notes-tab";
import { DealDDTab } from "@/components/features/deals/deal-dd-tab";
import { DealActivityTab } from "@/components/features/deals/deal-activity-tab";
import { DealICReviewTab } from "@/components/features/deals/deal-ic-review-tab";
import { DealClosingTab } from "@/components/features/deals/deal-closing-tab";

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: deal, isLoading } = useSWR(`/api/deals/${id}`, fetcher);
  const toast = useToast();
  const { firmId } = useFirm();
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
  const [revivingDeal, setRevivingDeal] = useState(false);

  // ── Analysis orchestration state (lives here so tab switches don't kill it) ──
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [ddStarting, setDDStarting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const autoStartedRef = useRef(false);

  // ── Auto-trigger for "Create & Screen" path ──
  // When ?autoscreen=1 is in the URL and workstreams exist but no analyses, auto-start.
  useEffect(() => {
    if (!deal) return;
    if (searchParams.get("autoscreen") !== "1") return;
    const ws = (deal.workstreams || []) as any[];
    const nonMemo = ws.filter((w: any) => w.analysisType !== "IC_MEMO");
    const hasAnyAnalysis = nonMemo.some((w: any) => !!w.analysisResult);
    const hasMemo = !!deal.screeningResult?.memo;
    const needsInitial = nonMemo.length > 0 && !hasAnyAnalysis && !hasMemo;

    if (needsInitial && !autoStartedRef.current && !analysisProgress && !regenerating) {
      autoStartedRef.current = true;
      // Remove the query param so refreshes don't re-trigger
      window.history.replaceState(null, "", `/deals/${id}`);
      runAnalysesAndMemo(nonMemo, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.workstreams?.length, searchParams]);

  // ── Core analysis runner (survives tab switches) ──
  const runAnalysesAndMemo = useCallback(async (workstreamsList: any[], isRerun: boolean) => {
    const analyzable = isRerun
      ? workstreamsList.filter((w: any) => w.analysisType !== "IC_MEMO")
      : workstreamsList.filter((w: any) => !w.analysisResult);

    const wsNames = analyzable.map((w: any) => w.name);
    const totalSteps = analyzable.length + 1; // +1 for IC memo
    const runningSet = new Set<string>();
    const doneSet = new Set<string>();
    setAnalysisProgress({ total: totalSteps, completed: 0, phase: "Analyzing workstreams", workstreamNames: wsNames, running: runningSet, done: doneSet });

    const mockFallbacks: string[] = [];

    try {
      // Phase 1: Run workstream analyses with sliding-window concurrency
      // As soon as one finishes, the next one starts — no waiting for a full batch.
      let completed = 0;
      const CONCURRENCY = 4;
      let nextIdx = 0;

      const runOne = async () => {
        while (nextIdx < analyzable.length) {
          const w = analyzable[nextIdx++];
          runningSet.add(w.name);
          setAnalysisProgress((p) =>
            p ? { ...p, running: new Set(runningSet), done: new Set(doneSet) } : null
          );
          const type = w.analysisType || NAME_TO_TYPE[w.name] || "DD_CUSTOM";
          try {
            const res = await fetch(`/api/deals/${id}/dd-analyze`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type, categoryName: w.name, rerun: isRerun }),
            });
            if (res.ok) {
              const data = await res.json().catch(() => null);
              if (data) {
                const ws = (data.workstreams || []).find((x: any) => x.name === w.name);
                const ar = ws?.analysisResult;
                if (ar && !ar.aiPowered) {
                  mockFallbacks.push(w.name);
                }
              }
            } else {
              const err = await res.json().catch(() => ({}));
              console.warn(`Analysis failed for ${w.name}:`, err.error);
              mockFallbacks.push(w.name);
            }
          } catch {
            mockFallbacks.push(w.name);
          }
          completed++;
          doneSet.add(w.name);
          runningSet.delete(w.name);
          setAnalysisProgress((p) =>
            p ? { ...p, completed, running: new Set(runningSet), done: new Set(doneSet) } : null
          );
        }
      };

      // Spin up N workers — each pulls the next item as soon as it's free
      await Promise.allSettled(
        Array.from({ length: Math.min(CONCURRENCY, analyzable.length) }, () => runOne())
      );

      // Show warning if any workstreams fell back to mock data
      if (mockFallbacks.length > 0) {
        toast.error(`${mockFallbacks.length} workstream${mockFallbacks.length > 1 ? "s" : ""} used sample data (AI timed out) — click Re-analyze to retry`);
      }

      // Phase 2: Generate IC Memo from workstream outputs
      // Skip if ALL workstreams failed — IC memo needs at least some real AI data
      if (mockFallbacks.length === analyzable.length) {
        toast.error("All workstreams timed out — IC memo not generated. Click Re-analyze to retry.");
      } else {
        setAnalysisProgress((p) =>
          p ? { ...p, current: "IC Memo", phase: "Generating IC Memo", running: new Set(["IC Memo"]), done: new Set(doneSet) } : null
        );
        // BUG-03 fix: 90-second timeout prevents the "Generating..." spinner from sticking
        // forever if the IC Memo API call hangs (no response, network drop, server stall).
        const memoTimeout = new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error("IC Memo generation timed out after 90 seconds")), 90_000)
        );
        try {
          const memoRes = await Promise.race([
            fetch(`/api/deals/${id}/dd-analyze`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "IC_MEMO", rerun: isRerun || !!deal?.screeningResult?.memo }),
            }),
            memoTimeout,
          ]);
          if (!memoRes.ok) {
            const memoErr = await memoRes.json().catch(() => ({}));
            console.warn("IC Memo generation failed:", memoErr.error);
          }
        } catch (memoErr: unknown) {
          const msg = memoErr instanceof Error ? memoErr.message : "IC Memo generation failed";
          toast.error(`${msg} — workstream analyses are still available`);
        }
      }
    } finally {
      // Always clear the spinner — this finally block ensures analysisProgress is
      // never left in a truthy state regardless of what happened above.
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
      // Use rerun=true if workstreams already have (mock) analysis results
      const hasExistingResults = nonMemo.some((w: any) => !!w.analysisResult);
      if (nonMemo.length > 0) {
        autoStartedRef.current = true; // prevent useEffect double-trigger
        await runAnalysesAndMemo(nonMemo, hasExistingResults);
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

  async function handleKillDeal(killReason: string, killReasonText: string) {
    setKillingDeal(true);
    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "KILL", killReason, killReasonText: killReasonText || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to kill deal";
        toast.error(msg);
        return;
      }
      toast.success("Deal marked as dead");
      mutate(`/api/deals/${id}`);
      mutate(`/api/deals?firmId=${firmId}`);
      setShowKillConfirm(false);
    } catch {
      toast.error("Failed to kill deal");
    } finally {
      setKillingDeal(false);
    }
  }

  async function handleReviveDeal() {
    setRevivingDeal(true);
    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REVIVE" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to revive deal";
        toast.error(msg);
        return;
      }
      toast.success("Deal revived");
      mutate(`/api/deals/${id}`);
      mutate(`/api/deals?firmId=${firmId}`);
    } catch {
      toast.error("Failed to revive deal");
    } finally {
      setRevivingDeal(false);
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

  async function handleCloseDeal(closeData: {
    costBasis: number;
    fairValue: number;
    entryDate: string;
    allocations: { entityId: string; allocationPercent: number }[];
  }) {
    setClosingDeal(true);
    try {
      const res = await fetch(`/api/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLOSE",
          force: true,
          costBasis: closeData.costBasis,
          fairValue: closeData.fairValue,
          entryDate: closeData.entryDate,
          allocations: closeData.allocations,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Failed to close deal");
        return;
      }
      toast.success("Deal closed -- redirecting to asset...");
      mutate(`/api/deals/${id}`);
      mutate("/api/deals");
      setShowCloseDeal(false);

      // Auto-redirect to the new asset page
      if (data.asset?.id) {
        router.push(`/assets/${data.asset.id}`);
      }
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
        return <DealClosingTab deal={deal} onCloseDeal={() => setShowCloseDeal(true)} />;
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-red-700 font-medium">
                This deal has been killed and is no longer active.
              </div>
              {deal.killReason && (
                <div className="text-xs text-red-600 mt-1">
                  <span className="font-semibold">Reason:</span> {deal.killReason}
                  {deal.killReasonText && (
                    <span> &mdash; {deal.killReasonText}</span>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReviveDeal}
              loading={revivingDeal}
            >
              Revive Deal
            </Button>
          </div>
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
      <KillDealModal
        open={showKillConfirm}
        onClose={() => setShowKillConfirm(false)}
        onConfirm={handleKillDeal}
        dealName={deal.name}
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
        dealId={deal.id}
        dealName={deal.name}
        assetClass={ASSET_CLASS_LABELS[deal.assetClass as keyof typeof ASSET_CLASS_LABELS] || deal.assetClass}
        firmId={firmId}
        initialEntityId={deal.entityId || undefined}
        loading={closingDeal}
        checklistTotal={deal.closingChecklist?.length ?? 0}
        checklistComplete={deal.closingChecklist?.filter((i: any) => i.status === "COMPLETE").length ?? 0}
      />
    </div>
  );
}
