"use client";

import { use, useState } from "react";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EditDealForm } from "@/components/features/deals/edit-deal-form";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";

// Tab components
import { DealOverviewTab } from "@/components/features/deals/deal-overview-tab";
import { DealDocumentsTab } from "@/components/features/deals/deal-documents-tab";
import { DealNotesTab } from "@/components/features/deals/deal-notes-tab";
import { DealScreeningTab } from "@/components/features/deals/deal-screening-tab";
import { DealDDTab } from "@/components/features/deals/deal-dd-tab";
import { DealActivityTab } from "@/components/features/deals/deal-activity-tab";
import { DealICReviewTab } from "@/components/features/deals/deal-ic-review-tab";
import { DealClosingTab } from "@/components/features/deals/deal-closing-tab";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/* ── Category labels & colors ────────────────────── */
const CC: Record<string, string> = {
  PRIVATE_EQUITY: "indigo",
  PRIVATE_CREDIT: "orange",
  REAL_ESTATE: "green",
  REAL_ASSETS: "yellow",
  SECONDARIES: "purple",
  FUND_INVESTMENTS: "blue",
};
const CL: Record<string, string> = {
  PRIVATE_EQUITY: "Private Equity",
  PRIVATE_CREDIT: "Private Credit",
  REAL_ESTATE: "Real Estate",
  REAL_ASSETS: "Real Assets",
  SECONDARIES: "Secondaries",
  FUND_INVESTMENTS: "Fund Investments",
};

const stageOrder = ["SCREENING", "DUE_DILIGENCE", "IC_REVIEW", "CLOSING"];
const stageLabel: Record<string, string> = {
  SCREENING: "Screening",
  DUE_DILIGENCE: "Due Diligence",
  IC_REVIEW: "IC Review",
  CLOSING: "Closing",
  DEAD: "Dead",
};

/* ── Stage-dependent tab visibility ──────────────── */
const stageTabs: Record<string, string[]> = {
  SCREENING: ["Overview", "Documents", "Notes"],
  DUE_DILIGENCE: [
    "Overview",
    "Documents",
    "Notes",
    "AI Screening",
    "Due Diligence",
    "Activity",
  ],
  IC_REVIEW: [
    "Overview",
    "Documents",
    "Notes",
    "AI Screening",
    "Due Diligence",
    "Activity",
    "IC Review",
  ],
  CLOSING: [
    "Overview",
    "Documents",
    "Notes",
    "AI Screening",
    "Due Diligence",
    "Activity",
    "IC Review",
    "Closing",
  ],
};

/* eslint-disable @typescript-eslint/no-explicit-any */

function getDeadTabs(deal: any): string[] {
  const tabs = ["Overview", "Documents", "Notes"];
  if (deal.screeningResult) {
    tabs.push("AI Screening");
    tabs.push("Due Diligence");
    tabs.push("Activity");
  }
  if (deal.icProcess) {
    tabs.push("IC Review");
  }
  return tabs;
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
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [killingDeal, setKillingDeal] = useState(false);
  const [sendingToIC, setSendingToIC] = useState(false);

  if (isLoading || !deal)
    return <div className="text-sm text-gray-400">Loading...</div>;

  const currentIdx = stageOrder.indexOf(deal.stage);
  const isDead = deal.stage === "DEAD";
  const visibleTabs = isDead
    ? getDeadTabs(deal)
    : stageTabs[deal.stage] || stageTabs.SCREENING;

  // If the current tab isn't visible, reset to Overview
  const activeTab = visibleTabs.includes(tab) ? tab : "Overview";

  /* ── Header Actions ────────────────────────────── */

  async function runScreening() {
    setScreeningLoading(true);
    try {
      await fetch(`/api/deals/${id}/screen`, { method: "POST" });
      toast.success("AI screening complete — deal advanced to Due Diligence");
      mutate(`/api/deals/${id}`);
    } catch {
      toast.error("Screening failed");
    } finally {
      setScreeningLoading(false);
    }
  }

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

  /* ── Render active tab component ───────────────── */

  function renderTab() {
    switch (activeTab) {
      case "Overview":
        return <DealOverviewTab deal={deal} />;
      case "Documents":
        return <DealDocumentsTab deal={deal} />;
      case "Notes":
        return <DealNotesTab deal={deal} />;
      case "AI Screening":
        return <DealScreeningTab deal={deal} />;
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
            <Badge color={CC[deal.dealCategory]}>
              {CL[deal.dealCategory]}
            </Badge>
            <Badge
              color={
                isDead
                  ? "red"
                  : deal.stage === "CLOSING"
                  ? "green"
                  : "yellow"
              }
            >
              {stageLabel[deal.stage] || deal.stage}
            </Badge>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {deal.sector} · Target: {deal.targetSize} · Lead:{" "}
            {deal.leadPartner}
            {deal.counterparty && ` · Counterparty: ${deal.counterparty}`}
          </div>
        </div>
        <div className="flex gap-2">
          {deal.stage === "SCREENING" && !deal.screeningResult && (
            <Button loading={screeningLoading} onClick={runScreening}>
              Run AI Screening
            </Button>
          )}
          {deal.stage === "DUE_DILIGENCE" && (
            <Button onClick={() => setShowSendToIC(true)}>
              Send to IC Review
            </Button>
          )}
          {!isDead && (
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

      {isDead && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 font-medium">
          This deal has been killed and is no longer active.
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
          leadPartner: deal.leadPartner,
          source: deal.source,
          counterparty: deal.counterparty,
          description: deal.description,
          thesisNotes: deal.thesisNotes,
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
    </div>
  );
}
