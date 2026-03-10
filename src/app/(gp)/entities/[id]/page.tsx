"use client";

import { Fragment, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt, formatDate } from "@/lib/utils";
import { InlineTaskAdd } from "@/components/features/tasks/inline-task-add";
import { CreateCapitalCallForm } from "@/components/features/capital/create-capital-call-form";
import { CreateDistributionForm } from "@/components/features/capital/create-distribution-form";
import { CreateMeetingForm } from "@/components/features/meetings/create-meeting-form";
import { CreateTemplateForm } from "@/components/features/waterfall/create-template-form";
import { AddTierForm } from "@/components/features/waterfall/add-tier-form";
import { EditTierForm } from "@/components/features/waterfall/edit-tier-form";
import { CreateSideLetterForm } from "@/components/features/side-letters/create-side-letter-form";
import { SideLetterRulesPanel } from "@/components/features/side-letters/side-letter-rules-panel";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EntityAccountingTab } from "@/components/features/accounting/entity-accounting-tab";
import { StatusTransitionDialog } from "@/components/features/entities/status-transition-dialog";
import { PostFormationChecklist } from "@/components/features/entities/post-formation-checklist";
import { RegulatoryFilingsTab } from "@/components/features/entities/regulatory-filings-tab";
import { EntityFinancialSummaryCard } from "@/components/features/entities/entity-financial-summary-card";
import { EntityPeriodBreakdown } from "@/components/features/entities/entity-period-breakdown";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json(); });

function EntityTasksSection({ entityId, entityName }: { entityId: string; entityName: string }) {
  const tasksKey = `/api/tasks?entityId=${entityId}`;
  const { data, isLoading } = useSWR(tasksKey, fetcher);
  const tasks: any[] = data?.data ?? [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">Tasks</h3>
        {tasks.length > 0 && (
          <span className="text-xs text-gray-400">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
        )}
      </div>
      {isLoading ? (
        <div className="text-xs text-gray-400 text-center py-4">Loading tasks...</div>
      ) : tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] flex-shrink-0 ${t.status === "DONE" ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300"}`}>
                  {t.status === "DONE" ? "\u2713" : ""}
                </span>
                <div>
                  <div className={`text-sm ${t.status === "DONE" ? "text-gray-400 line-through" : ""}`}>{t.title}</div>
                  <div className="text-[10px] text-gray-500">
                    Due: {t.dueDate ? formatDate(t.dueDate) : "---"} · {t.assignee?.name || t.assigneeName || "Unassigned"}
                  </div>
                </div>
              </div>
              <Badge color={t.status === "DONE" ? "green" : t.status === "IN_PROGRESS" ? "yellow" : "gray"}>
                {t.status.toLowerCase().replace("_", " ")}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-400 text-center py-6">No tasks yet</div>
      )}
      <InlineTaskAdd
        contextType="entity"
        contextId={entityId}
        entityId={entityId}
        contextLabel={entityName}
        onTaskCreated={() => mutate(tasksKey)}
      />
    </div>
  );
}

const baseTabs = [
  { key: "overview", label: "Overview" },
  { key: "nav", label: "NAV" },
  { key: "capital", label: "Capital" },
  { key: "investors", label: "Investors" },
  { key: "waterfall", label: "Waterfall" },
  { key: "meetings", label: "Meetings" },
  { key: "documents", label: "Documents" },
  { key: "fundraising", label: "Fundraising" },
  { key: "regulatory", label: "Regulatory" },
  { key: "accounting", label: "Accounting" },
  { key: "tasks", label: "Tasks" },
];

interface Tier { id: string; tierOrder: number; name: string; description?: string; splitLP?: number; splitGP?: number; hurdleRate?: number; appliesTo?: string }

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: entity, isLoading } = useSWR(id ? `/api/entities/${id}` : null, fetcher);
  const { data: navData, mutate: mutateNav } = useSWR(id ? `/api/nav/${id}` : null, fetcher);
  const { data: metricsData } = useSWR(id ? `/api/entities/${id}/metrics` : null, fetcher);
  const { data: navHistory } = useSWR(id ? `/api/nav/${id}/history` : null, fetcher);
  const { data: plaidData } = useSWR(id ? `/api/integrations/plaid/accounts?entityId=${id}` : null, fetcher);
  const { data: attributionData } = useSWR(id ? `/api/entities/${id}/attribution` : null, fetcher);
  const [tab, setTab] = useState("overview");
  const [showCapCall, setShowCapCall] = useState(false);
  const [showDist, setShowDist] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [showAddTier, setShowAddTier] = useState(false);
  const [editTier, setEditTier] = useState<Tier | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [expandedDist, setExpandedDist] = useState<string | null>(null);
  const [markingFormed, setMarkingFormed] = useState(false);
  const [calculatingFees, setCalculatingFees] = useState(false);
  const [feeResult, setFeeResult] = useState<{
    managementFee: number;
    carriedInterest: number;
    entityName: string;
    periodDate: string;
    templateName: string | null;
  } | null>(null);
  // NAV proxy edit state
  const [proxyEdit, setProxyEdit] = useState<{ cashPercent: string; otherAssetsPercent: string; liabilitiesPercent: string } | null>(null);
  const [savingProxy, setSavingProxy] = useState(false);
  // Distribution confirm dialog state
  const [distributionToConfirm, setDistributionToConfirm] = useState<string | null>(null);
  // Status transition dialog state
  const [statusTransitionTarget, setStatusTransitionTarget] = useState<string | null>(null);
  // Side letter state
  const [showCreateSideLetter, setShowCreateSideLetter] = useState(false);
  const [selectedSideLetterId, setSelectedSideLetterId] = useState<string | null>(null);
  const toast = useToast();

  if (isLoading || !entity) return <div className="text-sm text-gray-400">Loading...</div>;

  const e = entity;

  const methodLabel: Record<string, string> = { COMPARABLE_MULTIPLES: "Multiples", LAST_ROUND: "Last round", DCF: "DCF", APPRAISAL: "Appraisal", GP_REPORTED_NAV: "GP NAV", COST: "Cost" };
  const tierColors = ["bg-emerald-50 border-emerald-200", "bg-blue-50 border-blue-200", "bg-amber-50 border-amber-200", "bg-orange-50 border-orange-200", "bg-purple-50 border-purple-200"];

  // Formation tab logic
  const showFormation = e.formationStatus === "FORMING" || e.formationStatus === "NOT_STARTED";
  const tabs = showFormation
    ? [{ key: "formation", label: "Formation" }, ...baseTabs]
    : baseTabs;

  const formationTasks: any[] = e.tasks || [];
  const formationCompleted = formationTasks.filter((t: any) => t.status === "DONE").length;
  const formationTotal = formationTasks.length;
  const completedPct = formationTotal > 0 ? Math.round((formationCompleted / formationTotal) * 100) : 0;
  const allFormationDone = formationTotal > 0 && formationCompleted === formationTotal;

  async function updateFormationTask(taskId: string, updates: Record<string, unknown>) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, ...updates }),
    });
    mutate(`/api/entities/${id}`);
  }

  async function handleMarkFormed() {
    setMarkingFormed(true);
    try {
      const res = await fetch(`/api/entities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_FORMED" }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Cannot mark as formed");
        return;
      }
      toast.success("Entity marked as formed");
      mutate(`/api/entities/${id}`);
    } catch {
      toast.error("Failed to mark as formed");
    } finally {
      setMarkingFormed(false);
    }
  }

  async function handleSaveProxies() {
    if (!proxyEdit) return;
    setSavingProxy(true);
    try {
      const res = await fetch(`/api/entities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          navProxyConfig: {
            cashPercent: parseFloat(proxyEdit.cashPercent) / 100,
            otherAssetsPercent: parseFloat(proxyEdit.otherAssetsPercent) / 100,
            liabilitiesPercent: parseFloat(proxyEdit.liabilitiesPercent) / 100,
          },
        }),
      });
      if (!res.ok) {
        toast.error("Failed to save proxy config");
        return;
      }
      toast.success("NAV proxy config updated");
      setProxyEdit(null);
      mutate(`/api/entities/${id}`);
      mutateNav();
    } catch {
      toast.error("Failed to save proxy config");
    } finally {
      setSavingProxy(false);
    }
  }

  async function handleCallStatusTransition(callId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/capital-calls/${callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : "Failed to update status");
        return;
      }
      toast.success("Status updated");
      mutate(`/api/entities/${id}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleFundLineItem(callId: string, lineItemId: string) {
    try {
      const res = await fetch(`/api/capital-calls/${callId}/line-items/${lineItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Funded", paidDate: new Date().toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : "Failed to fund");
        return;
      }
      toast.success("Line item funded");
      mutate(`/api/entities/${id}`);
    } catch {
      toast.error("Failed to fund line item");
    }
  }

  async function handleDistStatusTransition(distId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/distributions/${distId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(typeof data.error === "string" ? data.error : "Failed to update status");
        return;
      }
      toast.success("Distribution status updated");
      mutate(`/api/entities/${id}`);
    } catch {
      toast.error("Failed to update distribution status");
    }
  }

  async function handleCalculateFees() {
    setCalculatingFees(true);
    setFeeResult(null);
    try {
      const res = await fetch("/api/fees/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: id,
          periodDate: new Date().toISOString().split("T")[0],
          fundExpenses: 0,
          periodFraction: 0.25,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = typeof data.error === "string" ? data.error : "Fee calculation failed";
        toast.error(msg);
        return;
      }
      const data = await res.json();
      setFeeResult({
        managementFee: data.managementFee,
        carriedInterest: data.carriedInterest,
        entityName: data.entityName,
        periodDate: data.periodDate,
        templateName: data.templateName ?? null,
      });
      toast.success("Fee calculation complete");
    } catch {
      toast.error("Fee calculation failed");
    } finally {
      setCalculatingFees(false);
    }
  }

  // Derive metrics display values
  const metrics = metricsData?.metrics;
  const inputs = metricsData?.inputs;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/entities" className="text-xs text-indigo-600 hover:underline mb-1 inline-block">&larr; All Vehicles</Link>
          <h2 className="text-lg font-bold">{e.name}</h2>
          <div className="flex gap-2 mt-1">
            <Badge color={e.entityType === "MAIN_FUND" ? "indigo" : e.entityType === "SIDECAR" ? "purple" : "blue"}>{e.entityType?.replace(/_/g, " ")}</Badge>
            <Badge color={e.status === "ACTIVE" ? "green" : e.status === "WINDING_DOWN" ? "amber" : "gray"}>{e.status}</Badge>
            {e.vehicleStructure && <Badge color="gray">{e.vehicleStructure}</Badge>}
            {e.vintageYear && <Badge color="gray">{e.vintageYear}</Badge>}
            {e.formationStatus === "FORMING" && <Badge color="yellow">Forming</Badge>}
            {e.formationStatus === "FORMED" && <Badge color="green">Formed</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status transition buttons */}
          {e.status === "ACTIVE" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStatusTransitionTarget("WINDING_DOWN")}
              className="text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100"
            >
              Wind Down
            </Button>
          )}
          {e.status === "WINDING_DOWN" && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStatusTransitionTarget("ACTIVE")}
                className="text-green-700 border-green-300 bg-green-50 hover:bg-green-100"
              >
                Reactivate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStatusTransitionTarget("DISSOLVED")}
                className="text-red-700 border-red-300 bg-red-50 hover:bg-red-100"
              >
                Dissolve
              </Button>
            </>
          )}
          <Link
            href={`/reports?entityId=${e.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <span>&#9660;</span>
            Generate Report
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border border-b-0 ${tab === t.key ? "bg-white text-indigo-700 border-gray-200" : "bg-gray-50 text-gray-500 border-transparent hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Formation Tab */}
      {tab === "formation" && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${completedPct}%` }} />
            </div>
            <span className="text-xs text-gray-500">{formationCompleted} / {formationTotal} complete</span>
          </div>

          {/* Formation status banner */}
          {e.formationStatus === "FORMING" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              Entity is currently in formation. Complete all tasks below to finalize.
            </div>
          )}

          {/* Task list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-50">
            {formationTasks.map((task: any) => (
              <div key={task.id}>
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                >
                  {/* Status dot */}
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    task.status === "DONE" ? "bg-emerald-400" :
                    task.status === "IN_PROGRESS" ? "bg-amber-400" :
                    "bg-gray-300"
                  }`} />
                  {/* Order */}
                  <span className="text-[10px] text-gray-400 font-mono w-4">{task.order}</span>
                  {/* Title */}
                  <span className={`flex-1 text-sm ${task.status === "DONE" ? "line-through text-gray-400" : "text-gray-900"}`}>
                    {task.title}
                  </span>
                  {/* Assignee */}
                  {task.assignee && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      {task.assignee.initials || task.assignee.name?.split(" ").map((n: string) => n[0]).join("")}
                    </span>
                  )}
                  {/* Due date */}
                  {task.dueDate && (
                    <span className="text-[10px] text-gray-400">
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                  {/* Status badge */}
                  <Badge color={
                    task.status === "DONE" ? "green" :
                    task.status === "IN_PROGRESS" ? "yellow" :
                    "gray"
                  }>
                    {task.status === "DONE" ? "Done" : task.status === "IN_PROGRESS" ? "In Progress" : "To Do"}
                  </Badge>
                  {/* Expand chevron */}
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedTask === task.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded details */}
                {expandedTask === task.id && (
                  <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-3">
                      {/* Status select */}
                      <div>
                        <label className="text-[10px] text-gray-500 mb-1 block">Status</label>
                        <select
                          value={task.status}
                          onChange={(ev) => updateFormationTask(task.id, { status: ev.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="DONE">Done</option>
                        </select>
                      </div>
                      {/* Assignee select */}
                      <div>
                        <label className="text-[10px] text-gray-500 mb-1 block">Assignee</label>
                        <TeamUserSelect
                          value={task.assigneeId || ""}
                          onChange={(val) => updateFormationTask(task.id, { assigneeId: val || null })}
                        />
                      </div>
                      {/* Due date */}
                      <div>
                        <label className="text-[10px] text-gray-500 mb-1 block">Due Date</label>
                        <input
                          type="date"
                          value={task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""}
                          onChange={(ev) => updateFormationTask(task.id, { dueDate: ev.target.value || null })}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    {/* Notes */}
                    <div className="mt-2">
                      <label className="text-[10px] text-gray-500 mb-1 block">Notes</label>
                      <textarea
                        defaultValue={task.notes || ""}
                        onBlur={(ev) => updateFormationTask(task.id, { notes: ev.target.value })}
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder="Add notes..."
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {formationTasks.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">No formation tasks.</div>
            )}
          </div>

          {/* Mark as Formed button */}
          {allFormationDone && e.formationStatus === "FORMING" && (
            <div className="flex justify-end">
              <Button
                onClick={handleMarkFormed}
                disabled={markingFormed}
              >
                {markingFormed ? "Marking..." : "Mark as Formed"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Post-formation checklist — shown for FORMED/REGISTERED entities */}
          {(e.formationStatus === "FORMED" || e.formationStatus === "REGISTERED") && (
            <PostFormationChecklist entity={e} onTabChange={setTab} />
          )}
          {/* Primary metric cards (6) */}
          <div className="grid grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: "Total Commitments", value: fmt(e.totalCommitments || 0) },
              { label: "Called Capital", value: inputs ? fmt(inputs.totalCalled) : "\u2014" },
              { label: "Economic NAV", value: navData ? fmt(navData.economicNAV) : (inputs ? fmt(inputs.currentNAV) : "\u2014") },
              { label: "TVPI", value: metrics?.tvpi != null ? `${metrics.tvpi.toFixed(2)}x` : "N/A" },
              { label: "DPI", value: metrics?.dpi != null ? `${metrics.dpi.toFixed(2)}x` : "N/A" },
              { label: "IRR", value: metrics?.irr != null ? `${(metrics.irr * 100).toFixed(1)}%` : "N/A" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">{s.label}</div>
                <div className="text-lg font-bold mt-1">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Secondary metric cards (4) */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "RVPI", value: metrics?.rvpi != null ? `${metrics.rvpi.toFixed(2)}x` : "N/A" },
              { label: "MOIC", value: metrics?.moic != null ? `${metrics.moic.toFixed(2)}x` : "N/A" },
              { label: "Fund Term", value: e.fundTermYears ? `${e.fundTermYears} years` : "\u2014" },
              { label: "Unfunded", value: inputs ? fmt(Math.max(0, (e.totalCommitments || 0) - inputs.totalCalled)) : "\u2014" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">{s.label}</div>
                <div className="text-lg font-bold mt-1">{s.value}</div>
              </div>
            ))}
          </div>

          {!metricsData && (
            <div className="text-xs text-gray-400">Computing metrics...</div>
          )}

          {/* Financial Summary Card — dual metric view + all 9 key metrics */}
          {metricsData && (
            <>
              <EntityFinancialSummaryCard metricsData={metricsData} />
              {metricsData.periodBreakdown?.length > 0 && (
                <EntityPeriodBreakdown periodBreakdown={metricsData.periodBreakdown} />
              )}
            </>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold">Asset Allocations</h3></div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>{["Asset", "Type", "Allocation %", "Cost Basis", "Fair Value"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {(e.assetAllocations || []).map((a: { id: string; allocationPercent: number; costBasis: number; asset: { id: string; name: string; assetClass: string; fairValue: number } }) => (
                  <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2.5"><Link href={`/assets/${a.asset.id}`} className="text-indigo-700 hover:underline font-medium">{a.asset.name}</Link></td>
                    <td className="px-3 py-2.5"><Badge color="blue">{a.asset.assetClass?.replace(/_/g, " ")}</Badge></td>
                    <td className="px-3 py-2.5">{a.allocationPercent.toFixed(1)}%</td>
                    <td className="px-3 py-2.5">{fmt(a.costBasis || 0)}</td>
                    <td className="px-3 py-2.5 font-medium">{fmt(a.asset.fairValue || 0)}</td>
                  </tr>
                ))}
                {(!e.assetAllocations || e.assetAllocations.length === 0) && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No asset allocations.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Plaid Bank Accounts card — only shown when a Plaid connection exists for this entity */}
          {plaidData?.connected === true && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Bank Accounts (Plaid)</h3>
                <Badge color="green">Connected</Badge>
              </div>
              <div className="divide-y divide-gray-50">
                {plaidData.accounts && plaidData.accounts.length > 0 ? (
                  plaidData.accounts.map((acct: { accountId: string; name: string; officialName: string | null; type: string; subtype: string | null; currentBalance: number | null; availableBalance: number | null }) => (
                    <div key={acct.accountId} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-gray-900">{acct.name}</div>
                        {acct.officialName && acct.officialName !== acct.name && (
                          <div className="text-[10px] text-gray-400">{acct.officialName}</div>
                        )}
                        <div className="text-[10px] text-gray-500 mt-0.5 capitalize">{acct.type}{acct.subtype ? ` · ${acct.subtype}` : ""}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-gray-900">{acct.currentBalance != null ? fmt(acct.currentBalance) : "—"}</div>
                        {acct.availableBalance != null && acct.availableBalance !== acct.currentBalance && (
                          <div className="text-[10px] text-gray-400">{fmt(acct.availableBalance)} available</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">No accounts found</div>
                )}
              </div>
            </div>
          )}

          {/* Fee Calculation */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">Fee Calculation</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Management fee and carried interest for current quarter
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleCalculateFees}
                disabled={calculatingFees}
              >
                {calculatingFees ? "Calculating..." : "Calculate Fees"}
              </Button>
            </div>
            {feeResult && (
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Management Fee</div>
                  <div className="text-sm font-bold mt-1">{fmt(feeResult.managementFee)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Carried Interest</div>
                  <div className="text-sm font-bold mt-1">{fmt(feeResult.carriedInterest)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Period</div>
                  <div className="text-sm font-bold mt-1">{feeResult.periodDate}</div>
                </div>
              </div>
            )}
          </div>

          {/* Performance Attribution */}
          {attributionData && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Performance Attribution</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Asset contributions to fund returns — ranked by weighted IRR contribution
                  </p>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  {attributionData.entityMetrics?.totalIRR != null && (
                    <span>Fund IRR: <span className="font-semibold text-gray-900">{(attributionData.entityMetrics.totalIRR * 100).toFixed(1)}%</span></span>
                  )}
                  {attributionData.entityMetrics?.totalTVPI != null && (
                    <span>TVPI: <span className="font-semibold text-gray-900">{attributionData.entityMetrics.totalTVPI.toFixed(2)}x</span></span>
                  )}
                </div>
              </div>
              {attributionData.rankedByContribution && attributionData.rankedByContribution.length > 0 ? (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Rank", "Asset", "IRR", "MOIC", "Contribution %", "vs Projected"].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attributionData.rankedByContribution.map((item: any, idx: number) => (
                      <tr key={item.assetId} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-2.5 text-gray-400 font-mono">#{idx + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900">{item.assetName}</td>
                        <td className="px-3 py-2.5">
                          {item.irr != null ? `${(item.irr * 100).toFixed(1)}%` : "N/A"}
                        </td>
                        <td className="px-3 py-2.5">
                          {item.moic != null ? `${item.moic.toFixed(2)}x` : "N/A"}
                        </td>
                        <td className="px-3 py-2.5">
                          {item.contributionPct != null ? `${item.contributionPct.toFixed(1)}%` : "N/A"}
                        </td>
                        <td className="px-3 py-2.5">
                          {item.variance?.irrDelta != null ? (
                            <span className={item.variance.irrDelta >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                              {item.variance.irrDelta >= 0 ? "+" : ""}{(item.variance.irrDelta * 100).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  No asset allocations to compute attribution for.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* NAV Tab */}
      {tab === "nav" && (
        <div className="space-y-4">
          {/* NAV Proxy Configuration */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">NAV Proxy Configuration</h3>
              {!proxyEdit && (
                <Button size="sm" onClick={() => setProxyEdit({
                  cashPercent: String(((navData?.navProxyConfig?.cashPercent ?? 0.05) * 100).toFixed(1)),
                  otherAssetsPercent: String(((navData?.navProxyConfig?.otherAssetsPercent ?? 0.005) * 100).toFixed(1)),
                  liabilitiesPercent: String(((navData?.navProxyConfig?.liabilitiesPercent ?? 0.02) * 100).toFixed(1)),
                })}>Edit Proxies</Button>
              )}
            </div>
            {proxyEdit ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "cashPercent", label: "Cash & Equivalents %" },
                    { key: "otherAssetsPercent", label: "Other Assets %" },
                    { key: "liabilitiesPercent", label: "Liabilities %" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-[10px] text-gray-500 mb-1 block">{label}</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={proxyEdit[key as keyof typeof proxyEdit]}
                        onChange={(ev) => setProxyEdit({ ...proxyEdit, [key]: ev.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveProxies} disabled={savingProxy}>
                    {savingProxy ? "Saving..." : "Save Proxies"}
                  </Button>
                  <Button size="sm" onClick={() => setProxyEdit(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-[10px] text-gray-500">Cash %</div>
                  <div className="font-medium">{((navData?.navProxyConfig?.cashPercent ?? 0.05) * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Other Assets %</div>
                  <div className="font-medium">{((navData?.navProxyConfig?.otherAssetsPercent ?? 0.005) * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Liabilities %</div>
                  <div className="font-medium">{((navData?.navProxyConfig?.liabilitiesPercent ?? 0.02) * 100).toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>

          {/* Main NAV computation */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Two-Layer NAV &mdash; {e.name}</h3>
              {e.accountingConnection && (
                <div className="flex gap-2">
                  <Badge color={e.accountingConnection.syncStatus === "CONNECTED" ? "green" : "gray"}>{e.accountingConnection.provider} {e.accountingConnection.syncStatus === "CONNECTED" ? "Synced" : e.accountingConnection.syncStatus}</Badge>
                </div>
              )}
            </div>
            {navData ? (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Layer 1: Cost Basis (from QBO)</div>
                  <div className="space-y-1 text-sm font-mono">
                    {[
                      { l: "Cash & equivalents", v: fmt(navData.layer1.cashEquivalents) },
                      { l: "Investments at cost", v: fmt(navData.layer1.investmentsAtCost) },
                      { l: "Other assets", v: fmt(navData.layer1.otherAssets) },
                      { l: "Total Assets", v: fmt(navData.layer1.totalAssets), b: true },
                      { l: "Less: Liabilities", v: `(${fmt(navData.layer1.liabilities)})`, d: true },
                      { l: "Cost Basis NAV", v: fmt(navData.layer1.costBasisNAV), b: true, h: "bg-gray-100" },
                    ].map((r, i) => (
                      <div key={i} className={`flex justify-between py-0.5 px-2 rounded ${r.b ? "font-semibold border-t border-gray-200 pt-1.5 mt-1" : ""} ${r.h || ""} ${r.d ? "text-gray-400" : ""}`}>
                        <span>{r.l}</span><span>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Layer 2: Fair Value Overlay (Atlas)</div>
                  <div className="space-y-1 text-sm font-mono">
                    {(navData.layer2.assets || []).map((a: { assetName: string; unrealizedGain: number; valuationMethod: string | null }, i: number) => (
                      <div key={i} className="flex justify-between py-0.5 px-2 rounded text-emerald-700">
                        <span>{a.assetName}{a.valuationMethod && <span className="text-gray-400 text-xs ml-1 font-normal">({methodLabel[a.valuationMethod] ?? a.valuationMethod})</span>}</span>
                        <span>{a.unrealizedGain >= 0 ? "+" : ""}{fmt(a.unrealizedGain)}</span>
                      </div>
                    ))}
                    {[
                      { l: "Total Unrealized", v: `${navData.layer2.totalUnrealized >= 0 ? "+" : ""}${fmt(navData.layer2.totalUnrealized)}`, b: true, g: true },
                      { l: "", v: "" },
                      { l: "Cost Basis NAV", v: fmt(navData.costBasisNAV) },
                      { l: "+ Unrealized", v: `${navData.layer2.totalUnrealized >= 0 ? "+" : ""}${fmt(navData.layer2.totalUnrealized)}`, g: true },
                      { l: "- Accrued Carry", v: `(${fmt(navData.layer2.accruedCarry)})`, d: true },
                      { l: "Economic NAV", v: fmt(navData.economicNAV), b: true, h: "bg-indigo-50 text-indigo-900" },
                    ].map((r, i) => (
                      <div key={`s-${i}`} className={`flex justify-between py-0.5 px-2 rounded ${r.b ? "font-semibold border-t border-gray-200 pt-1.5 mt-1" : ""} ${r.h || ""} ${r.d ? "text-gray-400" : ""} ${r.g ? "text-emerald-700" : ""}`}>
                        <span>{r.l}</span><span>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400 py-4">NAV data not available.</div>
            )}
          </div>

          {/* NAV History */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold">NAV History</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Snapshots stored each time NAV is computed</p>
            </div>
            {navHistory && navHistory.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>{["Date", "Cost Basis NAV", "Economic NAV", "Unrealized Gain", "Accrued Carry"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {navHistory.map((snap: { id: string; periodDate: string; costBasisNAV: number; economicNAV: number; unrealizedGain?: number; accruedCarry?: number }) => (
                    <tr key={snap.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2.5">{formatDate(snap.periodDate)}</td>
                      <td className="px-3 py-2.5 font-medium">{fmt(snap.costBasisNAV)}</td>
                      <td className="px-3 py-2.5 font-bold text-indigo-700">{fmt(snap.economicNAV)}</td>
                      <td className="px-3 py-2.5 text-emerald-600">{snap.unrealizedGain != null ? `+${fmt(snap.unrealizedGain)}` : "\u2014"}</td>
                      <td className="px-3 py-2.5 text-red-500">{snap.accruedCarry != null ? fmt(snap.accruedCarry) : "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-400">No NAV history yet. Visit the NAV tab to generate a snapshot.</div>
            )}
          </div>
        </div>
      )}

      {/* Capital Tab */}
      {tab === "capital" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Capital Calls ({(e.capitalCalls || []).length})</h3>
              <Button size="sm" onClick={() => setShowCapCall(true)}>+ New Call</Button>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>{["Call #", "Call Date", "Due Date", "Amount", "Purpose", "Status", "Funded %", "Actions"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {(e.capitalCalls || []).map((c: { id: string; callNumber: string; callDate: string; dueDate: string; amount: number; purpose?: string; status: string; fundedPercent: number; lineItems?: any[] }) => (
                  <>
                    <tr key={c.id} className="border-t border-gray-50 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedCall(expandedCall === c.id ? null : c.id)}>
                      <td className="px-3 py-2.5 font-medium text-indigo-700">{c.callNumber}</td>
                      <td className="px-3 py-2.5">{formatDate(c.callDate)}</td>
                      <td className="px-3 py-2.5">{formatDate(c.dueDate)}</td>
                      <td className="px-3 py-2.5 font-medium">{fmt(c.amount)}</td>
                      <td className="px-3 py-2.5">{c.purpose || "\u2014"}</td>
                      <td className="px-3 py-2.5"><Badge color={c.status === "FUNDED" ? "green" : c.status === "ISSUED" ? "amber" : c.status === "OVERDUE" ? "red" : "gray"}>{c.status}</Badge></td>
                      <td className="px-3 py-2.5">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5"><div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(c.fundedPercent, 100)}%` }} /></div>
                      </td>
                      <td className="px-3 py-2.5" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex gap-1">
                          {c.status === "DRAFT" && (
                            <button onClick={() => handleCallStatusTransition(c.id, "ISSUED")} className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded hover:bg-amber-200">Issue</button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedCall === c.id && (
                      <tr key={`${c.id}-exp`}>
                        <td colSpan={8} className="bg-gray-50 border-t border-gray-100 px-4 py-3">
                          <div className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Line Items</div>
                          {(c.lineItems || []).length === 0 ? (
                            <div className="text-xs text-gray-400">No line items.</div>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr>{["Investor", "Amount", "Status", "Paid Date", "Actions"].map((h) => <th key={h} className="text-left py-1 pr-3 text-gray-500 font-medium">{h}</th>)}</tr>
                              </thead>
                              <tbody>
                                {(c.lineItems || []).map((li: any) => (
                                  <tr key={li.id} className="border-t border-gray-100">
                                    <td className="py-1.5 pr-3">{li.investor?.name || li.investorId}</td>
                                    <td className="py-1.5 pr-3 font-medium">{fmt(li.amount)}</td>
                                    <td className="py-1.5 pr-3"><Badge color={li.status === "Funded" ? "green" : "gray"}>{li.status}</Badge></td>
                                    <td className="py-1.5 pr-3">{formatDate(li.paidDate)}</td>
                                    <td className="py-1.5">
                                      {li.status !== "Funded" && (
                                        <button onClick={() => handleFundLineItem(c.id, li.id)} className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 rounded hover:bg-green-200">Fund</button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {(!e.capitalCalls || e.capitalCalls.length === 0) && <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400">No capital calls.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Distributions ({(e.distributions || []).length})</h3>
              <Button size="sm" onClick={() => setShowDist(true)}>+ New Distribution</Button>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>{["Date", "Type", "Gross", "ROC", "Income", "LT Gain", "Carry", "Net to LPs", "Status", "Actions"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {(e.distributions || []).map((d: { id: string; distributionDate: string; source?: string; distributionType?: string; grossAmount: number; returnOfCapital: number; income: number; longTermGain: number; carriedInterest: number; netToLPs: number; status: string; lineItems?: any[] }) => (
                  <Fragment key={d.id}>
                    <tr className="border-t border-gray-50 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedDist(expandedDist === d.id ? null : d.id)}>
                      <td className="px-3 py-2.5">{formatDate(d.distributionDate)}</td>
                      <td className="px-3 py-2.5"><Badge color="blue">{d.distributionType || d.source || "\u2014"}</Badge></td>
                      <td className="px-3 py-2.5 font-medium">{fmt(d.grossAmount)}</td>
                      <td className="px-3 py-2.5 text-blue-600">{fmt(d.returnOfCapital)}</td>
                      <td className="px-3 py-2.5 text-emerald-600">{fmt(d.income)}</td>
                      <td className="px-3 py-2.5 text-purple-600">{fmt(d.longTermGain)}</td>
                      <td className="px-3 py-2.5 text-red-600">{fmt(d.carriedInterest)}</td>
                      <td className="px-3 py-2.5 font-bold">{fmt(d.netToLPs)}</td>
                      <td className="px-3 py-2.5"><Badge color={d.status === "PAID" ? "green" : d.status === "APPROVED" ? "amber" : "gray"}>{d.status}</Badge></td>
                      <td className="px-3 py-2.5" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex gap-1">
                          {d.status === "DRAFT" && (
                            <button onClick={() => handleDistStatusTransition(d.id, "APPROVED")} className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded hover:bg-amber-200">Approve</button>
                          )}
                          {d.status === "APPROVED" && (
                            <button onClick={() => setDistributionToConfirm(d.id)} className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 rounded hover:bg-green-200">Mark Paid</button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedDist === d.id && (
                      <tr key={`${d.id}-exp`}>
                        <td colSpan={10} className="bg-gray-50 border-t border-gray-100 px-4 py-3">
                          <div className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Line Items</div>
                          {(d.lineItems || []).length === 0 ? (
                            <div className="text-xs text-gray-400">No line items.</div>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr>{["Investor", "Gross Amount", "Net Amount", "Income", "ROC", "Carry"].map((h) => <th key={h} className="text-left py-1 pr-3 text-gray-500 font-medium">{h}</th>)}</tr>
                              </thead>
                              <tbody>
                                {(d.lineItems || []).map((li: any) => (
                                  <tr key={li.id} className="border-t border-gray-100">
                                    <td className="py-1.5 pr-3">{li.investor?.name || li.investorId}</td>
                                    <td className="py-1.5 pr-3 font-medium">{fmt(li.grossAmount)}</td>
                                    <td className="py-1.5 pr-3 font-bold">{fmt(li.netAmount)}</td>
                                    <td className="py-1.5 pr-3 text-emerald-600">{fmt(li.income)}</td>
                                    <td className="py-1.5 pr-3 text-blue-600">{fmt(li.returnOfCapital)}</td>
                                    <td className="py-1.5 pr-3 text-red-600">{fmt(li.carriedInterest)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {(!e.distributions || e.distributions.length === 0) && <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-400">No distributions.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Investors Tab */}
      {tab === "investors" && (
        <div className="space-y-4">
          {/* Committed Investors Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold">Committed Investors ({(e.commitments || []).length})</h3></div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>{["Investor", "Type", "Commitment", "Called", "Uncalled", "KYC"].map((h) => <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>)}</tr>
              </thead>
              <tbody>
                {(e.commitments || []).map((c: { id: string; amount: number; calledAmount: number; investor: { id: string; name: string; investorType: string; kycStatus: string } }) => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2.5"><Link href={`/investors/${c.investor.id}`} className="text-indigo-700 hover:underline font-medium">{c.investor.name}</Link></td>
                    <td className="px-3 py-2.5"><Badge color="blue">{c.investor.investorType}</Badge></td>
                    <td className="px-3 py-2.5 font-medium">{fmt(c.amount)}</td>
                    <td className="px-3 py-2.5">{fmt(c.calledAmount)}</td>
                    <td className="px-3 py-2.5">{fmt(c.amount - c.calledAmount)}</td>
                    <td className="px-3 py-2.5"><Badge color={c.investor.kycStatus === "Verified" ? "green" : "red"}>{c.investor.kycStatus}</Badge></td>
                  </tr>
                ))}
                {(!e.commitments || e.commitments.length === 0) && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No committed investors.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Side Letters Section */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Side Letters ({(e.sideLetters || []).length})</h3>
              <Button size="sm" onClick={() => setShowCreateSideLetter(true)}>+ Add Side Letter</Button>
            </div>
            {(e.sideLetters || []).length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No side letters. Add one to track investor-specific terms.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {(e.sideLetters || []).map((sl: { id: string; investor: { id: string; name: string }; entity: { id: string; name: string }; terms: string; rules: { id: string; ruleType: string; isActive: boolean }[] }) => (
                  <div key={sl.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Link href={`/investors/${sl.investor.id}`} className="text-xs font-medium text-indigo-700 hover:underline">{sl.investor.name}</Link>
                          {(sl.rules || []).filter((r) => r.isActive).length > 0 && (
                            <Badge color="blue">{(sl.rules || []).filter((r) => r.isActive).length} rule{(sl.rules || []).filter((r) => r.isActive).length !== 1 ? "s" : ""}</Badge>
                          )}
                        </div>
                        {sl.terms && <p className="text-xs text-gray-500 line-clamp-2">{sl.terms}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedSideLetterId(selectedSideLetterId === sl.id ? null : sl.id)}
                      >
                        {selectedSideLetterId === sl.id ? "Hide Rules" : "Manage Rules"}
                      </Button>
                    </div>
                    {selectedSideLetterId === sl.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <SideLetterRulesPanel
                          sideLetterId={sl.id}
                          investorName={sl.investor.name}
                          entityName={sl.entity.name}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Side Letter Modal */}
          <CreateSideLetterForm
            open={showCreateSideLetter}
            onClose={() => setShowCreateSideLetter(false)}
            onCreated={() => mutate(`/api/entities/${id}`)}
          />
        </div>
      )}

      {/* Waterfall Tab */}
      {tab === "waterfall" && (
        <div className="space-y-4">
          {e.waterfallTemplate ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold">{e.waterfallTemplate.name}</h3>
                  {e.waterfallTemplate.description && <p className="text-xs text-gray-500 mt-0.5">{e.waterfallTemplate.description}</p>}
                </div>
                <Button size="sm" onClick={() => setShowAddTier(true)}>+ Tier</Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(e.waterfallTemplate.tiers || []).map((t: Tier, i: number) => (
                  <div key={t.id} onClick={() => setEditTier(t)} className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm ${tierColors[i % tierColors.length]}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500">TIER {t.tierOrder}</span>
                    </div>
                    <div className="text-sm font-semibold mt-1">{t.name}</div>
                    {t.description && <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>}
                    <div className="mt-2 text-xs">
                      {t.splitLP != null && t.splitGP != null && <span>LP: {t.splitLP}% &middot; GP: {t.splitGP}%</span>}
                      {t.hurdleRate != null && <span className="ml-2">Hurdle: {t.hurdleRate}%</span>}
                    </div>
                  </div>
                ))}
              </div>
              {(!e.waterfallTemplate.tiers || e.waterfallTemplate.tiers.length === 0) && <div className="text-sm text-gray-400 py-4 text-center">No tiers configured.</div>}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
              <div className="text-sm text-gray-500 mb-3">No waterfall template assigned to this entity.</div>
              <Button size="sm" onClick={() => setShowTemplate(true)}>+ Create Template</Button>
            </div>
          )}
        </div>
      )}

      {/* Meetings Tab */}
      {tab === "meetings" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Meetings ({(e.meetings || []).length})</h3>
            <Button size="sm" onClick={() => setShowMeeting(true)}>+ Log Meeting</Button>
          </div>
          <div className="divide-y divide-gray-50">
            {(e.meetings || []).map((m: { id: string; title: string; meetingDate: string; meetingType?: string; source: string; hasTranscript: boolean; actionItems: number; decisions?: string[] }) => (
              <div key={m.id} className="p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 mr-2">{formatDate(m.meetingDate)}</span>
                    {m.meetingType && <Badge color={m.meetingType === "IC Meeting" ? "amber" : m.meetingType === "DD Session" ? "blue" : "purple"}>{m.meetingType}</Badge>}
                  </div>
                  <div className="flex gap-1.5">
                    {m.hasTranscript && <Badge color="purple">Transcript</Badge>}
                    {m.actionItems > 0 && <Badge color="gray">{m.actionItems} items</Badge>}
                  </div>
                </div>
                <div className="text-sm font-medium mt-1">{m.title}</div>
              </div>
            ))}
            {(!e.meetings || e.meetings.length === 0) && <div className="p-6 text-center text-sm text-gray-400">No meetings logged.</div>}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {tab === "documents" && (
        <>
        {/* E-Signature Packages */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold">E-Signature Packages</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Track signature status for LPAs, side letters, and subscription agreements.</p>
            </div>
            <button
              onClick={() => alert("Send for Signature coming soon. Will integrate with DocuSign/PandaDoc.")}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
            >
              + Send for Signature
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-xs font-bold">DS</div>
                <div>
                  <div className="text-xs font-medium">LPA Execution</div>
                  <div className="text-[10px] text-gray-500">3 signers &bull; via DocuSign</div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded-full">COMPLETED</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-bold">DS</div>
                <div>
                  <div className="text-xs font-medium">Side Letter &mdash; CalPERS</div>
                  <div className="text-[10px] text-gray-500">1 signer &bull; via DocuSign</div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full">SENT</span>
            </div>
            <div className="text-[10px] text-gray-400 text-center py-1">E-Signature integration coming soon &mdash; will connect to DocuSign or PandaDoc.</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="text-sm font-semibold">Documents ({(e.documents || []).length})</h3></div>
          <div className="divide-y divide-gray-50">
            {(e.documents || []).map((d: { id: string; name: string; category: string; uploadDate: string }) => (
              <div key={d.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Badge color="indigo">PDF</Badge>
                  <span className="text-sm font-medium">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color="gray">{d.category}</Badge>
                  <span className="text-xs text-gray-400">{formatDate(d.uploadDate)}</span>
                </div>
              </div>
            ))}
            {(!e.documents || e.documents.length === 0) && <div className="p-6 text-center text-sm text-gray-400">No documents.</div>}
          </div>
        </div>
        </>
      )}

          {/* Tab: Fundraising */}
          {tab === "fundraising" && (
            <div className="space-y-4">
              {/* Pipeline Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Target Raise</div>
                  <div className="text-lg font-bold mt-1">$300.0M</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Hard Commits</div>
                  <div className="text-lg font-bold text-green-600 mt-1">$40.0M</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Soft Commits</div>
                  <div className="text-lg font-bold text-blue-600 mt-1">$125.0M</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Pipeline</div>
                  <div className="text-lg font-bold text-amber-600 mt-1">$245.0M</div>
                </div>
              </div>

              {/* Fundraising Pipeline Kanban */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Fundraising Pipeline</h3>
                  <button
                    onClick={() => alert("Add prospect functionality coming soon.")}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
                  >
                    + Add Prospect
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Identified</div>
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="text-xs font-medium">CPP Investments</div>
                        <div className="text-[10px] text-gray-500">Pension</div>
                        <div className="text-xs font-semibold text-gray-700 mt-1">$80.0M</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="text-xs font-medium">Singapore GIC</div>
                        <div className="text-[10px] text-gray-500">Sovereign Wealth</div>
                        <div className="text-xs font-semibold text-gray-700 mt-1">$100.0M</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Meeting / DD</div>
                    <div className="space-y-2">
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                        <div className="text-xs font-medium">Yale Endowment</div>
                        <div className="text-[10px] text-gray-500">Endowment</div>
                        <div className="text-xs font-semibold text-amber-700 mt-1">$40.0M</div>
                        <div className="text-[10px] text-amber-600 mt-0.5">DD in progress</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Term Sheet</div>
                    <div className="text-[10px] text-gray-400 text-center py-6">No prospects</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Soft Commit</div>
                    <div className="space-y-2">
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <div className="text-xs font-medium">Abu Dhabi IA</div>
                        <div className="text-[10px] text-gray-500">Sovereign Wealth</div>
                        <div className="text-xs font-semibold text-blue-700 mt-1">$75.0M</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-2">Hard Commit</div>
                    <div className="space-y-2">
                      <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                        <div className="text-xs font-medium">Ontario Teachers</div>
                        <div className="text-[10px] text-gray-500">Pension</div>
                        <div className="text-xs font-semibold text-green-700 mt-1">$40.0M</div>
                        <div className="text-[10px] text-green-600 mt-0.5">Committed</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* Regulatory Tab */}
      {tab === "regulatory" && (
        <div className="space-y-4">
          {/* Entity legal details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-4">Legal Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-xs text-gray-500">State of Formation</span><div className="font-medium">{e.stateOfFormation || "\u2014"}</div></div>
              <div><span className="text-xs text-gray-500">EIN</span><div className="font-medium font-mono">{e.ein || "\u2014"}</div></div>
              <div><span className="text-xs text-gray-500">Legal Counsel</span><div className="font-medium">{e.legalCounsel || "\u2014"}</div></div>
              <div><span className="text-xs text-gray-500">Tax Preparer</span><div className="font-medium">{e.taxPreparer || "\u2014"}</div></div>
              <div><span className="text-xs text-gray-500">Fiscal Year End</span><div className="font-medium">{e.fiscalYearEnd || "\u2014"}</div></div>
              <div><span className="text-xs text-gray-500">Vehicle Structure</span><div className="font-medium">{e.vehicleStructure || "\u2014"}</div></div>
              <div><span className="text-xs text-gray-500">Fund Term</span><div className="font-medium">{e.fundTermYears ? `${e.fundTermYears} years` : "\u2014"}</div></div>
              <div><span className="text-xs text-gray-500">Extension Options</span><div className="font-medium">{e.extensionOptions || "\u2014"}</div></div>
            </div>
          </div>
          {/* Structured regulatory filings tab */}
          <RegulatoryFilingsTab entity={e} onUpdate={() => mutate(`/api/entities/${id}`)} />
        </div>
      )}

      {/* Accounting Tab */}
      {tab === "accounting" && (
        <EntityAccountingTab
          entityId={e.id}
          entityName={e.name}
          connection={e.accountingConnection ? {
            id: e.accountingConnection.id,
            provider: e.accountingConnection.provider,
            syncStatus: e.accountingConnection.syncStatus,
            lastSyncAt: e.accountingConnection.lastSyncAt,
            chartOfAccountsMapped: e.accountingConnection.chartOfAccountsMapped,
            lastSyncError: e.accountingConnection.lastSyncError,
            providerCompanyName: e.accountingConnection.providerCompanyName,
          } : null}
        />
      )}

      {tab === "tasks" && (
        <EntityTasksSection entityId={e.id} entityName={e.name} />
      )}

      {/* Modals */}
      <CreateCapitalCallForm open={showCapCall} onClose={() => setShowCapCall(false)} entities={[{ id: e.id, name: e.name }]} />
      <CreateDistributionForm open={showDist} onClose={() => setShowDist(false)} entities={[{ id: e.id, name: e.name }]} />
      <CreateMeetingForm open={showMeeting} onClose={() => setShowMeeting(false)} />
      <CreateTemplateForm open={showTemplate} onClose={() => setShowTemplate(false)} />
      {e.waterfallTemplate && <AddTierForm open={showAddTier} onClose={() => setShowAddTier(false)} templateId={e.waterfallTemplate.id} nextOrder={(e.waterfallTemplate.tiers?.length || 0) + 1} />}
      {editTier && e.waterfallTemplate && <EditTierForm open={!!editTier} onClose={() => setEditTier(null)} templateId={e.waterfallTemplate.id} tier={editTier} />}

      {/* Distribution paid confirmation dialog */}
      <ConfirmDialog
        open={distributionToConfirm !== null}
        onClose={() => setDistributionToConfirm(null)}
        onConfirm={async () => {
          if (distributionToConfirm) {
            await handleDistStatusTransition(distributionToConfirm, "PAID");
          }
          setDistributionToConfirm(null);
        }}
        title="Mark Distribution as Paid"
        message="Mark this distribution as paid? This action cannot be undone."
        confirmLabel="Mark Paid"
        variant="danger"
      />

      {/* Status Transition Dialog */}
      {statusTransitionTarget && (
        <StatusTransitionDialog
          entityId={id}
          currentStatus={e.status}
          targetStatus={statusTransitionTarget}
          open={!!statusTransitionTarget}
          onClose={() => setStatusTransitionTarget(null)}
          onSuccess={() => mutate(`/api/entities/${id}`)}
        />
      )}
    </div>
  );
}

// Helper component for team user select in formation tasks
function TeamUserSelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const { data: users } = useSWR("/api/users", fetcher);
  return (
    <select
      value={value}
      onChange={(ev) => onChange(ev.target.value)}
      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="">Unassigned</option>
      {(users || []).map((u: any) => (
        <option key={u.id} value={u.id}>{u.name}</option>
      ))}
    </select>
  );
}
